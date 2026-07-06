import { describe, money, prob } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";
import { canMutateTreasureBankFromCtx } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";
import { SCORING_STEP_BEAT_MS } from "../../game/scoreBubbleFx.js";
import { getLevelEndAnimSpeed } from "../../game/levelEndAnimSpeed.js";
import { scoringSleep } from "../../game/submitScoringTiming.js";

const ID = "132";
/** 金钱气泡弹出后、紧接「提升」气泡前的短休（略短于常规记分步间隔） */
const UPGRADE_CHAIN_DELAY_MS = Math.round(SCORING_STEP_BEAT_MS * 0.55);

/** @param {import('../treasureRunState.js').TreasureRunState | null | undefined} rs */
function currentPayout(rs) {
  const v = rs?.banks?.[ID]?.scoreAdd;
  return Math.max(1, Math.floor(Number(v) || 1));
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe(
    "每个关卡完成时使你获得",
    money("1"),
    "，且有",
    prob("1/2"),
    "的概率提升此数值",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const payout = currentPayout(ctx.treasureRun);
    return describe(
      "每个关卡完成时使你获得",
      money(String(payout)),
      "，且有",
      prob("1/2"),
      "的概率提升此数值",
    );
  },
  async onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const slotIndex = resolveTreasureHookAnimSlotIndex(ctx);
    const payout = currentPayout(rs);
    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    const canGrow = canMutateTreasureBankFromCtx(ctx, ID);
    const willUpgrade = canGrow && rollProbabilitySuccess(1, 2, rnd, ctx.ownedSlotTreasureIds);
    await ctx.playOwnedTreasureMoneyFx?.(ID, payout, {
      awaitOutro: !willUpgrade,
      ...(slotIndex != null ? { slotIndex } : {}),
    });
    if (!willUpgrade) return;
    ensureTreasureBank(rs, ID).scoreAdd = payout + 1;
    await scoringSleep(UPGRADE_CHAIN_DELAY_MS, getLevelEndAnimSpeed());
    if (slotIndex != null && ctx.playOwnedTreasureBubbleFxAtSlot) {
      await ctx.playOwnedTreasureBubbleFxAtSlot(slotIndex, "提升", "upgrade");
    } else {
      await ctx.playOwnedTreasureBubbleFx?.(ID, "提升", "upgrade");
    }
  },
};
