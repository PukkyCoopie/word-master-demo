import { getTileMaterialBlockTitle, getTileMaterialEffectDescription } from "../../game/gameConceptCopy.js";
import { describe, gain } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 6,
  rarity: "epic",
  description: describe(
    "当一次拼写中包含至少3种材质的字母块时，使棋盘上一个随机字母块变为",
    gain(getTileMaterialBlockTitle("wildcard")),
  ),
};

const MIN_DISTINCT_MATERIALS = 3;

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const parts = ctx.submittedScoringTiles;
    if (!Array.isArray(parts) || parts.length === 0) return;
    const distinct = new Set();
    for (const p of parts) {
      const m = p?.materialId;
      if (m == null || m === "") continue;
      distinct.add(String(m));
    }
    if (distinct.size < MIN_DISTINCT_MATERIALS) return;
    await ctx.mutateRandomNonWildcardLetterTileToWildcard?.();
  },
  getDetailGainPanel() {
    return {
      title: getTileMaterialBlockTitle("wildcard"),
      description: describe(getTileMaterialEffectDescription("wildcard") ?? ""),
    };
  },
};
