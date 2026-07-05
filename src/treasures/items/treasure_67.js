import { describe } from "../treasureDescription.js";
import { isTreasureHookContributionActive } from "../../game/treasureBlueprintMirror.js";
import { addScore, scoreGte } from "../../utils/scoreInteger.js";

const ID = "67";

/**
 * @param {(string | null | undefined)[]} ownedIds
 * @param {string} treasureId
 */
function resolveLeftmostOwnedSlotIndex(ownedIds, treasureId) {
  const id = String(treasureId);
  for (let i = 0; i < (ownedIds?.length ?? 0); i += 1) {
    if (String(ownedIds[i] ?? "") === id) return i;
  }
  return -1;
}

/** @param {import("../treasureTypes.js").TreasureSubmitSuccessContext} ctx */
function shouldGoldMedalTriggerOnSubmit(ctx) {
  const remainingAfter = Math.max(0, Math.floor(Number(ctx.remainingWordsAfterSubmit) ?? -1));
  if (remainingAfter > 0) return false;
  const scoreAfter = addScore(ctx.currentScore, ctx.handFinalScore);
  if (scoreGte(scoreAfter, ctx.targetScore)) return false;
  return true;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("当用尽了拼写次数时，摧毁自身以补充3次"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    if (ctx.hookSource === "blueprint") return;
    if (!shouldGoldMedalTriggerOnSubmit(ctx)) return;

    const snapshotOwned = ctx.ownedSlotTreasureIds ?? [];
    const triggerSlot = resolveLeftmostOwnedSlotIndex(snapshotOwned, ID);
    if (triggerSlot < 0) return;
    if (Math.floor(Number(ctx.hookSlotIndex) ?? -1) !== triggerSlot) return;

    const liveOwned = ctx.getOwnedSlotTreasureIds?.() ?? snapshotOwned;
    if (
      !isTreasureHookContributionActive(liveOwned, {
        slotIndex: triggerSlot,
        treasureId: ID,
        source: "self",
      })
    ) {
      return;
    }
    if (!shouldGoldMedalTriggerOnSubmit(ctx)) return;

    ctx.addRemainingWords?.(3);
    await ctx.destroyTreasureSlotById?.(ID, triggerSlot);
  },
};
