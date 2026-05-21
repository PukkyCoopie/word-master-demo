import { describe, mult } from "../treasureDescription.js";
import {
  stripEnhancementsFromTileOrDeckCard,
  tileHasScoringEnhancement,
} from "../../game/treasureEnhancementStrip.js";
import { bankMultMulGain, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "88";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "epic",
  description: describe(
    "每当你使用一个带有增强效果的字母，移除它的增强效果，并获得",
    mult("x0.1"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = ctx.treasureRun?.banks?.[ID]?.multMul ?? 1;
    return m > 1 ? { multMul: m } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    const tiles = ctx.submittedScoringTiles;
    if (!Array.isArray(tiles)) return;
    let stripped = 0;
    for (const t of tiles) {
      if (!tileHasScoringEnhancement(t)) continue;
      stripEnhancementsFromTileOrDeckCard(t);
      if (t._deckCard) stripEnhancementsFromTileOrDeckCard(t._deckCard);
      stripped += 1;
    }
    if (stripped > 0) await bankMultMulGain(ctx, ID, 1.1, "×0.1");
  },
};
