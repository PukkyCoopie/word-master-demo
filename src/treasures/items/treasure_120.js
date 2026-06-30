import { describe, money } from "../treasureDescription.js";

export const TREASURE_120_ID = "120";
const ID = TREASURE_120_ID;
const MONEY_AWARD = 3;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "每个关卡的第一次丢弃如果仅弃掉了1个字母，从字母库中移除它并获得",
    money("3"),
  ),
};

/**
 * 弃牌消失前判定：本关首次且仅 1 字时是否走「移除」动效（与菜刀提交路径一致）。
 * @param {Pick<import('../treasureTypes.js').TreasureDiscardContext, 'treasureRun' | 'letterCount' | 'discardedDeckCardUids' | 'ownedSlotTreasureIds'>} ctx
 * @returns {{ proc: false } | { proc: true, deckUid: number, moneyAmount: number }}
 */
export function resolvePistolDiscardBatchPlan(ctx) {
  const rs = ctx.treasureRun;
  if (!rs || rs.levelFirstDiscardBatchDone) return { proc: false };
  const owned = (ctx.ownedSlotTreasureIds ?? []).some((tid) => String(tid ?? "") === ID);
  if (!owned || ctx.letterCount !== 1) return { proc: false };
  const uid = ctx.discardedDeckCardUids?.[0];
  if (uid == null) return { proc: false };
  return { proc: true, deckUid: uid, moneyAmount: MONEY_AWARD };
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onDiscardBatch(ctx) {
    if (ctx.discardPistolFxHandled) return;
    const rs = ctx.treasureRun;
    if (!rs || rs.levelFirstDiscardBatchDone) return;
    rs.levelFirstDiscardBatchDone = true;
    if (ctx.letterCount !== 1) return;

    const uid = ctx.discardedDeckCardUids?.[0];
    if (uid == null) return;
    if (!ctx.removeDeckCardByUid?.(uid, { clearGrid: false })) return;

    await ctx.playOwnedTreasureMoneyFx?.(ID, MONEY_AWARD);
  },
};
