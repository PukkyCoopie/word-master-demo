/** @typedef {'off' | 'endless' | 'always'} SkipSettlementAnimMode */

/** @type {readonly { id: SkipSettlementAnimMode; label: string }[]} */
export const SKIP_SETTLEMENT_ANIM_MODE_OPTIONS = Object.freeze([
  { id: "off", label: "关闭" },
  { id: "endless", label: "仅无尽" },
  { id: "always", label: "总是跳过" },
]);

const SKIP_SETTLEMENT_ANIM_MODE_IDS = new Set(SKIP_SETTLEMENT_ANIM_MODE_OPTIONS.map((o) => o.id));

/** @param {unknown} value @returns {SkipSettlementAnimMode} */
export function normalizeSkipSettlementAnimMode(value) {
  const s = String(value ?? "");
  return SKIP_SETTLEMENT_ANIM_MODE_IDS.has(/** @type {SkipSettlementAnimMode} */ (s))
    ? /** @type {SkipSettlementAnimMode} */ (s)
    : "endless";
}

/** @type {SkipSettlementAnimMode} */
let testSkipSettlementAnimModeOverride = null;

/** @param {SkipSettlementAnimMode | null} mode */
export function setTestSkipSettlementAnimModeOverride(mode) {
  testSkipSettlementAnimModeOverride = mode;
}

function readSkipSettlementAnimMode() {
  if (testSkipSettlementAnimModeOverride != null) {
    return normalizeSkipSettlementAnimMode(testSkipSettlementAnimModeOverride);
  }
  return normalizeSkipSettlementAnimMode(
    /** @type {import('./gameSettings.js').gameSettings} */ (
      // 延迟读取，避免测试文件静态 import gameSettings 触发 Vite 专用依赖
      globalThis.__wmGameSettingsForSkipAnim?.skipSettlementAnimMode
    ) ?? "off",
  );
}

/**
 * @param {boolean} [isEndlessRun]
 * @returns {boolean}
 */
export function shouldSkipSettlementAnim(isEndlessRun = false) {
  const mode = readSkipSettlementAnimMode();
  if (mode === "always") return true;
  if (mode === "endless" && isEndlessRun === true) return true;
  return false;
}

/** 提交计分中段（逐字母 + 宝藏生效）是否跳过动效 */
let submitScoringMidPhaseSkipActive = false;

/** @returns {boolean} */
export function isSubmitScoringMidPhaseSkipActive() {
  return submitScoringMidPhaseSkipActive;
}

/** @param {boolean} active */
export function setSubmitScoringMidPhaseSkipActive(active) {
  submitScoringMidPhaseSkipActive = active === true;
}

/** 关卡结束前宝藏 FX 是否跳过动效 */
let levelEndSettlementSkipActive = false;

/** @returns {boolean} */
export function isLevelEndSettlementSkipActive() {
  return levelEndSettlementSkipActive;
}

/** @param {boolean} active */
export function setLevelEndSettlementSkipActive(active) {
  levelEndSettlementSkipActive = active === true;
}

/** @type {boolean | null} null = 未绑定，回退 false */
let boundSkipSettlementIsEndlessRun = null;

/** 提交计分序列开始时绑定（供 shouldSkipSettlementTreasureFx 读取无尽模式） */
export function bindSkipSettlementAnimEndlessRun(isEndlessRun) {
  boundSkipSettlementIsEndlessRun = isEndlessRun === true;
}

export function clearSkipSettlementAnimEndlessRunBinding() {
  boundSkipSettlementIsEndlessRun = null;
}

function resolveSkipSettlementIsEndlessRun(isEndlessRun) {
  if (typeof isEndlessRun === "boolean") return isEndlessRun;
  return boundSkipSettlementIsEndlessRun === true;
}

/** 提交中段或关卡结束 skip 任一激活时，宝藏/计分原语应跳过 DOM 动效 */
export function shouldSkipSettlementTreasureFx(isEndlessRun) {
  if (submitScoringMidPhaseSkipActive || levelEndSettlementSkipActive) return true;
  return shouldSkipSettlementAnim(resolveSkipSettlementIsEndlessRun(isEndlessRun));
}

/** 提交尾段（总分后、离场前）宝藏装饰 FX 是否跳过 */
export function shouldSkipSubmitTailTreasureFx(isEndlessRun) {
  return shouldSkipSettlementAnim(resolveSkipSettlementIsEndlessRun(isEndlessRun));
}

/** @param {import('./gameSettings.js').gameSettings} gameSettingsRef */
export function bindSettlementAnimSkipGameSettings(gameSettingsRef) {
  globalThis.__wmGameSettingsForSkipAnim = gameSettingsRef;
}
