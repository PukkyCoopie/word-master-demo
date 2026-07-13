/**
 * 局内阶段机（纯函数，无 Vue 依赖）。
 * 与 `serializeRunSave.js` 持久化 phase、`runSaveGuards.js` idle 判定对齐。
 */

/** @typedef {import('./runSessionTypes.js').RunPhaseId} RunPhaseId */
/** @typedef {import('./runSessionTypes.js').RunSavePhase} RunSavePhase */
/** @typedef {import('./runSessionTypes.js').RunPhaseSnapshot} RunPhaseSnapshot */

/**
 * @typedef {Object} RunPhaseMachineInput
 * @property {boolean} showShop
 * @property {boolean} showSettlement
 * @property {boolean} showRunEnd
 * @property {boolean} [showPauseOptions]
 * @property {boolean} [showDeveloperOptions]
 * @property {'win' | 'fail' | string} [runEndOutcome]
 * @property {boolean} transitionBusy
 * @property {boolean} shopOverlayLayersSuppressed
 * @property {boolean} [scoringAnimating]
 * @property {boolean} [gridRefillAnimating]
 * @property {boolean} [submitWordBusy]
 * @property {boolean} [shopUpgradeAnimating]
 * @property {boolean} [dictionaryReady]
 * @property {boolean} [resolvedWordForSubmitReady]
 * @property {number} [remainingWords]
 * @property {boolean} [firstWordTutorialBlocking]
 * @property {string} [firstWordTutorialPhase]
 * @property {boolean} [firstWordTutorialRetryHintSubmitReady]
 * @property {boolean} [isFirstWordTutorialBlockingInput]
 * @property {number} [flyingLettersCount]
 * @property {number} [flyingBackBatchesCount]
 * @property {boolean} [packPickSessionOpen]
 * @property {boolean} [spellTargetOpen]
 */

/** @type {readonly RunPhaseId[]} */
export const RUN_TRANSIENT_PHASES = Object.freeze([
  "scoring",
  "grid_refill",
  "pack_pick",
  "spell_target",
]);

/** @type {readonly RunSavePhase[]} */
export const RUN_PERSISTED_PHASES = Object.freeze([
  "playing",
  "settlement",
  "shop",
  "run_end_win",
  "run_end_fail",
]);

/**
 * 与 `serializeRunSave` 一致：由 overlay 布尔推导写盘 phase。
 * @param {RunPhaseMachineInput} input
 * @returns {RunSavePhase}
 */
export function resolvePersistedRunSavePhase(input) {
  if (input.showRunEnd) {
    return input.runEndOutcome === "win" ? "run_end_win" : "run_end_fail";
  }
  if (input.showSettlement) return "settlement";
  if (input.showShop) return "shop";
  return "playing";
}

/**
 * 含瞬时 UI 阶段的 phaseId（§2.4）。
 * @param {RunPhaseMachineInput} input
 * @returns {RunPhaseId}
 */
export function resolveRunPhaseId(input) {
  const persisted = resolvePersistedRunSavePhase(input);
  if (persisted !== "playing" && persisted !== "shop") return persisted;

  if (persisted === "shop") {
    if (input.spellTargetOpen) return "spell_target";
    if (input.packPickSessionOpen) return "pack_pick";
    return "shop";
  }

  if (input.spellTargetOpen) return "spell_target";
  if (input.packPickSessionOpen) return "pack_pick";
  if (input.scoringAnimating || input.submitWordBusy) return "scoring";
  if (input.gridRefillAnimating) return "grid_refill";
  return "playing";
}

/** @param {RunPhaseMachineInput} input */
export function isRunFlowOverlayOpen(input) {
  return !!(
    input.showSettlement ||
    input.showRunEnd ||
    input.showPauseOptions ||
    input.showDeveloperOptions
  );
}

/** @param {RunPhaseMachineInput} input */
export function isBlockingPauseOpen(input) {
  return !!(input.showSettlement || input.showRunEnd);
}

/**
 * 与 GamePanel `canSubmit` / 提交按钮视觉态对齐（含飞入在途、飞回截断后的有效词判定）。
 * @param {RunPhaseMachineInput} input
 */
