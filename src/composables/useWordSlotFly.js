import { computed, nextTick, ref, shallowRef } from "vue";
import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { createFlyBackTileElement, disposeFlyBackTileElement } from "../utils/letterTileFlyBack.js";

export const FLY_DURATION = 0.25;
const LETTER_GRID_WRAP_DESIGN = 466;
const LETTER_GRID_PADDING_DESIGN = 12;
const SLOT_GAP = 6;
export const SLOT_TILE_W =
  (LETTER_GRID_WRAP_DESIGN - 2 * LETTER_GRID_PADDING_DESIGN - 3 * SLOT_GAP) / 4;
export const MIDDLE_MAX_W = 722;

/**
 * @typedef {Object} WordSlotFlyOptions
 * @property {Pick<import("../runSession/runSessionTypes.js").GridStore, "grid" | "selectedOrder" | "selectedTiles" | "selectTile" | "removeFromSlot" | "removeSingleTileFromWord" | "finalizeCeruleanBellSlotIndex" | "ceruleanBellSlotIndex" | "COLS">} grid
 * @property {{ getWordSlotsWrapRef: () => HTMLElement | null, getGridTileElByIndex: (index: number) => HTMLElement | undefined, getGridTileRef: (index: number) => HTMLElement | undefined, getWordSlotRef: (index: number) => HTMLElement | undefined, refToDom: (el: unknown) => HTMLElement | undefined, clearGridTileGsapAfterDrop: (el: HTMLElement | null | undefined) => void }} dom
 * @property {object} presentation
 * @property {{ transitionBusy: import("vue").Ref<boolean>, showShop: import("vue").Ref<boolean>, gridRefillAnimating: import("vue").Ref<boolean> }} gates
 * @property {{ isRunFlowOverlayOpen: () => boolean, bumpOverlayZ: () => number, triggerHaptic: (kind: string) => void }} ui
 * @property {{ scheduleTutorialSpotlightUpdate: () => void }} callbacks
 * @property {{ allowsTileClick: (row: number, col: number) => boolean, onLetterSelected: () => void, phase: import("vue").ComputedRef<string> }} firstWordTutorial
 * @property {() => number} getSlotScaleRuntime
 * @property {() => number} getSlotLayoutRpx
 * @property {() => void} refreshSlotLayoutRpx
 * @property {() => void} ensureSlotRafRunning
 * @property {(deltaMs?: number | boolean) => void} updateSlotPositions
 * @property {(item: object) => void} [commitFlyInSlotPosition]
 */

/**
 * 飞字入槽 / 回棋盘动画（任务 4.2）；DOM + GSAP，参数与迁出前一致。
 *
 * @param {WordSlotFlyOptions} options
 */
