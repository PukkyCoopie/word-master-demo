import { iterTreasureHookContributions } from "./treasureBlueprintMirror.js";
import { TREASURE_HOOKS_BY_ID } from "../treasures/treasureRegistry.js";

/**
 * 计分板 / 回形针等写在格与 `_deckCard` 上的持久平面分、倍率（`tileScoreBonus` / `letterMultBonus`）。
 * 与玩家本关「标记」折角（`playerMarked`，不进字母库、不算书包等「增益」）无关。
 * 法术改字母、材质、稀有度、万能等时，应在突变后写回，避免牌张与格短暂不同步或后续路径盖掉。
 */

/** @param {unknown} card */
export function deckCardHasPersistedIntrinsicGain(card) {
  if (!card || typeof card !== "object") return false;
  const c = /** @type {{ tileScoreBonus?: unknown, letterMultBonus?: unknown }} */ (card);
  if (Math.floor(Number(c.tileScoreBonus) || 0) !== 0) return true;
  if (Math.floor(Number(c.letterMultBonus) || 0) !== 0) return true;
  return false;
}

/**
 * @param {unknown} tile
 * @returns {{ sb: number, mb: number }}
 */
export function snapshotMaxIntrinsicGainsFromTile(tile) {
  if (!tile || typeof tile !== "object") return { sb: 0, mb: 0 };
  const sbT = Math.max(0, Math.floor(Number(/** @type {{ tileScoreBonus?: unknown }} */ (tile).tileScoreBonus) || 0));
  const mbT = Math.max(0, Math.round(Number(/** @type {{ letterMultBonus?: unknown }} */ (tile).letterMultBonus) || 0));
  const c = /** @type {{ tileScoreBonus?: unknown, letterMultBonus?: unknown } | null} */ (
    /** @type {{ _deckCard?: unknown }} */ (tile)._deckCard
  );
  const sbC =
    c && typeof c === "object" ? Math.max(0, Math.floor(Number(c.tileScoreBonus) || 0)) : 0;
  const mbC =
    c && typeof c === "object" ? Math.max(0, Math.round(Number(c.letterMultBonus) || 0)) : 0;
  return { sb: Math.max(sbT, sbC), mb: Math.max(mbT, mbC) };
}

/**
 * @param {unknown} tile
 * @param {{ sb: number, mb: number }} gains
 */
export function applyIntrinsicGainsToTileAndLinkedCard(tile, gains) {
  if (!tile || typeof tile !== "object") return;
  const sb = Math.max(0, Math.floor(Number(gains?.sb) || 0));
  const mb = Math.max(0, Math.round(Number(gains?.mb) || 0));
  /** @type {{ tileScoreBonus?: number, letterMultBonus?: number }} */
  const t = tile;
  t.tileScoreBonus = sb;
  t.letterMultBonus = mb;
  const c = /** @type {{ tileScoreBonus?: number, letterMultBonus?: number } | null} */ (
    /** @type {{ _deckCard?: unknown }} */ (tile)._deckCard
  );
  if (c && typeof c === "object") {
    c.tileScoreBonus = sb;
    c.letterMultBonus = mb;
  }
}

/**
 * 单次逐字计分 visit 写回 tile 的平面分增量（计分板等；不含仅入宝藏银行的泡泡）。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {{ letter?: string }} part
 * @param {number} letterIndex
 */
export function sumWordScoreIntrinsicPersistScoreDeltaPerVisit(
  ownedSlotTreasureIds,
  part,
  letterIndex,
) {
  const slots = ownedSlotTreasureIds ?? [];
  const ctx = { ownedSlotTreasureIds: slots };
  let delta = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.mergeLetterScoreCueIntoIntrinsicLetterScoreStep) continue;
    if (hooks?.perLetterScoreCueDepositsTreasureBank) continue;
    if (hooks?.replaySubmitScoreAdjustmentsOwnsPerLetterScore) continue;
    const cue = hooks.getPerLetterScoreCue?.(ctx, part, letterIndex);
    delta += Math.max(0, Math.floor(Number(cue?.delta) || 0));
  }
  return delta;
}

/**
 * 单次逐字计分 visit 写回 tile 的倍率加法增量（回形针等）。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {{ letter?: string }} part
 * @param {number} letterIndex
 */
export function sumWordScoreIntrinsicPersistMultDeltaPerVisit(
  ownedSlotTreasureIds,
  part,
  letterIndex,
) {
  const slots = ownedSlotTreasureIds ?? [];
  const ctx = { ownedSlotTreasureIds: slots };
  let delta = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.mergeLetterMultCueIntoIntrinsicLetterMultStep) continue;
    const cue = hooks.getPerLetterMultCue?.(ctx, part, letterIndex);
    delta += Math.max(0, Math.round(Number(cue?.delta) || 0));
  }
  return delta;
}
