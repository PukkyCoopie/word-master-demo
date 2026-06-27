import { describe, money, prob } from "../treasureDescription.js";
import { ensureTreasureBank } from "../treasureRunState.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

const ID = "132";

/** @param {import('../treasureRunState.js').TreasureRunState | null | undefined} rs */
function currentPayout(rs) {
  const v = rs?.banks?.[ID]?.scoreAdd;
  return Math.max(1, Math.floor(Number(v) || 1));
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe(
    "每个关卡完成时使你获得",
    money("1"),
    "，且有",
    prob("1/2"),
    "的概率提升此数值（当前",
    money("1"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const payout = currentPayout(ctx.treasureRun);
    return describe(
      "每个关卡完成时使你获得",
      money(String(payout)),
      "，且有",
      prob("1/2"),
      "的概率提升此数值（当前",
      money(String(payout)),
      "）",
    );
  },
  async onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const payout = currentPayout(rs);
    await ctx.playOwnedTreasureMoneyFx?.(ID, payout);
    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    if (rollProbabilitySuccess(1, 2, rnd, ctx.ownedSlotTreasureIds)) {
      ensureTreasureBank(rs, ID).scoreAdd = payout + 1;
    }
  },
};