export function useWordSlotFly(options) {
  const {
    grid: gridStore,
    dom,
    presentation,
    gates,
    ui,
    callbacks,
    firstWordTutorial: fwt,
    getSlotScaleRuntime,
    getSlotLayoutRpx,
    refreshSlotLayoutRpx,
    ensureSlotRafRunning,
    updateSlotPositions,
    commitFlyInSlotPosition,
  } = options;

  const {
    grid,
    selectedOrder,
    selectTile,
    removeFromSlot,
    removeSingleTileFromWord,
    finalizeCeruleanBellSlotIndex,
    ceruleanBellSlotIndex,
    COLS,
  } = gridStore;

  const getWordSlotsWrapRef = () => dom.getWordSlotsWrapRef();
  const getGridTileElByIndex = (index) => dom.getGridTileElByIndex(index);
  const getGridTileRef = (index) => dom.getGridTileRef(index);
  const getWordSlotRef = (index) => dom.getWordSlotRef(index);
  const refToDom = (el) => dom.refToDom(el);
  const clearGridTileGsapAfterDrop = (el) => dom.clearGridTileGsapAfterDrop(el);

  /** 正在飞入的字母列表，支持多个同时飞 */
  const flyingLetters = ref([]);
  let flyingInIdCounter = 0;
  /** fly.id -> 飞字 DOM，用于取消时 kill GSAP */
  const flyingInElById = new Map();
  const flyingInAnimStarted = new Set();
  /** 飞入落地顺序缓冲：按 targetSlotIndex 依次 selectTile，避免快连点时乱序入槽 */
  const flyInPendingComplete = [];
  /** 拖动 word→grid 回格动画期间隐藏该槽内容 */
  const wordDragReturnAnimSlot = ref(/** @type {number | null} */ (null));
  /** 正在飞回网格的 batch 列表 */
  const flyingBackBatches = ref([]);
  let flyingBackBatchIdCounter = 0;
  /** batchId -> meta */
  const flyingBackBatchMeta = {};

  /**
   * 计算词槽视口矩形（像素）。
   * @param {DOMRect} wrapRect
   * @param {number} numSlots 布局槽数（含占位 / 追加 S 等）
   * @param {number} slotIndex
   * @param {number} [scaleFromSlotCount] 缩放基准槽数；省略时与 numSlots 相同
   */
  function getScaledSlotRect(wrapRect, numSlots, slotIndex, scaleFromSlotCount) {
    if (numSlots <= 0) return null;
    const rpx = getSlotLayoutRpx() || 1;
    const countForScale = scaleFromSlotCount ?? numSlots;
    const totalDesignForScale = countForScale * SLOT_TILE_W + (countForScale - 1) * SLOT_GAP;
    const scale = Math.min(1, MIDDLE_MAX_W / totalDesignForScale);
    const totalDesign = numSlots * SLOT_TILE_W + (numSlots - 1) * SLOT_GAP;
    const slotVisualSizePx = SLOT_TILE_W * scale * rpx;
    const totalVisualWidthPx = totalDesign * scale * rpx;
    const left =
      wrapRect.left
      + (wrapRect.width - totalVisualWidthPx) / 2
      + slotIndex * (SLOT_TILE_W + SLOT_GAP) * scale * rpx;
    const top = wrapRect.top + (wrapRect.height - slotVisualSizePx) / 2;
    return { left, top, width: slotVisualSizePx, height: slotVisualSizePx };
  }

  function syncFlyingInTargets() {
    const wrapEl = getWordSlotsWrapRef();
    if (!wrapEl) return;
    refreshSlotLayoutRpx();
    const wrapRect = wrapEl.getBoundingClientRect();
    if (wrapRect.width <= 0 || wrapRect.height <= 0) return;
    const base = selectedOrder.value.length;
    const list = flyingLetters.value;
    const total = base + list.length;
    if (total <= 0) return;
    const totalDesign = total * SLOT_TILE_W + (total - 1) * SLOT_GAP;
    const targetSlotScale = Math.min(1, MIDDLE_MAX_W / totalDesign);
    list.forEach((fly, i) => {
      const slotIndex = base + i;
      const toRect = getScaledSlotRect(wrapRect, total, slotIndex);
      if (!toRect) return;
      fly.targetSlotIndex = slotIndex;
      fly.layoutNumSlots = total;
      fly.targetSlotScale = targetSlotScale;
      fly.toRect = toRect;
      const node = flyingInElById.get(fly.id);
      if (!node || !flyingInAnimStarted.has(fly.id)) return;
      gsap.to(node, {
        left: toRect.left,
        top: toRect.top,
        scaleX: 1,
        scaleY: 1,
        "--slot-scale": targetSlotScale,
        duration: 0.16,
        ease: EASE_TRANSFORM,
        overwrite: "auto",
      });
    });
    ensureSlotRafRunning();
  }

  function flushFlyInSelections() {
    flyInPendingComplete.sort((a, b) => a.targetSlotIndex - b.targetSlotIndex);
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (let i = flyInPendingComplete.length - 1; i >= 0; i -= 1) {
        const item = flyInPendingComplete[i];
        if (item.targetSlotIndex !== selectedOrder.value.length) continue;
        commitFlyInSlotPosition?.(item);
        selectTile(item.pendingRow, item.pendingCol);
        clearGridTileGsapAfterDrop(getGridTileElByIndex(item.pendingRow * COLS + item.pendingCol));
        if (item.ceruleanBell) finalizeCeruleanBellSlotIndex();
        flyInPendingComplete.splice(i, 1);
        progressed = true;
      }
    }
    syncFlyingInTargets();
    ensureSlotRafRunning();
    if (fwt.phase.value === "retry") {
      callbacks.scheduleTutorialSpotlightUpdate();
    }
  }

  function waitForFlyingBackIdle() {
    return new Promise((resolve) => {
      const tick = () => {
        if (flyingBackBatches.value.length === 0) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function getFlyingBackMinSlotIndex() {
    const batches = flyingBackBatches.value;
    if (batches.length === 0) return null;
    return Math.min(...batches.map((b) => b.slotIndex));
  }

  function finalizeFlyingBackBatchesImmediately() {
    const batches = [...flyingBackBatches.value];
    if (batches.length === 0) return;
    const sorted = [...batches].sort((a, b) => b.slotIndex - a.slotIndex);
    for (const batch of sorted) {
      const meta = flyingBackBatchMeta[batch.id];
      if (meta) {
        meta.finalized = true;
        for (const el of meta.elements ?? []) {
          gsap.killTweensOf(el);
          disposeFlyBackTileElement(el);
          el.remove();
        }
        delete flyingBackBatchMeta[batch.id];
      }
      removeFromSlot(batch.slotIndex);
    }
    flyingBackBatches.value = [];
  }

  function waitForFlyingInIdle() {
    return new Promise((resolve) => {
      const tick = () => {
        if (flyingLetters.value.length === 0 && flyInPendingComplete.length === 0) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function isSlotContentHidden(displayIndex) {
    // 仅飞回棋盘时隐藏槽内字母；计分离场由 GSAP 整槽淡出，勿 opacity:0 内容（会露出白底并丢掉材质 canvas）
    return flyingBackBatches.value.some((b) => displayIndex >= b.slotIndex);
  }

  function isSlotOutOfFlow(slotIndex) {
    return flyingBackBatches.value.some((b) => slotIndex >= b.slotIndex);
  }

  function isTileFlying(row, col) {
    return flyingLetters.value.some((f) => f.pendingRow === row && f.pendingCol === col);
  }

  function setFlyingInRef(fly, el) {
    const node = refToDom(el);
    if (!node) {
      const prev = flyingInElById.get(fly.id);
      if (prev) gsap.killTweensOf(prev);
      flyingInElById.delete(fly.id);
      flyingInAnimStarted.delete(fly.id);
      return;
    }
    flyingInElById.set(fly.id, node);
    const item = fly;
    if (flyingInAnimStarted.has(item.id)) return;
    const r = item.fromRect;
    const t = item.toRect;
    if (!t) {
      nextTick(() => {
        const latest = flyingLetters.value.find((f) => f.id === item.id);
        const flyEl = flyingInElById.get(item.id);
        if (latest?.toRect && flyEl && !flyingInAnimStarted.has(item.id)) {
          setFlyingInRef(latest, flyEl);
        }
      });
      return;
    }
    flyingInAnimStarted.add(item.id);
    const tw = Math.max(t.width, 1e-6);
    const th = Math.max(t.height, 1e-6);
    const targetScale = item.targetSlotScale ?? 1;
    gsap.killTweensOf(node);
    gsap.set(node, {
      zIndex: ui.bumpOverlayZ(),
      left: r.left,
      top: r.top,
      width: t.width,
      height: t.height,
      scaleX: r.width / tw,
      scaleY: r.height / th,
      transformOrigin: "left top",
      force3D: true,
      "--slot-scale": 1,
    });
    const finishFlyIn = () => {
      ui.triggerHaptic("land");
      flyingInAnimStarted.delete(item.id);
      flyingInElById.delete(item.id);
      flyInPendingComplete.push(item);
      flyingLetters.value = flyingLetters.value.filter((f) => f.id !== item.id);
      flushFlyInSelections();
    };
    gsap.to(node, {
      left: t.left,
      top: t.top,
      scaleX: 1,
      scaleY: 1,
      "--slot-scale": targetScale,
      duration: FLY_DURATION,
      ease: EASE_TRANSFORM,
      onComplete: finishFlyIn,
    });
  }

  function cancelAllFlyingIn() {
    const list = [...flyingLetters.value];
    for (const item of list) {
      flyingInAnimStarted.delete(item.id);
    }
    flyingInElById.forEach((node) => {
      if (node) gsap.killTweensOf(node);
    });
    flyingInElById.clear();
    flyingLetters.value = [];
    flyInPendingComplete.length = 0;
    nextTick(() => updateSlotPositions(true));
  }

  function startOneMoveIn(row, col, tile, moveOptions = {}) {
    const ceruleanBellFly = moveOptions.ceruleanBell === true;
    if (!ceruleanBellFly && (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen())) return;
    if (ceruleanBellFly && (gates.showShop.value || ui.isRunFlowOverlayOpen())) return;
    if (gates.gridRefillAnimating.value && !ceruleanBellFly) return;
    const index = row * COLS + col;
    const fromEl = getGridTileRef(index) ?? getGridTileElByIndex(index);
    if (!fromEl) return;
    clearGridTileGsapAfterDrop(fromEl);
    const fromRect = fromEl.getBoundingClientRect();
    const wrapEl = getWordSlotsWrapRef();
    if (!wrapEl) return;
    const wrapRect = wrapEl.getBoundingClientRect();
    if (wrapRect.width <= 0 || wrapRect.height <= 0) return;
    const flyPres = presentation.computeFlyInTilePresentation(tile);
    const targetSlotIndex = selectedOrder.value.length + flyingLetters.value.length;
    flyingLetters.value = [
      ...flyingLetters.value,
      {
        id: `fly-in-${++flyingInIdCounter}-${Date.now()}`,
        fromRect,
        toRect: null,
        targetSlotIndex,
        layoutNumSlots: 0,
        targetSlotScale: 1,
        letter: flyPres.letter,
        rarity: flyPres.rarity,
        materialId: tile.materialId ?? null,
        accessoryId: tile.accessoryId ?? null,
        treasureAccessoryId: tile.treasureAccessoryId ?? null,
        tileScoreBonus: Math.max(0, Math.floor(Number(tile.tileScoreBonus) || 0)),
        tileMultBonus: Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)),
        bossTileDebuffed: tile.bossTileDebuffed === true,
        ceruleanBell: moveOptions.ceruleanBell === true,
        vowelGhostPrev: flyPres.vowelGhostPrev,
        vowelGhostNext: flyPres.vowelGhostNext,
        playerMarked: tile.playerMarked === true,
        pendingRow: row,
        pendingCol: col,
      },
    ];
    syncFlyingInTargets();
    ui.triggerHaptic("selection");
    if (fwt.phase.value === "select" && fwt.allowsTileClick(row, col)) {
      fwt.onLetterSelected();
      callbacks.scheduleTutorialSpotlightUpdate();
    } else if (fwt.phase.value === "retry") {
      callbacks.scheduleTutorialSpotlightUpdate();
    }
  }

  function createFlyBackElement(item) {
    return createFlyBackTileElement(item);
  }

  function animateWordTileReturnToGrid(slotIndex, clientX, clientY, ghost) {
    const order = selectedOrder.value;
    if (slotIndex < 0 || slotIndex >= order.length) return;
    if (ceruleanBellSlotIndex.value != null && slotIndex <= ceruleanBellSlotIndex.value) return;

    const { row, col } = order[slotIndex];
    const tile = grid.value[row]?.[col];
    const toEl = getGridTileRef(row * COLS + col) ?? getGridTileElByIndex(row * COLS + col);
    if (!tile || !toEl) return;

    const toRect = toEl.getBoundingClientRect();
    const backPres = presentation.computeFlyBackTilePresentation(tile);
    const fromRect = {
      left: clientX - (ghost.offsetX ?? ghost.width / 2),
      top: clientY - (ghost.offsetY ?? ghost.height / 2),
      width: ghost.width,
      height: ghost.height,
    };
    const item = {
      fromRect,
      toRect,
      letter: backPres.letter,
      rarity: backPres.rarity,
      materialId: tile.materialId ?? null,
      accessoryId: tile.accessoryId ?? null,
      tileScoreBonus: Math.max(0, Math.floor(Number(tile.tileScoreBonus) || 0)),
      tileMultBonus: Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)),
      bossTileDebuffed: tile.bossTileDebuffed === true,
      vowelGhostPrev: backPres.vowelGhostPrev,
      vowelGhostNext: backPres.vowelGhostNext,
      playerMarked: tile.playerMarked === true,
      startSlotScale: getSlotScaleRuntime(),
    };

    wordDragReturnAnimSlot.value = slotIndex;
    ui.triggerHaptic("selection");

    const el = createFlyBackElement(item);
    document.body.appendChild(el);
    const tw = Math.max(toRect.width, 1e-6);
    const th = Math.max(toRect.height, 1e-6);
    gsap.killTweensOf(el);
    gsap.set(el, {
      zIndex: ui.bumpOverlayZ(),
      left: fromRect.left,
      top: fromRect.top,
      width: toRect.width,
      height: toRect.height,
      scaleX: fromRect.width / tw,
      scaleY: fromRect.height / th,
      transformOrigin: "left top",
      force3D: true,
      "--slot-scale": String(item.startSlotScale ?? 1),
    });

    const finish = () => {
      disposeFlyBackTileElement(el);
      el.remove();
      removeSingleTileFromWord(slotIndex);
      wordDragReturnAnimSlot.value = null;
      ui.triggerHaptic("land");
      nextTick(() => updateSlotPositions(true));
    };

    gsap.to(el, {
      left: toRect.left,
      top: toRect.top,
      scaleX: 1,
      scaleY: 1,
      "--slot-scale": 1,
      duration: FLY_DURATION,
      ease: EASE_TRANSFORM,
      onComplete: finish,
    });
  }

  function startOneMoveOut(slotIndex) {
    const order = selectedOrder.value;
    if (slotIndex < 0 || slotIndex >= order.length) return;
    if (ceruleanBellSlotIndex.value != null && slotIndex <= ceruleanBellSlotIndex.value) return;
    const batches = flyingBackBatches.value;
    const list = [];
    for (let j = slotIndex; j < order.length; j++) {
      if (batches.some((b) => b.slotIndex <= j)) continue;
      const fromEl = getWordSlotRef(j);
      const { row, col } = order[j];
      const toEl = getGridTileRef(row * COLS + col);
      const tile = grid.value[row][col];
      if (!fromEl || !toEl) continue;
      const backPres = presentation.computeFlyBackTilePresentation(tile);
      list.push({
        fromRect: fromEl.getBoundingClientRect(),
        toRect: toEl.getBoundingClientRect(),
        letter: backPres.letter,
        rarity: backPres.rarity,
        materialId: tile.materialId ?? null,
        accessoryId: tile.accessoryId ?? null,
        tileScoreBonus: Math.max(0, Math.floor(Number(tile.tileScoreBonus) || 0)),
        tileMultBonus: Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)),
        bossTileDebuffed: tile.bossTileDebuffed === true,
        vowelGhostPrev: backPres.vowelGhostPrev,
        vowelGhostNext: backPres.vowelGhostNext,
        playerMarked: tile.playerMarked === true,
      });
    }
    if (list.length === 0) return;
    const startScale = getSlotScaleRuntime();
    const listWithScale = list.map((item) => ({ ...item, startSlotScale: startScale }));
    const batchId = `fly-back-${++flyingBackBatchIdCounter}-${Date.now()}`;
    const meta = { slotIndex, total: list.length, completed: 0, elements: [] };
    flyingBackBatchMeta[batchId] = meta;
    flyingBackBatches.value = [
      ...flyingBackBatches.value,
      { id: batchId, slotIndex, list: listWithScale },
    ];
    ui.triggerHaptic("selection");
    for (const item of listWithScale) {
      const el = createFlyBackElement(item);
      meta.elements.push(el);
      document.body.appendChild(el);
      const tw = Math.max(item.toRect.width, 1e-6);
      const th = Math.max(item.toRect.height, 1e-6);
      gsap.killTweensOf(el);
      gsap.set(el, {
        zIndex: ui.bumpOverlayZ(),
        left: item.fromRect.left,
        top: item.fromRect.top,
        width: item.toRect.width,
        height: item.toRect.height,
        scaleX: item.fromRect.width / tw,
        scaleY: item.fromRect.height / th,
        transformOrigin: "left top",
        force3D: true,
        "--slot-scale": String(item.startSlotScale ?? 1),
      });
      const finishFlyBack = () => {
        if (meta.finalized) return;
        disposeFlyBackTileElement(el);
        el.remove();
        meta.completed += 1;
        if (meta.completed >= meta.total) {
          ui.triggerHaptic("land");
          removeFromSlot(meta.slotIndex);
          flyingBackBatches.value = flyingBackBatches.value.filter((b) => b.id !== batchId);
          delete flyingBackBatchMeta[batchId];
        }
      };
      gsap.to(el, {
        left: item.toRect.left,
        top: item.toRect.top,
        scaleX: 1,
        scaleY: 1,
        "--slot-scale": 1,
        duration: FLY_DURATION,
        ease: EASE_TRANSFORM,
        onComplete: finishFlyBack,
      });
    }
  }

  const flyingBackList = computed(() =>
    flyingBackBatches.value.flatMap((b) =>
      b.list.map((item) => ({ ...item, batchId: b.id, slotIndex: b.slotIndex })),
    ),
  );

  const flyingLettersForRender = computed(() => {
    const parts = presentation.effectiveWordPartsForSubmit.value;
    const res = presentation.resolvedWordForSubmit.value;
    const eff = parts.word;
    return flyingLetters.value.map((fly) => {
      const t = grid.value[fly.pendingRow]?.[fly.pendingCol];
      if (!t) return fly;
      const pres = presentation.tilePresentationInResolvedWord(t, res, eff, t);
      if (
        pres.letter === fly.letter
        && pres.rarity === fly.rarity
        && pres.vowelGhostPrev === fly.vowelGhostPrev
        && pres.vowelGhostNext === fly.vowelGhostNext
        && presentation.resolvePresentationBossTileDebuffed(
          { ...t, letter: pres.letter, rarity: pres.rarity },
          presentation.bossSlugForMechanics(),
          presentation.getBossTileDebuffContext(),
        ) === (fly.bossTileDebuffed === true)
      ) {
        return fly;
      }
      const bossTileDebuffed = presentation.resolvePresentationBossTileDebuffed(
        { ...t, letter: pres.letter, rarity: pres.rarity },
        presentation.bossSlugForMechanics(),
        presentation.getBossTileDebuffContext(),
      );
      return {
        ...fly,
        letter: pres.letter,
        rarity: pres.rarity,
        vowelGhostPrev: pres.vowelGhostPrev,
        vowelGhostNext: pres.vowelGhostNext,
        bossTileDebuffed,
      };
    });
  });

  return {
    flyingLetters,
    flyingBackBatches,
    flyingBackList,
    flyingLettersForRender,
    wordDragReturnAnimSlot,
    getScaledSlotRect,
    syncFlyingInTargets,
    flushFlyInSelections,
    waitForFlyingInIdle,
    waitForFlyingBackIdle,
    getFlyingBackMinSlotIndex,
    finalizeFlyingBackBatchesImmediately,
    isSlotContentHidden,
    isSlotOutOfFlow,
    isTileFlying,
    setFlyingInRef,
    cancelAllFlyingIn,
    startOneMoveIn,
    startOneMoveOut,
    animateWordTileReturnToGrid,
  };
}