export function canSubmitWord(input) {
  if (
    input.firstWordTutorialBlocking &&
    input.firstWordTutorialPhase !== "submit" &&
    input.firstWordTutorialPhase !== "retry" &&
    input.firstWordTutorialPhase !== "retryHint"
  ) {
    return false;
  }
  const tutorialRetry = input.firstWordTutorialPhase === "retry";
  const tutorialRetryHint = input.firstWordTutorialPhase === "retryHint";
  if (tutorialRetryHint && !input.firstWordTutorialRetryHintSubmitReady) {
    return false;
  }
  return (
    !input.showShop &&
    !isRunFlowOverlayOpen(input) &&
    !input.transitionBusy &&
    input.dictionaryReady !== false &&
    input.resolvedWordForSubmitReady === true &&
    ((input.remainingWords ?? 0) > 0 || tutorialRetry || tutorialRetryHint) &&
    !input.scoringAnimating &&
    !input.submitWordBusy &&
    !input.gridRefillAnimating
  );
}

/**
 * 商店 portal 可交互（购货 / reroll / 下一关）。
 * @param {RunPhaseMachineInput} input
 */
export function canOpenShop(input) {
  return (
    input.showShop === true &&
    !input.transitionBusy &&
    !input.shopUpgradeAnimating
  );
}

/**
 * 与 `openPauseOptions` / `openPauseOptionsFromShop` 门禁对齐。
 * @param {RunPhaseMachineInput} input
 */
export function canPause(input) {
  if (input.isFirstWordTutorialBlockingInput) return false;
  if (input.transitionBusy) return false;
  if (isBlockingPauseOpen(input)) return false;
  if (input.showShop) return true;
  if (isRunFlowOverlayOpen(input)) return false;
  return true;
}

/**
 * 与 `checkGamePanelCanSave` idle 布尔组合一致。
 * @param {RunPhaseMachineInput} input
 */
export function computeRunSaveIdle(input) {
  return (
    !input.transitionBusy &&
    !input.scoringAnimating &&
    !input.gridRefillAnimating &&
    (input.flyingLettersCount ?? 0) === 0 &&
    (input.flyingBackBatchesCount ?? 0) === 0 &&
    !input.submitWordBusy
  );
}

/**
 * @param {RunPhaseMachineInput} input
 * @returns {RunPhaseSnapshot}
 */
export function buildRunPhaseSnapshot(input) {
  const phaseId = resolveRunPhaseId(input);
  return {
    phaseId,
    isPlaying: !input.showShop && !input.showSettlement && !input.showRunEnd,
    isShop: input.showShop === true,
    isSettlement: input.showSettlement === true,
    isRunEndWin: input.showRunEnd === true && input.runEndOutcome === "win",
    isRunEndFail: input.showRunEnd === true && input.runEndOutcome !== "win",
    isRunEnd: input.showRunEnd === true,
    transitionBusy: input.transitionBusy === true,
    shopOverlayLayersSuppressed: input.shopOverlayLayersSuppressed === true,
    canSubmitWord: () => canSubmitWord(input),
    canOpenShop: () => canOpenShop(input),
    canPause: () => canPause(input),
    isRunFlowOverlayOpen: () => isRunFlowOverlayOpen(input),
    isBlockingPauseOpen: () => isBlockingPauseOpen(input),
  };
}

/**
 * @param {() => RunPhaseMachineInput} getInput
 */
export function createRunPhaseMachine(getInput) {
  return {
    resolvePhaseId: () => resolveRunPhaseId(getInput()),
    resolvePersistedPhase: () => resolvePersistedRunSavePhase(getInput()),
    snapshot: () => buildRunPhaseSnapshot(getInput()),
    isRunFlowOverlayOpen: () => isRunFlowOverlayOpen(getInput()),
    isBlockingPauseOpen: () => isBlockingPauseOpen(getInput()),
    canSubmitWord: () => canSubmitWord(getInput()),
    canOpenShop: () => canOpenShop(getInput()),
    canPause: () => canPause(getInput()),
    computeRunSaveIdle: () => computeRunSaveIdle(getInput()),
  };
}

/** @type {Readonly<Record<RunSavePhase, readonly RunPhaseId[]>>} */
export const ALLOWED_PERSISTED_PHASE_TRANSITIONS = Object.freeze({
  playing: Object.freeze(["settlement", "run_end_win", "run_end_fail"]),
  settlement: Object.freeze(["shop", "playing"]),
  shop: Object.freeze(["playing"]),
  run_end_win: Object.freeze([]),
  run_end_fail: Object.freeze([]),
});

/**
 * 持久化 phase 转移是否允许（瞬时 phase 不写盘，不在此校验）。
 * @param {RunSavePhase} from
 * @param {RunSavePhase} to
 */
export function canTransitionPersistedPhase(from, to) {
  if (from === to) return true;
  const allowed = ALLOWED_PERSISTED_PHASE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}
