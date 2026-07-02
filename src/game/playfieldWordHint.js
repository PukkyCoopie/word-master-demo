import { computed, ref, watch } from "vue";
import { isWildcardMaterialTile } from "../composables/useScoring.js";
import { pickHintWordForGrid } from "./gridWordHint.js";
import { buildTutorialGameHintPick } from "../tutorial/firstWordTutorialCasualFlow.js";
import {
  hintLexicalPickWeightForWord,
  hintLexicalTierForWord,
  hintWordIsFallbackOnlyForWord,
} from "./gridWordHintLexical.js";
import { playWordHintRippleSequence } from "./wordHintRipple.js";
import { isWordHintAutoSelectMode } from "../settings/wordHintMode.js";
import { BASE_HINT_MAX_PER_LEVEL } from "./wordHintLimits.js";

export { BASE_HINT_MAX_PER_LEVEL };

/**
 * @typedef {Object} PlayfieldWordHintDeps
 * @property {import('vue').Ref<object[][]>} grid
 * @property {import('vue').Ref<{ row: number, col: number }[]>} selectedOrder
 * @property {import('vue').Ref<number | null>} ceruleanBellSlotIndex
 * @property {import('vue').Ref<number>} hintRemaining
 * @property {() => number} getHintMaxThisLevel
 * @property {number} ROWS
 * @property {number} COLS
 * @property {import('vue').Ref<boolean>} dictFatalError
 * @property {import('vue').Ref<boolean>} dictionaryReady
 * @property {(len: number) => string[]} getCandidateWordsByLength
 * @property {(pattern: string, wc?: string) => string | null} resolveWordPattern
 * @property {() => import('./bossWordViolation.js').BossWildcardResolveContext | null} buildBossResolveContext
 * @property {() => Record<string | number, number>} getSpellCountsByLength
 * @property {() => number} getHintLengthWeightShift
 * @property {(n: number) => number} getJudgedLengthTableLenForRun
 * @property {() => Record<string | number, number>} getLengthLevelsByLength
 * @property {() => { row: number, col: number } | null} findCeruleanBellLockedTileOnGrid
 * @property {() => import('../settings/wordHintMode.js').WordHintMode} getWordHintMode
 * @property {(index: number) => HTMLElement | null | undefined} getGridTileElByIndex
 * @property {import('vue').Ref<boolean>} transitionBusy
 * @property {import('vue').Ref<boolean>} showShop
 * @property {import('vue').Ref<boolean>} scoringAnimating
 * @property {import('vue').Ref<boolean>} gridRefillAnimating
 * @property {import('vue').Ref<boolean>} wordSelectionSwapBusy
 * @property {() => boolean} isRunFlowOverlayOpen
 * @property {import('vue').Ref<boolean>} firstWordTutorialActive
 * @property {() => string | null | undefined} [getFirstWordTutorialPhase]
 * @property {() => void} [scheduleTutorialSpotlightUpdate]
 * @property {(msg: string) => void} showToast
 * @property {(kind: string) => void} triggerHaptic
 * @property {() => void} cancelAllFlyingIn
 * @property {() => void} finalizeFlyingBackBatchesImmediately
 * @property {(slotIndex: number) => void} startOneMoveOut
 * @property {(row: number, col: number, tile: object) => void} startOneMoveIn
 * @property {() => Promise<void>} waitForFlyingInIdle
 * @property {() => Promise<void>} waitForFlyingBackIdle
 * @property {(force?: boolean) => void} updateSlotPositions
 * @property {import('vue').Ref<unknown[]>} flyingLetters
 */

/**
 * @param {object[][] | null | undefined} gridValue
 * @param {number} ROWS
 * @param {number} COLS
 */
function buildGridCellsForHint(gridValue, ROWS, COLS) {
  /** @type {import('./gridWordFinder.js').GridCell[]} */
  const cells = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const t = gridValue?.[r]?.[c];
      if (!t?.letter) continue;
      cells.push({
        row: r,
        col: c,
        letter: String(t.letter),
        rarity: String(t.rarity ?? "common"),
        isWildcard: isWildcardMaterialTile(t),
        blocked: t.bossGridBlocked === true,
        bossDebuffed: t.bossTileDebuffed === true,
      });
    }
  }
  return cells;
}

/**
 * @param {import('./gridWordFinder.js').GridCell[]} cells
 * @param {() => { row: number, col: number } | null} findLocked
 * @param {string | null | undefined} bossSlug
 * @returns {import('./gridWordFinder.js').GridCell | null}
 */
function resolveCeruleanAnchorCell(cells, findLocked, bossSlug) {
  if (bossSlug !== "cerulean_bell") return null;
  const pos = findLocked?.();
  if (!pos) return null;
  return cells.find((c) => c.row === pos.row && c.col === pos.col) ?? null;
}

/**
 * @param {PlayfieldWordHintDeps} deps
 */
