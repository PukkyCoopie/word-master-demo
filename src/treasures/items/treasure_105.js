import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "epic",
  unlockPrerequisite: { type: "discardWordLen7OrSoldBlueprint98" },
  description: describe("复制最左边的宝藏的效果"),
};

/** 效果由 `treasureBlueprintMirror.js` 镜像左侧槽位 */
