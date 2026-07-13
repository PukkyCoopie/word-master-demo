import { describe, mult } from "../treasureDescription.js";
import {
  addMultAddBank,
  bankMultAddGain,
  canMutateTreasureBankFromCtx,
  getMultAddBank,
} from "../treasureBankHelpers.js";

const ID = "50";

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildBalanceDescription(ctx) {
  const v = Math.round(getMultAddBank(ctx.treasureRun, ID, ctx));
  const bankLabel = v >= 0 ? `+${v}` : String(v);
  return describe(
    "每拼写一个单词，获得",
    mult("+2"),
    "倍率；每丢弃一次字母，获得",
    mult("-2"),
    "倍率",
    "（当前",
    mult(bankLabel),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe(
    "每拼写一个单词，获得",
    mult("+2"),
    "倍率；每丢弃一次字母，获得",
    mult("-2"),
    "倍率",
    "（当前",
    mult("+0"),
    "）",
  ),
};

/**
 * @param {import('../treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {number} delta
 */
async function bumpBalanceBank(ctx, delta) {
  if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
  addMultAddBank(ctx.treasureRun, ID, delta, ctx);
  await bankMultAddGain(ctx, ID, delta);
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildBalanceDescription,
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID, ctx);
    return v !== 0 ? { multAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    await bumpBalanceBank(ctx, 2);
  },
  async onDiscardBatch(ctx) {
    await bumpBalanceBank(ctx, -2);
  },
};
