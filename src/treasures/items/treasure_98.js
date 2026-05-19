import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "epic",
  description: describe("复制右侧的宝藏能力"),
};

/** 效果由 `treasureBlueprintMirror.js` 在计分与 notify 路径镜像右侧槽位 */
