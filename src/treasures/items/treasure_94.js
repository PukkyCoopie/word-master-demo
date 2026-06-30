import { describe, mult, rarity } from "../treasureDescription.js";
import { isTreasureHookBlueprintMirror } from "../../game/treasureBlueprintMirror.js";
import {
  getActiveRotatingRarityMultStep,
  rollNextRotatingRarityMultIndex,
} from "../../game/treasureRotatingRarityMult.js";

const ID = "94";

/** @param {import('../treasureTypes.js').TreasureLogicContext | import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function activeStep(ctx) {
  return getActiveRotatingRarityMultStep(ctx?.treasureRun);
}

/** @param {number} m */
function formatMultLabel(m) {
  return Number.isInteger(m) ? String(m) : String(m);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "所有普通字母提供",
    mult("x1.25"),
    "倍率",
    "（稀有度和倍率在每关结束时都会变化）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const step = activeStep(ctx);
    const label =
      step.targetRarity === "common"
        ? "普通"
        : step.targetRarity === "rare"
          ? "稀有"
          : step.targetRarity === "legendary"
            ? "传说"
            : "史诗";
    const mStr = formatMultLabel(step.multMul);
    return describe(
      "所有",
      rarity(label),
      "字母提供",
      mult(`x${mStr}`),
      "倍率",
      "（稀有度和倍率在每关结束时都会变化）",
    );
  },
  getLetterRarityMultMulForLetterPart(part, ctx) {
    const step = activeStep(ctx);
    return part?.rarity === step.targetRarity ? step.multMul : 1;
  },
  getLetterRarityMultAnimConfig(ctx) {
    const step = activeStep(ctx);
    const mStr = formatMultLabel(step.multMul);
    return {
      targetRarity: step.targetRarity,
      multMul: step.multMul,
      bubbleLabel: `×${mStr}`,
    };
  },
  onLevelEnter(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    if (rs.rotatingRarityMultIndex == null) rollNextRotatingRarityMultIndex(rs, ctx.rng ?? Math.random);
  },
  async onLevelComplete(ctx) {
    if (isTreasureHookBlueprintMirror(ctx)) return;
    const rs = ctx.treasureRun;
    if (!rs) return;
    rollNextRotatingRarityMultIndex(rs, ctx.rng ?? Math.random);
    await ctx.wobbleOwnedTreasureById?.(ID);
  },
};