export function createPlayfieldWordHint(deps) {
  const {
    grid,
    selectedOrder,
    ceruleanBellSlotIndex,
    hintRemaining,
    getHintMaxThisLevel,
    ROWS,
    COLS,
    dictFatalError,
    dictionaryReady,
    getCandidateWordsByLength,
    resolveWordPattern,
    buildBossResolveContext,
    getSpellCountsByLength,
    getHintLengthWeightShift,
    getJudgedLengthTableLenForRun,
    getLengthLevelsByLength,
    findCeruleanBellLockedTileOnGrid,
    getWordHintMode,
    getGridTileElByIndex,
    transitionBusy,
    showShop,
    scoringAnimating,
    gridRefillAnimating,
    wordSelectionSwapBusy,
    isRunFlowOverlayOpen,
    firstWordTutorialActive,
    getFirstWordTutorialPhase,
    scheduleTutorialSpotlightUpdate,
    showToast,
    triggerHaptic,
    cancelAllFlyingIn,
    finalizeFlyingBackBatchesImmediately,
    startOneMoveOut,
    startOneMoveIn,
    waitForFlyingInIdle,
    waitForFlyingBackIdle,
    updateSlotPositions,
    flyingLetters,
  } = deps;

  /** @type {import('vue').Ref<import('./gridWordFinder.js').WordPick | null>} */
  const hintPick = ref(/** @type {import('./gridWordFinder.js').WordPick | null} */ (null));
  const hintAppliedViaButton = ref(false);
  const hintAppliedWord = ref(/** @type {string | null} */ (null));
  /** 提交计分开始后至下次 grid 稳定刷新前：避免词槽仍匹配旧 hintPick 导致按钮常暗 */
  const hintSubmitLatch = ref(false);
  const hintRipplePlaying = ref(false);

  function isAutoSelectMode() {
    return isWordHintAutoSelectMode(getWordHintMode());
  }

  function isHintInteractionBlocked() {
    return (
      dictFatalError.value ||
      transitionBusy.value ||
      showShop.value ||
      isRunFlowOverlayOpen() ||
      scoringAnimating.value ||
      gridRefillAnimating.value ||
      wordSelectionSwapBusy.value ||
      hintRipplePlaying.value
    );
  }

  function selectionMatchesHintPath() {
    const pick = hintPick.value;
    if (!pick?.path?.length) return false;
    const order = selectedOrder.value;
    if (order.length !== pick.path.length) return false;
    for (let i = 0; i < order.length; i += 1) {
      if (order[i].row !== pick.path[i].row || order[i].col !== pick.path[i].col) return false;
    }
    return true;
  }

  watch(
    selectedOrder,
    () => {
      if (!isAutoSelectMode()) return;
      if (selectedOrder.value.length === 0) {
        hintAppliedViaButton.value = false;
        hintAppliedWord.value = null;
        return;
      }
      if (!hintAppliedViaButton.value) return;
      if (!selectionMatchesHintPath()) {
        hintAppliedViaButton.value = false;
        hintAppliedWord.value = null;
      }
    },
    { deep: true },
  );

  function refreshWordHintAfterGridStable() {
    hintAppliedViaButton.value = false;
    hintAppliedWord.value = null;
    hintSubmitLatch.value = false;

    if (!dictionaryReady.value || dictFatalError.value) {
      hintPick.value = null;
      return;
    }

    if (getFirstWordTutorialPhase?.() === "retryHint") {
      hintPick.value = buildTutorialGameHintPick();
      return;
    }

    const cells = buildGridCellsForHint(grid.value, ROWS, COLS);
    const bossCtx = buildBossResolveContext();
    hintPick.value = pickHintWordForGrid(
      cells,
      getCandidateWordsByLength,
      resolveWordPattern,
      Math.random,
      {
        lengthWeightShift: getHintLengthWeightShift(),
        bossResolveContext: bossCtx,
        spellCountsByLength: getSpellCountsByLength(),
        getJudgedLengthTableLen: getJudgedLengthTableLenForRun,
        lengthLevelsByLength: getLengthLevelsByLength(),
        ceruleanAnchorCell: resolveCeruleanAnchorCell(
          cells,
          findCeruleanBellLockedTileOnGrid,
          bossCtx?.slug,
        ),
        getHintLexicalTierForWord: hintLexicalTierForWord,
        getHintLexicalPickWeight: hintLexicalPickWeightForWord,
        getHintWordIsFallbackOnly: hintWordIsFallbackOnlyForWord,
      },
    );
  }

  /** 提交进入计分后立刻失效旧提示，避免词槽未清前 hintWordAlreadyActive 仍为 true */
  function notifyWordSubmitStarted() {
    hintSubmitLatch.value = true;
    hintAppliedViaButton.value = false;
    hintAppliedWord.value = null;
    hintPick.value = null;
  }

  watch(scoringAnimating, (active, wasActive) => {
    if (wasActive && !active) {
      refreshWordHintAfterGridStable();
    }
  });

  watch(
    () => getFirstWordTutorialPhase?.() ?? null,
    (phase, prevPhase) => {
      if (phase !== "retryHint" || prevPhase === "retryHint") return;
      refreshWordHintAfterGridStable();
    },
    { flush: "post" },
  );

  const showHintButtonInRun = computed(() => {
    if (getWordHintMode() === "hidden") return false;
    if (!firstWordTutorialActive.value) return true;
    return getFirstWordTutorialPhase?.() === "retryHint";
  });

  const hintButtonMuted = computed(() => {
    if (hintRemaining.value <= 0) return true;
    if (!dictionaryReady.value || dictFatalError.value) return true;
    return hintPick.value == null;
  });

  /** 词槽已按当前提示路径选满（仅自动选中模式；提交/补牌动画期间不算「已激活」） */
  const hintWordAlreadyActive = computed(() => {
    if (!isAutoSelectMode()) return false;
    if (hintSubmitLatch.value) return false;
    if (scoringAnimating.value || gridRefillAnimating.value) return false;
    if (selectedOrder.value.length === 0) return false;
    return selectionMatchesHintPath();
  });

  const hintButtonDimmed = computed(() => hintButtonMuted.value || hintWordAlreadyActive.value);

  const canUseHintButton = computed(() => {
    if (hintButtonMuted.value || hintWordAlreadyActive.value) return false;
    return !isHintInteractionBlocked();
  });

  const hintButtonTitle = computed(() => {
    const left = Math.max(0, Math.floor(Number(hintRemaining.value) || 0));
    const max = Math.max(1, Math.floor(Number(getHintMaxThisLevel()) || BASE_HINT_MAX_PER_LEVEL));
    if (left <= 0) return "提示（本关次数已用完）";
    if (!hintPick.value) return `提示（剩余 ${left} 次，当前无可拼词）`;
    if (hintWordAlreadyActive.value) return `提示（剩余 ${left} 次，已填入提示单词）`;
    if (!isAutoSelectMode()) return `提示（剩余 ${left}/${max} 次）`;
    return `提示（剩余 ${left} 次）`;
  });

  function toastHintBlockedReason() {
    const max = Math.max(1, Math.floor(Number(getHintMaxThisLevel()) || BASE_HINT_MAX_PER_LEVEL));
    if (hintRemaining.value <= 0) {
      showToast(`本关提示次数已用完（${max} 次）`);
      return;
    }
    if (!dictionaryReady.value || dictFatalError.value) {
      showToast("词典尚未就绪");
      return;
    }
    if (!hintPick.value) {
      showToast("当前棋盘拼不出可提交的单词");
    }
  }

  async function runRippleHint(pick) {
    hintRipplePlaying.value = true;
    try {
      await playWordHintRippleSequence(pick.path, getGridTileElByIndex, COLS);
      hintAppliedViaButton.value = true;
      hintAppliedWord.value = pick.word;
    } finally {
      hintRipplePlaying.value = false;
    }
  }

  async function runAutoSelectHint(pick) {
    wordSelectionSwapBusy.value = true;
    try {
      if (flyingLetters.value.length > 0) cancelAllFlyingIn();
      finalizeFlyingBackBatchesImmediately();

      const inWordCount = selectedOrder.value.length;
      if (inWordCount > 0) {
        if (ceruleanBellSlotIndex.value != null) {
          showToast("青铃锁生效时无法使用提示");
          return;
        }
        startOneMoveOut(0);
        await waitForFlyingBackIdle();
      }

      for (const cell of pick.path) {
        const tile = grid.value[cell.row]?.[cell.col];
        if (!tile?.letter) return;
        startOneMoveIn(cell.row, cell.col, tile);
      }
      await waitForFlyingInIdle();
      updateSlotPositions(true);

      hintAppliedViaButton.value = true;
      hintAppliedWord.value = pick.word;
    } finally {
      wordSelectionSwapBusy.value = false;
    }
  }

  async function onHintButtonClick() {
    if (hintWordAlreadyActive.value) return;

    if (hintButtonMuted.value) {
      toastHintBlockedReason();
      return;
    }
    if (isHintInteractionBlocked()) {
      showToast("当前无法使用提示");
      return;
    }

    const pick = hintPick.value;
    if (!pick?.path?.length) {
      showToast("当前棋盘拼不出可提交的单词");
      return;
    }

    triggerHaptic("tabSwitch");

    if (isAutoSelectMode()) {
      await runAutoSelectHint(pick);
    } else {
      await runRippleHint(pick);
    }

    scheduleTutorialSpotlightUpdate?.();
  }

  /**
   * 成功提交后尝试消耗提示次数（仅点击提示且提交同一词时扣次）。
   * @param {string} resolvedWord
   */
  function tryConsumeHintOnSuccessfulSubmit(resolvedWord) {
    const word = String(resolvedWord ?? "").toLowerCase().trim();
    const applied = String(hintAppliedWord.value ?? "").toLowerCase().trim();
    if (hintAppliedViaButton.value && applied && word === applied) {
      hintRemaining.value = Math.max(0, hintRemaining.value - 1);
    }
    hintAppliedViaButton.value = false;
    hintAppliedWord.value = null;
  }

  return {
    hintPick,
    refreshWordHintAfterGridStable,
    notifyWordSubmitStarted,
    tryConsumeHintOnSuccessfulSubmit,
    showHintButtonInRun,
    hintButtonMuted,
    hintWordAlreadyActive,
    hintButtonDimmed,
    canUseHintButton,
    hintButtonTitle,
    onHintButtonClick,
  };
}
