import { describe, mult } from "../treasureDescription.js";

/** @param {import('../treasureTypes.js').TreasureLogicContext} ctx */
function qualifiesForPluralS(ctx) {
  const w = String(ctx.resolvedWord ?? "").trim().toLowerCase();
  if (!w || w.endsWith("s")) return false;
  const lookup = ctx.getWordDefinition;
  if (typeof lookup !== "function") return false;
  return !!lookup(`${w}s`);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "如果拼写的单词末尾可以添加S，则在计分时为其添加一个临时的S，该S会提供",
    mult("+20"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    if (!qualifiesForPluralS(ctx)) return null;
    return { multAdd: 20 };
  },
};
