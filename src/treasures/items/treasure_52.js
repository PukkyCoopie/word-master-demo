import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果单词长度在本关内已经被拼写过，", mult("x3"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const len = Math.max(0, Math.round(Number(ctx.lengthTableLen ?? ctx.tiles?.length) || 0));
    if (len <= 0) return null;
    const used = ctx.treasureRun?.levelLengthsSpelled;
    if (!(used instanceof Set) || !used.has(len)) return null;
    return { multMul: 3 };
  },
  onSuccessfulWordSubmit(ctx) {
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len > 0 && ctx.treasureRun?.levelLengthsSpelled) {
      ctx.treasureRun.levelLengthsSpelled.add(len);
    }
  },
};
