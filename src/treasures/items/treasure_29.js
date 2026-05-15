import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe(mult("+20"), "倍率", "，在关卡完成时1/6的概率摧毁自身"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    // 自毁属于关卡结算概念，当前先实现可复用的倍率部分。
    return { multAdd: 20 };
  },
};
