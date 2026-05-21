import { describe, mult } from "../treasureDescription.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const JKQ = new Set(["j", "k", "q"]);

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 0,
  rarity: "legendary",
  shopEligible: false,
  description: describe("每张打出的J, Qu, K在计分时提供", mult("x2"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultMulForLetterPart(part) {
    const raw = String(part?.letter ?? "").toLowerCase();
    const ch = raw === "qu" ? "q" : normalizeLetterChar(raw);
    return JKQ.has(ch) ? 2 : 1;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "common", multMul: 2, bubbleLabel: "x2" };
  },
};
