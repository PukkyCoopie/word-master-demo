import { describe } from "../treasureDescription.js";
import { tryOpenInRunPackOnWordMatch } from "../treasureInRunPackTriggers.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果拼写的单词为形容词且以ous结尾，打开一个宝藏组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnWordMatch(ctx, {
      treasureId: "82",
      suffix: "ous",
      posKey: "adj",
      packKind: "treasure",
    });
  },
};
