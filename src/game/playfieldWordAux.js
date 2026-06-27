import { computed, nextTick } from "vue";
import {
  gameSettings,
  getMarkOnSwap,
  getSwapButtonMode,
  getSwapGridPickCount,
} from "../settings/gameSettings.js";

/**
 * @typedef {Object} PlayfieldWordAuxDeps
 * @property {import('vue').Ref<object[][]>} grid
 * @property {import('vue').Ref<{ row: number, col: number }[]>} selectedOrder
 * @property {import('vue').Ref<number | null>} ceruleanBellSlotIndex
 * @property {number} ROWS
 * @property {number} COLS
 * @property {() => void} touchGrid
 * @property {() => void} scheduleRunAutoSave
 * @property {(marked: boolean) => Promise<void>} onCeruleanBellNewGridLock
 * @property {() => boolean} ensureCeruleanBellMarkedOnGrid
 * @property {() => { row: number, col: number } | null} findCeruleanBellLockedTileOnGrid
 * @property {() => void} finalizeCeruleanBellSlotIndex
 * @property {(row: number, col: number) => void} selectTile
 * @property {(row: number, col: number, tile: object, options?: object) => void} startOneMoveIn
 * @property {(slotIndex: number) => void} startOneMoveOut
 * @property {() => void} cancelAllFlyingIn
 * @property {() => void} finalizeFlyingBackBatchesImmediately
 * @property {() => Promise<void>} waitForFlyingInIdle
 * @property {() => Promise<void>} waitForFlyingBackIdle
 * @property {() => number | null | undefined} getFlyingBackMinSlotIndex
 * @property {() => void} syncFlyingInTargets
 * @property {(force?: boolean) => void} updateSlotPositions
 * @property {(row: number, col: number) => boolean} isTileFlying
 * @property {(tile: object) => boolean} isTileInFlyingBackFromWord
 * @property {import('vue').Ref<unknown[]>} flyingLetters
 * @property {import('vue').Ref<unknown[]>} gridTileRefs
 * @property {(index: number) => HTMLElement | undefined} getGridTileElByIndex
 * @property {() => HTMLElement | null} getWordSlotsWrapRef
 * @property {import('vue').Ref<boolean>} dictFatalError
 * @property {import('vue').Ref<boolean>} transitionBusy
 * @property {import('vue').Ref<boolean>} showShop
 * @property {import('vue').Ref<boolean>} scoringAnimating
 * @property {import('vue').Ref<boolean>} gridRefillAnimating
 * @property {import('vue').Ref<boolean>} wordSelectionSwapBusy
 * @property {() => boolean} isRunFlowOverlayOpen
 * @property {import('vue').Ref<boolean>} firstWordTutorialActive
 * @property {(msg: string) => void} showToast
 * @property {(kind: string) => void} triggerHaptic
 */

/**
 * 拼词辅助（标记/对调）与青铃飞入（S.5：自 GamePanel 迁出）。
 *
 * @param {PlayfieldWordAuxDeps} deps
 */
