import { describe, mult } from "../treasureDescription.js";
import {
  addMultMulBank,
  getMultMulBank,
  playBankMultMulGainFx,
} from "../treasureBankHelpers.js";

export const TREASURE_89_ID = "89";
const ID = TREASURE_89_ID;
const INBOX_LETTER_MULT_INCREMENT = 0.25;
const INBOX_LETTER_BUBBLE = "×0.25";

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildInboxDescription(ctx) {
  const m = getMultMulBank(ctx.treasureRun, ID);
  const shown = Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/\.?0+$/, "");
  return describe(
    "每当一个字母被加入你的牌库，获得",
    mult("x0.25"),
    "倍率",
    "（当前",
    mult(`x${shown || "1"}`),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "common",
  description: describe(
    "每当一个字母被加入你的牌库，获得",
    mult("x0.25"),
    "倍率",
    "（当前",
    mult("x1"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildInboxDescription,
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  async onDeckCardsAdded(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.count) || 0));
    if (n <= 0 || !ctx.treasureRun) return;
    for (let i = 0; i < n; i += 1) {
      addMultMulBank(ctx.treasureRun, ID, INBOX_LETTER_MULT_INCREMENT);
      await playBankMultMulGainFx(ctx, ID, INBOX_LETTER_BUBBLE);
    }
  },
};
