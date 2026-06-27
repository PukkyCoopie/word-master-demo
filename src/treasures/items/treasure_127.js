import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "在本轮游戏中你每使用过1次升级，便具有",
    mult("+2"),
    "倍率（当前",
    mult("+0"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.treasureRun?.runUpgradesUsedCount) || 0)) * 2;
    return describe(
      "在本轮游戏中你每使用过1次升级，便具有",
      mult("+2"),
      "倍率（当前",
      mult(`+${n}`),
      "）",
    );
  },
  buildPostLetterStep(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.treasureRun?.runUpgradesUsedCount) || 0));
    if (n <= 0) return null;
    return { multAdd: n * 2 };
  },
};
