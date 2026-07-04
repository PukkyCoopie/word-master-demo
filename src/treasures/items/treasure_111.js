import { concept, describe } from "../treasureDescription.js";
import { wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

const ID = "111";
const UPGRADE_FX_DELAY_MS = 300;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  unlockPrerequisite: { type: "everDiscardedFullWord" },
  description: describe("每当你在关卡中第一次弃掉一个完整单词，", concept("升级"), "这个单词对应的长度"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.levelFirstFullWordDiscardDone) return;
    const chars = (ctx.discardedLetters ?? [])
      .map((p) => String(p?.letter ?? "").toLowerCase())
      .join("");
    if (!chars || !ctx.resolveDiscardedWord?.(chars)) return;
    rs.levelFirstFullWordDiscardDone = true;
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength ?? chars.length) || 0));
    if (len < 3 || len > 16) return;

    const wobbleTask = wobbleTreasureHookContributor(ctx, ID);
    const bubbleTask =
      typeof ctx.playOwnedTreasureBubbleOnlyFx === "function"
        ? ctx.playOwnedTreasureBubbleOnlyFx(ID, "升级", "upgrade")
        : Promise.resolve(ctx.playOwnedTreasureBubbleFx?.(ID, "升级", "upgrade"));
    await Promise.all([bubbleTask, wobbleTask]);
    await new Promise((resolve) => setTimeout(resolve, UPGRADE_FX_DELAY_MS));
    if (typeof ctx.runSingleInRunLengthUpgradeFx === "function") {
      await ctx.runSingleInRunLengthUpgradeFx(len);
      return;
    }
    ctx.bumpWordLengthLevel?.(len);
  },
};
