import { describe } from "../treasureDescription.js";

const ID = "111";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  unlockPrerequisite: { type: "everDiscardedFullWord" },
  description: describe("每当你在关卡中第一次弃掉一个完整单词，升级这个单词对应的长度"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.levelFirstFullWordDiscardDone) return;
    const chars = (ctx.discardedLetters ?? [])
      .map((p) => String(p?.letter ?? "").toLowerCase())
      .join("");
    if (!chars || !ctx.resolveDiscardedWord?.(chars)) return;
    rs.levelFirstFullWordDiscardDone = true;
    const len = chars.length;
    ctx.bumpWordLengthLevel?.(len);
  },
};
