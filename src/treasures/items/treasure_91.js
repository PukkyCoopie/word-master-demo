import { describe, money } from "../treasureDescription.js";

const ID = "91";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe("黄金块在计分时会提供", money("4")),
  poolPrerequisite: { type: "playedAllGoldWord" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const tiles = ctx.submittedScoringTiles;
    if (!Array.isArray(tiles)) return;
    let gold = 0;
    for (const t of tiles) {
      if (String(t?.materialId ?? "") === "gold") gold += 1;
    }
    if (gold > 0) await ctx.playOwnedTreasureMoneyFx?.(ID, gold * 4);
  },
};
