import { describe, money } from "../treasureDescription.js";

const ID = "27";

/** @param {import('../treasureRunState.js').TreasureRunState | null | undefined} rs @param {number} slotIndex @param {'self' | 'blueprint'} source */
function coin27ContributionKey(rs, slotIndex, source) {
  if (!rs) return "";
  if (!rs.levelCoin27PaidContributions) rs.levelCoin27PaidContributions = new Set();
  return `${Math.floor(Number(slotIndex) || 0)}:${source}`;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("在关卡完成时，如果你没有使用过丢弃，则每个丢弃次数会给予你", money("2")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.levelDiscardsUsed) return;
    const slotIndex = Math.floor(Number(ctx.hookSlotIndex) || 0);
    const source = ctx.hookSource === "blueprint" ? "blueprint" : "self";
    const key = coin27ContributionKey(rs, slotIndex, source);
    if (!key || rs.levelCoin27PaidContributions.has(key)) return;
    const remaining = Math.max(0, Math.floor(Number(ctx.remainingRemovals) || 0));
    if (remaining <= 0) return;
    const amount = remaining * 2;
    // 先占位再播 FX，避免同一贡献并发/重入时 wobble 与 bubble 各触发两次
    rs.levelCoin27PaidContributions.add(key);
    await ctx.playOwnedTreasureMoneyFx?.(ID, amount, { slotIndex });
  },
};
