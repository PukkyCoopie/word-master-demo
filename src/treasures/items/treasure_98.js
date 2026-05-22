import { describe } from "../treasureDescription.js";
const ID = "98";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "epic",
  description: describe("复制右侧的宝藏能力"),
};

/** 效果由 `treasureBlueprintMirror.js` 在计分与 notify 路径镜像右侧槽位 */
/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onTreasureSold(ctx) {
    if (String(ctx?.soldTreasureId ?? "") !== ID) return;
    if (!ctx?.treasureRun) return;
    ctx.treasureRun.soldBlueprintTreasure98 = true;
  },
};