export function createPlayfieldWordAux(deps) {
  const {
    grid,
    selectedOrder,
    ceruleanBellSlotIndex,
    ROWS,
    COLS,
    touchGrid,
    scheduleRunAutoSave,
    onCeruleanBellNewGridLock,
    ensureCeruleanBellMarkedOnGrid,
    findCeruleanBellLockedTileOnGrid,
    finalizeCeruleanBellSlotIndex,
    selectTile,
    startOneMoveIn,
    startOneMoveOut,
    cancelAllFlyingIn,
    finalizeFlyingBackBatchesImmediately,
    waitForFlyingInIdle,
    waitForFlyingBackIdle,
    getFlyingBackMinSlotIndex,
    syncFlyingInTargets,
    updateSlotPositions,
    isTileFlying,
    isTileInFlyingBackFromWord,
    flyingLetters,
    gridTileRefs,
    getGridTileElByIndex,
    getWordSlotsWrapRef,
    dictFatalError,
    transitionBusy,
    showShop,
    scoringAnimating,
    gridRefillAnimating,
    wordSelectionSwapBusy,
    isRunFlowOverlayOpen,
    firstWordTutorialActive,
    showToast,
    triggerHaptic,
  } = deps;

  /** @type {number} */
  let playerMarkBatchCounter = 0;

  function collectWordAuxTargetTiles() {
    /** @type {import('../composables/useGameState.js').GridTile[]} */
    const tiles = [];
    const seen = new Set();
    const add = (row, col) => {
      const key = `${row},${col}`;
      if (seen.has(key)) return;
      const tile = grid.value[row]?.[col];
      if (!tile) return;
      seen.add(key);
      tiles.push(tile);
    };
    for (const { row, col } of selectedOrder.value) add(row, col);
    for (const fly of flyingLetters.value) {
      add(fly.pendingRow, fly.pendingCol);
    }
    return tiles;
  }

  function syncPlayerMarkBatchCounterFromGrid() {
    let maxBatch = 0;
    const g = grid.value;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const tile = g[r]?.[c];
        if (tile?.playerMarked !== true) continue;
        const b = Math.floor(Number(tile.playerMarkBatch) || 0);
        if (b > maxBatch) maxBatch = b;
      }
    }
    playerMarkBatchCounter = maxBatch;
  }

  /**
   * @param {import('../composables/useGameState.js').GridTile[]} tiles
   * @param {'mark' | 'swap'} [source]
   */
  function assignPlayerMarkBatch(tiles, source = "mark") {
    if (tiles.length === 0) return;
    playerMarkBatchCounter += 1;
    const batch = playerMarkBatchCounter;
    let seq = 0;
    for (const tile of tiles) {
      tile.playerMarked = true;
      tile.playerMarkBatch = batch;
      tile.playerMarkSeq = seq;
      tile.playerMarkBatchSource = source;
      seq += 1;
    }
  }

  function refreshPlayerMarkBatchFromWordOnSwap() {
    const tiles = collectWordAuxTargetTiles();
    if (tiles.length === 0) return false;
    if (!tiles.some((t) => t.playerMarked === true)) return false;
    assignPlayerMarkBatch(tiles, "swap");
    touchGrid();
    return true;
  }

  /** @param {import('../composables/useGameState.js').GridTile} tile */
  function clearPlayerMarkMeta(tile) {
    tile.playerMarked = false;
    tile.playerMarkBatch = undefined;
    tile.playerMarkSeq = undefined;
    tile.playerMarkBatchSource = undefined;
  }

  function collectMarkedGridTilesForSend() {
    /** @type {{ row: number, col: number, tile: import('../composables/useGameState.js').GridTile, batch: number, seq: number, source: 'mark' | 'swap' }[]} */
    const list = [];
    const g = grid.value;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const tile = g[r]?.[c];
        if (!tile?.letter) continue;
        if (tile.playerMarked !== true) continue;
        if (tile.selected) continue;
        if (tile.bossGridBlocked) continue;
        if (isTileFlying(r, c)) continue;
        const batch = tile.playerMarkBatch != null ? Math.floor(Number(tile.playerMarkBatch)) : 0;
        const seq =
          tile.playerMarkSeq != null ? Math.floor(Number(tile.playerMarkSeq)) : r * COLS + c;
        const source = tile.playerMarkBatchSource === "swap" ? "swap" : "mark";
        list.push({ row: r, col: c, tile, batch, seq, source });
      }
    }
    list.sort((a, b) => {
      const aSwap = a.source === "swap";
      const bSwap = b.source === "swap";
      if (aSwap !== bSwap) return aSwap ? -1 : 1;
      if (a.batch !== b.batch) return aSwap ? b.batch - a.batch : a.batch - b.batch;
      return a.seq - b.seq;
    });
    return list;
  }

  function buildStableWordSelectionPositionKeys() {
    const keys = new Set();
    const limit = getFlyingBackMinSlotIndex() ?? selectedOrder.value.length;
    for (let i = 0; i < limit; i += 1) {
      const { row, col } = selectedOrder.value[i];
      keys.add(`${row},${col}`);
    }
    return keys;
  }

  function collectSwappableGridPositions(excludePositionKeys = null) {
    /** @type {{ row: number, col: number, tile: object }[]} */
    const list = [];
    const g = grid.value;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const tile = g[r]?.[c];
        if (!tile?.letter) continue;
        const key = `${r},${c}`;
        if (excludePositionKeys?.has(key)) continue;
        if (tile.selected && !isTileInFlyingBackFromWord(tile)) continue;
        if (tile.bossGridBlocked) continue;
        if (isTileFlying(r, c)) continue;
        list.push({ row: r, col: c, tile });
      }
    }
    return list;
  }

  function resolveSwapGridTargets(excludePositionKeys, pickCount = getSwapGridPickCount()) {
    const mode = getSwapButtonMode();
    const all = collectSwappableGridPositions(excludePositionKeys);
    if (mode === "all") return all;

    const limit =
      pickCount == null || pickCount <= 0 ? all.length : Math.min(pickCount, all.length);

    if (mode === "bottom8") {
      return [...all]
        .sort((a, b) => (b.row !== a.row ? b.row - a.row : a.col - b.col))
        .slice(0, limit);
    }
    if (mode === "top8") {
      return [...all]
        .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))
        .slice(0, limit);
    }
    if (mode === "random8") {
      const pool = [...all];
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = pool[i];
        pool[i] = pool[j];
        pool[j] = t;
      }
      return pool.slice(0, limit);
    }

    if (pickCount == null || pickCount <= 0) return all;
    return all.slice(0, pickCount);
  }

  function isWordAuxInteractionBlocked() {
    return (
      dictFatalError.value ||
      transitionBusy.value ||
      showShop.value ||
      isRunFlowOverlayOpen() ||
      scoringAnimating.value ||
      gridRefillAnimating.value ||
      wordSelectionSwapBusy.value
    );
  }

  const canUseWordAuxTools = computed(() => {
    if (isWordAuxInteractionBlocked()) return false;
    return collectWordAuxTargetTiles().length > 0;
  });

  const showMarkSendArrow = computed(() => {
    if (collectWordAuxTargetTiles().length > 0) return false;
    return collectMarkedGridTilesForSend().length > 0;
  });

  const canSendMarkedTilesToWord = computed(() => {
    if (!showMarkSendArrow.value) return false;
    return !isWordAuxInteractionBlocked();
  });

  const canUseMarkButton = computed(() => canUseWordAuxTools.value || canSendMarkedTilesToWord.value);

  const markButtonTitle = computed(() => {
    if (showMarkSendArrow.value) return "按标记顺序将已标记字母送入拼词";
    return "标记当前拼词中的字母（仅本关提示，不进牌库）";
  });

  const showSwapWordButton = computed(() => gameSettings.swapButtonMode !== "hidden");
  const showMarkButton = computed(() => gameSettings.markButtonEnabled === true);
  const showMarkButtonInRun = computed(
    () => showMarkButton.value && !firstWordTutorialActive.value,
  );
  const showSwapWordButtonInRun = computed(
    () => showSwapWordButton.value && !firstWordTutorialActive.value,
  );

  const swapWordButtonTitle = computed(() => {
    const mode = getSwapButtonMode();
    if (mode === "bottom8") return "将拼词中的字母送回棋盘，并从剩余未选字母中取最靠下的 8 个";
    if (mode === "top8") return "将拼词中的字母送回棋盘，并从剩余未选字母中取最靠上的 8 个";
    if (mode === "random8") return "将拼词中的字母送回棋盘，并从剩余未选字母中随机选取 8 个";
    return "将拼词中的字母送回棋盘，并选中原先未选的字母";
  });

  const canSwapWordSelection = computed(() => {
    if (!showSwapWordButton.value) return false;
    if (isWordAuxInteractionBlocked()) return false;
    return resolveSwapGridTargets(buildStableWordSelectionPositionKeys()).length > 0;
  });

  function onMarkSelectedTilesClick() {
    if (!canUseWordAuxTools.value) return;
    const tiles = collectWordAuxTargetTiles();
    if (tiles.length === 0) return;
    const shouldMark = tiles.some((t) => t.playerMarked !== true);
    if (shouldMark) {
      assignPlayerMarkBatch(tiles.filter((t) => t.playerMarked !== true));
    } else {
      for (const tile of tiles) clearPlayerMarkMeta(tile);
    }
    touchGrid();
    scheduleRunAutoSave();
  }

  function onSendMarkedTilesClick() {
    if (!canSendMarkedTilesToWord.value) return;
    const list = collectMarkedGridTilesForSend();
    if (list.length === 0) return;
    for (const { row, col, tile } of list) {
      startOneMoveIn(row, col, tile);
    }
    scheduleRunAutoSave();
  }

  function onMarkButtonClick() {
    if (canSendMarkedTilesToWord.value) {
      onSendMarkedTilesClick();
      return;
    }
    onMarkSelectedTilesClick();
  }

  async function onSwapWordSelectionClick() {
    if (!canSwapWordSelection.value || wordSelectionSwapBusy.value) return;
    triggerHaptic("tabSwitch");
    wordSelectionSwapBusy.value = true;
    try {
      const refreshedMarkBatch = refreshPlayerMarkBatchFromWordOnSwap();
      if (!refreshedMarkBatch && getMarkOnSwap()) {
        const tiles = collectWordAuxTargetTiles();
        const toMark = tiles.filter((t) => t.playerMarked !== true);
        if (toMark.length > 0) assignPlayerMarkBatch(toMark);
        touchGrid();
      }

      if (flyingLetters.value.length > 0) cancelAllFlyingIn();
      finalizeFlyingBackBatchesImmediately();

      const previouslyInWord = buildStableWordSelectionPositionKeys();

      const inWordCount = selectedOrder.value.length;
      if (inWordCount > 0) {
        if (ceruleanBellSlotIndex.value != null) {
          showToast("青铃锁生效时无法互换选中");
          return;
        }
        startOneMoveOut(0);
        await waitForFlyingBackIdle();
      }

      const toSelect = resolveSwapGridTargets(previouslyInWord);
      if (toSelect.length === 0) return;
      for (const { row, col, tile } of toSelect) {
        startOneMoveIn(row, col, tile);
      }
      await waitForFlyingInIdle();
      nextTick(() => updateSlotPositions(true));
    } finally {
      wordSelectionSwapBusy.value = false;
    }
  }

  async function ensureWordSlotLayoutReadyForFlyIn() {
    updateSlotPositions(true);
    await nextTick();
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const wrapEl = getWordSlotsWrapRef();
      if (wrapEl) {
        const rect = wrapEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return;
      }
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  async function flyCeruleanBellLockedTileIntoWordSlot(pick) {
    const tile = grid.value[pick.row]?.[pick.col];
    if (!tile?.letter) return;
    await ensureWordSlotLayoutReadyForFlyIn();
    const index = pick.row * COLS + pick.col;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const fromEl = gridTileRefs.value[index] ?? getGridTileElByIndex(index);
      if (!fromEl) {
        await new Promise((r) => requestAnimationFrame(r));
        continue;
      }
      const before = flyingLetters.value.length;
      startOneMoveIn(pick.row, pick.col, tile, { ceruleanBell: true });
      if (flyingLetters.value.length > before) {
        syncFlyingInTargets();
        await waitForFlyingInIdle();
        return;
      }
      await ensureWordSlotLayoutReadyForFlyIn();
    }
    const before = flyingLetters.value.length;
    startOneMoveIn(pick.row, pick.col, tile, { ceruleanBell: true });
    if (flyingLetters.value.length > before) {
      syncFlyingInTargets();
      await waitForFlyingInIdle();
    } else if (!tile.selected) {
      selectTile(pick.row, pick.col);
      finalizeCeruleanBellSlotIndex();
    }
  }

  async function tryCeruleanBellFlyInAfterGridStable() {
    if (ceruleanBellSlotIndex.value != null) return;
    let pick = findCeruleanBellLockedTileOnGrid();
    if (!pick) {
      const marked = ensureCeruleanBellMarkedOnGrid();
      if (marked) {
        await onCeruleanBellNewGridLock(marked);
        pick = findCeruleanBellLockedTileOnGrid();
      }
    }
    if (pick) {
      await flyCeruleanBellLockedTileIntoWordSlot(pick);
    }
  }

  async function tryCeruleanBellMarkAfterGridStable() {
    await onCeruleanBellNewGridLock(ensureCeruleanBellMarkedOnGrid());
    await tryCeruleanBellFlyInAfterGridStable();
  }

  return {
    syncPlayerMarkBatchCounterFromGrid,
    tryCeruleanBellMarkAfterGridStable,
    tryCeruleanBellFlyInAfterGridStable,
    canUseMarkButton,
    showMarkSendArrow,
    markButtonTitle,
    showMarkButtonInRun,
    showSwapWordButtonInRun,
    swapWordButtonTitle,
    canSwapWordSelection,
    onMarkButtonClick,
    onSwapWordSelectionClick,
  };
}
