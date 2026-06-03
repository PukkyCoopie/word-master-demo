import { describe, mult } from "../treasureDescription.js";
import {
  stripEnhancementsFromTileOrDeckCard,
  tileHasScoringEnhancement,
} from "../../game/treasureEnhancementStrip.js";
import { syncTileStateToDeckCard } from "../../game/deckCardSync.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "88";
const MULT_GAIN_PER_STRIP = 0.1;

/** @param {import('../treasureTypes.js').TreasureSubmitAfterLettersContext} ctx @param {number} index @param {object | null | undefined} scoringTile */
function stripSubmitTileAt(ctx, index, scoringTile) {
  const real = ctx.resolveSubmitTileAtIndex?.(index, scoringTile) ?? scoringTile;
  if (real && typeof real === "object") {
    stripEnhancementsFromTileOrDeckCard(real);
    syncTileStateToDeckCard(real);
  }
  if (scoringTile && scoringTile !== real && typeof scoringTile === "object") {
    stripEnhancementsFromTileOrDeckCard(scoringTile);
  }
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "epic",
  description: describe(
    "每当你使用一个带有增强效果的字母，移除它的增强效果，并获得",
    mult("x0.1"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  /** 计分前：每个带增强的提交字母擦除时 +0.1 入银行（与字后 `buildPostLetterStep` 读取的累计倍率一致） */
  prepareSubmitScoringBank(ctx) {
    for (const t of ctx.tiles ?? []) {
      if (!tileHasScoringEnhancement(t)) continue;
      addMultMulBank(ctx.treasureRun, ID, MULT_GAIN_PER_STRIP);
    }
  },
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  async runAfterLettersBeforePostSteps(ctx) {
    const tiles = ctx.submittedScoringTiles;
    if (!Array.isArray(tiles)) return;
    /** @type {number[]} */
    const indices = [];
    for (let i = 0; i < tiles.length; i++) {
      if (tileHasScoringEnhancement(tiles[i])) indices.push(i);
    }
    if (indices.length === 0) return;

    const playStrip = ctx.playSubmitTileEnhancementStripLeave;
    if (!playStrip) {
      for (const i of indices) stripSubmitTileAt(ctx, i, tiles[i]);
      ctx.touchGrid?.();
      return;
    }

    await playStrip({
      treasureId: ID,
      indices,
      slotEls: ctx.getWordSlotEls?.() ?? [],
      gridEls: ctx.getGridTileElsInOrder?.() ?? [],
      stripTileAtIndex: (i) => stripSubmitTileAt(ctx, i, tiles[i]),
    });
  },
};
