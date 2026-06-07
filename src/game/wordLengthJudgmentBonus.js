import { getPresetWordLengthJudgmentBonus } from "./runPresetRuntime.js";
import {
  sumTreasureLengthJudgmentPenalty,
  sumTreasureSubmitLengthBonus,
} from "../treasures/treasureRegistry.js";
import { getWordLengthJudgmentBonus } from "../vouchers/voucherRuntime.js";

/**
 * 拼词「判定词长」净加成：券 + 预设 + 宝藏等效加长 − 整局/宝藏减益。
 * 预览与提交须共用，保证竹子等与画笔券一致在选词时即生效。
 *
 * @param {{
 *   ownedVoucherIds?: Iterable<string>,
 *   ownedSlotTreasureIds?: (string | null | undefined)[],
 *   presetId?: string,
 *   runWordLengthJudgmentPenalty?: number,
 * }} opts
 */
export function resolveWordLengthJudgmentBonus({
  ownedVoucherIds = [],
  ownedSlotTreasureIds = [],
  presetId = "",
  runWordLengthJudgmentPenalty = 0,
} = {}) {
  return (
    getWordLengthJudgmentBonus(ownedVoucherIds) +
    getPresetWordLengthJudgmentBonus(presetId) -
    Math.max(0, Math.floor(Number(runWordLengthJudgmentPenalty) || 0)) -
    sumTreasureLengthJudgmentPenalty(ownedSlotTreasureIds) +
    sumTreasureSubmitLengthBonus(ownedSlotTreasureIds)
  );
}
