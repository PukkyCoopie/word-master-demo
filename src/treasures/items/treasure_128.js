import { describe, materialConcept, mult } from "../treasureDescription.js";

/** @param {number} count */
function formatSlotMult(count) {
  const m = 1 + Math.max(0, count) * 0.5;
  const shown = Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/\.?0+$/, "");
  return `x${shown}`;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  unlockPrerequisite: { type: "deckLuckyMin", min: 2 },
  description: describe(
    "每当你成功触发一个",
    materialConcept("lucky"),
    "的效果，获得",
    mult("x0.5"),
    "倍率（当前",
    mult("x1"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.treasureRun?.runLuckyTriggerCount) || 0));
    return describe(
      "每当你成功触发一个",
      materialConcept("lucky"),
      "的效果，获得",
      mult("x0.5"),
      "倍率（当前",
      mult(formatSlotMult(n)),
      "）",
    );
  },
  buildPostLetterStep(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.treasureRun?.runLuckyTriggerCount) || 0));
    if (n <= 0) return null;
    return { multMul: 1 + n * 0.5 };
  },
};
