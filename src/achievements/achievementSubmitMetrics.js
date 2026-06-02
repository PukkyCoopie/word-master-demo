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
