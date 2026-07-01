/**
 * 结果区展示用纯逻辑（不含 submit 计分流程）。
 */

import { resolveScoreNumericPresentation } from "../utils/scoreNumericFormat.js";

/** UI 数字统一按整数显示（内部可保留小数，展示时四舍五入） */
export function formatResultNum(n) {
  if (typeof n === "string") return resolveScoreNumericPresentation(n).text;
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return resolveScoreNumericPresentation(Math.round(x)).text;
}

/** 倍率面板：整数优先，必要时一位小数 */
export function formatMultDisplay(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  const s = n.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(n)) : s;
}

/**
 * 结果区词长/公式预览：单词实际字母数 + 判定加成后的查表词长。
 *
 * @param {Object} p
 * @param {readonly unknown[]} p.tiles
 * @param {string | null} p.resolvedWord
 * @param {(tiles: readonly unknown[], word: string | null) => number} p.getWordLetterCount
 * @param {(n: number) => number} p.judgedLengthTableLenForRun
 */
export function computeResultAreaJudgedWordLength(p) {
  const n = p.getWordLetterCount(p.tiles, p.resolvedWord);
  if (n < 1) return 0;
  return p.judgedLengthTableLenForRun(n);
}

/**
 * result-formula 预览是否可用：合法词且词典就绪。
 *
 * @param {Object} p
 * @param {readonly unknown[]} p.tiles
 * @param {boolean} p.bossSoftWordViolation
 * @param {boolean} p.dictionaryReady
 * @param {string | null} p.resolvedWord
 */
export function isResultFormulaBasePreviewActive(p) {
  if (p.tiles.length === 0) return false;
  if (p.bossSoftWordViolation) return false;
  return p.dictionaryReady && p.resolvedWord != null;
}

/**
 * @param {Object} p
 * @param {number} p.judgedLen
 * @param {Record<number, number>} p.lengthLevelsByLength
 * @param {number} p.lengthUpgradeObservatoryExtra
 * @param {boolean} p.isFlintBossActive
 * @param {(len: number, levels: Record<number, number>, extra: number) => number} p.getWordLengthScoreForTableLen
 * @param {(score: number, flint: boolean) => number} p.scaleLengthContributionForBoss
 */
export function computePreviewFormulaScore(p) {
  return Math.round(
    p.scaleLengthContributionForBoss(
      p.getWordLengthScoreForTableLen(
        p.judgedLen,
        p.lengthLevelsByLength,
        p.lengthUpgradeObservatoryExtra,
      ),
      p.isFlintBossActive,
    ),
  );
}

/**
 * @param {Object} p
 * @param {number} p.judgedLen
 * @param {Record<number, number>} p.lengthLevelsByLength
 * @param {number} p.lengthUpgradeObservatoryExtra
 * @param {boolean} p.isFlintBossActive
 * @param {(len: number, levels: Record<number, number>, extra: number) => number} p.getLengthMultiplier
 * @param {(mult: number, flint: boolean) => number} p.scaleLengthContributionForBoss
 */
export function computePreviewFormulaMult(p) {
  const m = p.scaleLengthContributionForBoss(
    p.getLengthMultiplier(p.judgedLen, p.lengthLevelsByLength, p.lengthUpgradeObservatoryExtra),
    p.isFlintBossActive,
  );
  return Math.max(0, Math.round(Number(m) || 0));
}
