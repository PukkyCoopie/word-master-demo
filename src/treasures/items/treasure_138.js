import { describe, mult, rarity } from "../treasureDescription.js";
import { iterTreasureHookContributions } from "../../game/treasureBlueprintMirror.js";
import { getTreasureDef, TREASURE_HOOKS_BY_ID } from "../treasureRegistry.js";

const ID = "138";

/** @type {Readonly<Record<string, number>>} */
const MULT_BY_RARITY = Object.freeze({
  epic: 1.25,
  legendary: 1.75,
});

/** @param {string} treasureId */
function trophyBoostMultForTreasureId(treasureId) {
  const tid = String(treasureId ?? "").trim();
  if (!tid || tid === ID) return null;
  const rarityKey = getTreasureDef(tid)?.rarity ?? "common";
  const m = MULT_BY_RARITY[rarityKey];
  return m && m > 1 ? m : null;
}

/** @param {(string | null | undefined)[]} slots */
function ownedHasTrophy(slots) {
  return (slots ?? []).some((raw) => String(raw ?? "").trim() === ID);
}

/**
 * @param {import('../treasureTypes.js').TreasureHooks | undefined} hooks
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 * @param {{ letter?: string, rarity?: string }} part
 * @param {number} letterIndex
 */
function countPerLetterTreasureContributions(hooks, ctx, part, letterIndex) {
  if (!hooks) return 0;
  let n = 0;
  const scoreDelta = Math.max(0, Math.floor(Number(hooks.getPerLetterScoreCue?.(ctx, part, letterIndex)?.delta) || 0));
  if (scoreDelta > 0) n += 1;
  const multDelta = Math.max(0, Math.round(Number(hooks.getPerLetterMultCue?.(ctx, part, letterIndex)?.delta) || 0));
  if (multDelta > 0) n += 1;
  const animCfg = hooks.getLetterRarityMultAnimConfig?.(ctx);
  if (animCfg) {
    const matches =
      typeof animCfg.matchesPart === "function"
        ? animCfg.matchesPart(part)
        : animCfg.targetRarity != null && part.rarity === animCfg.targetRarity;
    if (matches) {
      const multDeltaR = Number(animCfg.multDelta) || 0;
      const multMulR = Number(animCfg.multMul) || 0;
      if (multDeltaR > 0) n += 1;
      if (multMulR > 1) n += 1;
    }
  }
  return n;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "你的其他",
    rarity("史诗"),
    "和",
    rarity("传说"),
    "宝藏分别提供",
    mult("x1.25"),
    "/",
    mult("x1.75"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildAfterTreasureContributionBoostStep(_ctx, target) {
    const boostMult = trophyBoostMultForTreasureId(target?.treasureId);
    return boostMult ? { multMul: boostMult } : null;
  },

  productPerLetterContributionBoostMult(ctx, { letterParts, scoringVisitCountsByLetter }) {
    const slots = ctx.ownedSlotTreasureIds ?? [];
    if (!ownedHasTrophy(slots)) return 1;
    const parts = letterParts ?? [];
    let product = 1;
    for (let i = 0; i < parts.length; i++) {
      const visits = Math.max(1, Math.floor(Number(scoringVisitCountsByLetter?.[i]) || 0) || 1);
      for (let v = 0; v < visits; v += 1) {
        const visitCtx = { ...ctx, scoringVisitIndex: v };
        for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
          const boostMult = trophyBoostMultForTreasureId(tid);
          if (!boostMult) continue;
          const contribCount = countPerLetterTreasureContributions(
            TREASURE_HOOKS_BY_ID.get(tid),
            visitCtx,
            parts[i],
            i,
          );
          for (let c = 0; c < contribCount; c += 1) product *= boostMult;
        }
      }
    }
    return product;
  },
};
