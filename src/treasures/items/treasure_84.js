import { concept, describe } from "../treasureDescription.js";
import { tryOpenInRunPackOnWordMatch } from "../treasureInRunPackTriggers.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果拼写的单词为名词且以ment结尾，打开一个", concept("升级"), "组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnWordMatch(ctx, {
      treasureId: "84",
      suffix: "ment",
      posKey: "n",
      packKind: "upgrade",
    });
  },
};
