import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("你的单词的第一个字母会额外触发2次计分"),
  unlockPrerequisite: { type: "allCommonBossWin" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterReplayCountForLetter(_ctx, _part, letterIndex) {
    return letterIndex === 0 ? 2 : 0;
  },
};
