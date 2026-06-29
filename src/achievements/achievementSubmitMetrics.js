/**
 * 单次 submit 内，同一字母最多触发的计分次数（含 replay 与多 pass）。
 * @param {{ letterParts?: unknown[], letterScoringPassCount?: number, letterReplayExtraCounts?: number[] }} detailed
 */
export function computeMaxLetterScoreTriggers(detailed) {
  const n = detailed?.letterParts?.length ?? 0;
  const passCount = Math.max(1, Math.round(Number(detailed?.letterScoringPassCount) || 1));
  const replayExtras = detailed?.letterReplayExtraCounts ?? [];
  let max = 0;
  for (let i = 0; i < n; i++) {
    const replay = Math.max(0, Math.floor(Number(replayExtras[i]) || 0));
    max = Math.max(max, passCount + replay);
  }
  return max;
}

/**
 * 单次 submit 内幸运块效果触发次数（`luckyMaterialRollsByLetter` 各字母掷骰次数之和）。
 * @param {{ luckyMaterialRollsByLetter?: unknown[][] }} detailed
 */
export function countLuckyMaterialTriggers(detailed) {
  const rolls = detailed?.luckyMaterialRollsByLetter;
  if (!Array.isArray(rolls)) return 0;
  let total = 0;
  for (const letterRolls of rolls) {
    if (Array.isArray(letterRolls)) total += letterRolls.length;
  }
  return total;
}

/**
 * @param {{ treasureId?: string | null, materialGridPresenceId?: string | null, scoreFxGridTileIndex?: number }} step
 */
function isSteelGridPresencePostLetterStep(step) {
  if (step?.materialGridPresenceId === "steel") return true;
  if (step?.materialGridPresenceId != null) return false;
  // 兼容未标注材质的旧步：当前仅钢铁块使用「宝藏 id 为空 + 棋盘格 index」字后步
  return (
    step?.treasureId == null &&
    typeof step?.scoreFxGridTileIndex === "number" &&
    step.scoreFxGridTileIndex >= 0
  );
}

/**
 * 单次 submit 内钢铁块棋盘光环增强次数（字后倍率步中来自棋盘格的步数）。
 * @param {{ postLetterTreasureSteps?: { treasureId?: string | null, materialGridPresenceId?: string | null, scoreFxGridTileIndex?: number }[] }} detailed
 */
export function countSteelGridPresenceEnhancements(detailed) {
  const steps = detailed?.postLetterTreasureSteps;
  if (!Array.isArray(steps)) return 0;
  return steps.filter((step) => isSteelGridPresencePostLetterStep(step)).length;
}
