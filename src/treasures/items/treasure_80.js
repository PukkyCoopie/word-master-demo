import { describe, score } from "../treasureDescription.js";
import { getScoreAddBank } from "../treasureBankHelpers.js";
import { countTreasureHookContributionPaths } from "../../game/treasureBlueprintMirror.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const ID = "80";
const SCORE_PER_B = 8;

/**
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
function countBLetterScoringVisits(ctx) {
  const parts = ctx?.letterParts;
  if (!Array.isArray(parts)) return 0;
  const replayRow = ctx?.letterReplayCounts ?? ctx?.replayCounts;
  let visits = 0;
  for (let i = 0; i < parts.length; i++) {
    if (normalizeLetterChar(parts[i]?.letter) !== "b") continue;
    const replay = Array.isArray(replayRow)
      ? Math.max(0, Math.floor(Number(replayRow[i]) || 0))
      : 0;
    visits += 1 + replay;
  }
  return visits;
}

/**
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
function pendingScoreAddThisSubmit(ctx) {
  return countBLetterScoringVisits(ctx) * SCORE_PER_B;
}

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function patchBKeyDescription(ctx) {
  const v = Math.round(getScoreAddBank(ctx.treasureRun, ID));
  return describe(
    "每当字母B计分时，使其和本宝藏均获得",
    score("+8"),
    "分数",
    "（当前",
    score(v >= 0 ? `+${v}` : String(v)),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "每当字母B计分时，使其和本宝藏均获得",
    score("+8"),
    "分数",
    "（当前",
    score("+0"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: patchBKeyDescription,
  perLetterScoreCueDepositsTreasureBank: true,
  showPerLetterScoreCueBubble: false,
  accumulateReplaySubmitAdjustments() {
    return null;
  },
  buildPostLetterStep(ctx) {
    const bank = getScoreAddBank(ctx.treasureRun, ID);
    const visitScore = pendingScoreAddThisSubmit(ctx);
    const paths = countTreasureHookContributionPaths(ctx.ownedSlotTreasureIds, ID);
    const fromTriggers = visitScore * Math.max(1, paths);
    const total = bank + fromTriggers;
    return total !== 0 ? { scoreAdd: total } : null;
  },
  getPerLetterScoreCue(_ctx, part) {
    if (normalizeLetterChar(part?.letter) !== "b") return null;
    return { delta: SCORE_PER_B, label: `+${SCORE_PER_B}` };
  },
  mergeLetterScoreCueIntoIntrinsicLetterScoreStep: true,
  persistTileAfterPerLetterTreasureCue(ctx) {
    if (ctx.band !== "score" || !ctx.realTile || typeof ctx.realTile !== "object") return false;
    const letter = normalizeLetterChar(ctx.realTile?.letter);
    if (letter !== "b") return false;
    const d = Math.max(0, Math.floor(Number(ctx.delta) || 0));
    if (d <= 0) return false;
    const t = ctx.realTile;
    const v = Math.max(0, Math.floor(Number(t.tileScoreBonus) || 0)) + d;
    t.tileScoreBonus = v;
    const c = t._deckCard;
    if (c && typeof c === "object") c.tileScoreBonus = v;
    return true;
  },
};
