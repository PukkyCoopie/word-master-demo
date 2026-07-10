import { getPresetWordLengthJudgmentBonus } from "./runPresetRuntime.js";
import {
  sumTreasureLengthJudgmentPenalty,
  sumTreasureSubmitLengthBonus,
  sumTreasureSubmitScoringWordLetterCountBonus,
} from "../treasures/treasureRegistry.js";
import { getLengthTableLenFromTileCountAndBonus, getWordLengthJudgmentBonus } from "../vouchers/voucherRuntime.js";

/**
 * 拼词「判定词长」净加成：券 + 预设 + 宝藏等效加长 − 整局/宝藏减益。
 * 预览与提交须共用，保证竹子等与画笔券一致在选词时即生效。
 *
 * @param {{
 *   ownedVoucherIds?: Iterable<string>,
 *   ownedSlotTreasureIds?: (string | null | undefined)[],
 *   presetId?: string,
 *   runWordLengthJudgmentPenalty?: number,
 *   treasureRun?: import('../treasures/treasureRunState.js').TreasureRunState,
 * }} opts
 */
export function resolveWordLengthJudgmentBonus({
  ownedVoucherIds = [],
  ownedSlotTreasureIds = [],
  presetId = "",
  runWordLengthJudgmentPenalty = 0,
  treasureRun,
} = {}) {
  return (
    getWordLengthJudgmentBonus(ownedVoucherIds) +
    getPresetWordLengthJudgmentBonus(presetId) -
    Math.max(0, Math.floor(Number(runWordLengthJudgmentPenalty) || 0)) -
    sumTreasureLengthJudgmentPenalty(ownedSlotTreasureIds) +
    sumTreasureSubmitLengthBonus(ownedSlotTreasureIds, treasureRun)
  );
}

/**
 * 判定词长查表长度：实际字母数 + 按词内容宝藏加长（弓箭 X/Y/Z、报纸 +S 等）+ flat 判定加成。
 * 预览与提交须共用。
 *
 * @param {{
 *   wordLetterCount: number,
 *   ownedVoucherIds?: Iterable<string>,
 *   ownedSlotTreasureIds?: (string | null | undefined)[],
 *   presetId?: string,
 *   runWordLengthJudgmentPenalty?: number,
 *   treasureRun?: import('../treasures/treasureRunState.js').TreasureRunState,
 *   tiles?: readonly unknown[],
 *   resolvedWord?: string | null,
 *   getWordDefinition?: (word: string) => object | null | undefined,
 *   rarityLevelsByRarity?: Record<string, number> | null,
 * }} opts
 */
export function resolveJudgedLengthTableLen({
  wordLetterCount,
  ownedVoucherIds = [],
  ownedSlotTreasureIds = [],
  presetId = "",
  runWordLengthJudgmentPenalty = 0,
  treasureRun,
  tiles,
  resolvedWord,
  getWordDefinition,
  rarityLevelsByRarity,
} = {}) {
  const n = Math.max(0, Math.floor(Number(wordLetterCount)) || 0);
  const flatBonus = resolveWordLengthJudgmentBonus({
    ownedVoucherIds,
    ownedSlotTreasureIds,
    presetId,
    runWordLengthJudgmentPenalty,
    treasureRun,
  });
  const contentBonus = sumTreasureSubmitScoringWordLetterCountBonus(ownedSlotTreasureIds, {
    tiles,
    resolvedWord,
    getWordDefinition,
    rarityLevelsByRarity,
    treasureRun,
  });
  return getLengthTableLenFromTileCountAndBonus(n + contentBonus, flatBonus);
}
