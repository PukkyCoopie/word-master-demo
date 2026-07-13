import { describe } from "../treasureDescription.js";
import {
  addScoreAddBank,
  assignOwnedSlotTreasureBank,
  canMutateTreasureBankFromCtx,
  getScoreAddBank,
  playTreasureHookBubbleFx,
} from "../treasureBankHelpers.js";

const ID = "104";
const LEVELS_NEEDED = 2;

export const MIRROR_TREASURE_ID = ID;

/**
 * 镜子卖出复制：优先非镜子；若其余槽位仅有镜子则复制镜子；无其他宝藏则 -1。
 * @param {(object | null | undefined)[]} ownedSlots
 * @param {number} soldSlotIndex 正在卖出的槽位（不计入候选）
 * @param {() => number} [rng]
 * @returns {number}
 */
export function pickMirrorCopySourceSlotIndex(ownedSlots, soldSlotIndex, rng = Math.random) {
  const sold = Math.floor(Number(soldSlotIndex));
  const rnd = typeof rng === "function" ? rng : Math.random;
  /** @type {{ slot: object, index: number }[]} */
  const others = (ownedSlots ?? [])
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot, index }) => slot?.treasureId && index !== sold);
  if (!others.length) return -1;
  const nonMirrors = others.filter(({ slot }) => String(slot.treasureId) !== ID);
  const pool = nonMirrors.length > 0 ? nonMirrors : others;
  return pool[Math.floor(rnd() * pool.length)].index;
}

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
    const n = Math.min(LEVELS_NEEDED, Math.max(0, Math.round(getScoreAddBank(ctx.treasureRun, ID, ctx))));
    return describe(
      "完成2个关卡后，你可以卖出本宝藏以创建一个其他宝藏的原始版复制",
      `（当前${n}/${LEVELS_NEEDED}）`,
    );
  },
  getChargeVisualState(ctx) {
    const n = getScoreAddBank(ctx.treasureRun, ID, ctx);
    return n >= LEVELS_NEEDED ? "active" : "inactive";
  },
  getChargeProgress(ctx) {
    return Math.min(1, getScoreAddBank(ctx.treasureRun, ID, ctx) / LEVELS_NEEDED);
  },
  async onLevelComplete(ctx) {
    if (getScoreAddBank(ctx.treasureRun, ID, ctx) >= LEVELS_NEEDED) return;
    if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
    addScoreAddBank(ctx.treasureRun, ID, 1, ctx);
    const n = Math.min(LEVELS_NEEDED, Math.max(0, Math.round(getScoreAddBank(ctx.treasureRun, ID, ctx))));
    await playTreasureHookBubbleFx(ctx, ID, `${n}/${LEVELS_NEEDED}`, "score");
  },
  async onTreasureSold(ctx) {
    if (ctx.soldTreasureId !== ID) return;
    const soldAccess = {
      slotIndex: ctx.soldSlotIndex,
      ownedTreasureInstances: ctx.ownedTreasureInstances,
      hookCtx: ctx,
    };
    if (getScoreAddBank(ctx.treasureRun, ID, soldAccess) >= LEVELS_NEEDED) {
      ctx.grantRandomTreasureCopy?.(ctx.soldSlotIndex);
    }
    assignOwnedSlotTreasureBank(soldAccess, ID, { scoreAdd: 0 });
  },
};
