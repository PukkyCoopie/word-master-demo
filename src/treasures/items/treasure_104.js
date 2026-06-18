import { describe } from "../treasureDescription.js";
import { addScoreAddBank, canMutateTreasureBankFromCtx, getScoreAddBank } from "../treasureBankHelpers.js";

const ID = "104";
const LEVELS_NEEDED = 2;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "完成2个关卡后，你可以卖出本宝藏以创建一个其他宝藏的原始版复制",
    "（当前0/2）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const n = Math.min(LEVELS_NEEDED, Math.max(0, Math.round(getScoreAddBank(ctx.treasureRun, ID))));
    return describe(
      "完成2个关卡后，你可以卖出本宝藏以创建一个其他宝藏的原始版复制",
      `（当前${n}/${LEVELS_NEEDED}）`,
    );
  },
  getChargeVisualState(ctx) {
    const n = getScoreAddBank(ctx.treasureRun, ID);
    return n >= LEVELS_NEEDED ? "active" : "inactive";
  },
  getChargeProgress(ctx) {
    return Math.min(1, getScoreAddBank(ctx.treasureRun, ID) / LEVELS_NEEDED);
  },
  async onLevelComplete(ctx) {
    if (getScoreAddBank(ctx.treasureRun, ID) >= LEVELS_NEEDED) return;
    if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
    addScoreAddBank(ctx.treasureRun, ID, 1, ctx);
    const n = Math.min(LEVELS_NEEDED, Math.max(0, Math.round(getScoreAddBank(ctx.treasureRun, ID))));
    await ctx.playOwnedTreasureBubbleFx?.(ID, `${n}/${LEVELS_NEEDED}`, "score");
  },
  async onTreasureSold(ctx) {
    if (ctx.soldTreasureId !== ID) return;
    if (getScoreAddBank(ctx.treasureRun, ID) < LEVELS_NEEDED) return;
    ctx.grantRandomTreasureCopy?.(ctx.soldSlotIndex);
  },
};
