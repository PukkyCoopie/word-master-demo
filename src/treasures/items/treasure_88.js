import { describe, mult } from "../treasureDescription.js";
import {
  commitWildcardMorphBeforeEnhancementStrip,
  stripEnhancementsFromTileOrDeckCard,
  submitWordTileHasEnhancement,
} from "../../game/treasureEnhancementStrip.js";
import { syncTileStateToDeckCard } from "../../game/deckCardSync.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "88";
const MULT_GAIN_PER_STRIP = 0.1;

/** @type {{ passId: number, remaining: Set<number> } | null} */
let spongePrepareStripPass = null;

/**
 * 同词多海绵：按栏位从左到右，仅本槽「抢到」的增强字母计入银行（与 `runAfterLetters` 擦除顺序一致）。
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 * @returns {number}
 */
function consumeSpongeStripBankCredits(ctx) {
  const passId = Number(ctx.prepareSubmitBankPassId);
  if (!Number.isFinite(passId)) return 0;
  const tiles = ctx.tiles ?? [];
  if (!Array.isArray(tiles)) return 0;
  if (!spongePrepareStripPass || spongePrepareStripPass.passId !== passId) {
    const remaining = new Set();
    for (let i = 0; i < tiles.length; i++) {
      if (submitWordTileHasEnhancement(ctx, i, tiles[i])) remaining.add(i);
    }
    spongePrepareStripPass = { passId, remaining };
  }
  const count = spongePrepareStripPass.remaining.size;
  spongePrepareStripPass.remaining.clear();
  return count;
}

/** @param {import('../treasureTypes.js').TreasureSubmitAfterLettersContext} ctx @param {number} index @param {object | null | undefined} scoringTile */
function stripSubmitTileAt(ctx, index, scoringTile) {
  const real = ctx.resolveSubmitTileAtIndex?.(index, scoringTile) ?? null;
  /** @type {object[]} */
  const targets = [];
  if (real && typeof real === "object") targets.push(real);
  if (scoringTile && typeof scoringTile === "object" && scoringTile !== real) targets.push(scoringTile);
  for (const t of targets) {
    commitWildcardMorphBeforeEnhancementStrip(t, scoringTile ?? t);
    stripEnhancementsFromTileOrDeckCard(t);
    syncTileStateToDeckCard(t);
  }
  const deckCard = real?._deckCard ?? scoringTile?._deckCard;
  if (deckCard && typeof deckCard === "object" && !targets.includes(deckCard)) {
    stripEnhancementsFromTileOrDeckCard(deckCard);
  }
  const gridTile = real ?? scoringTile;
  if (gridTile && typeof gridTile === "object") {
    ctx.patchGridPlaceholderFreezeFromTile?.(gridTile);
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
  /** 计分前：按栏位顺序仅对本槽实际擦除的增强字母 +0.1 入银行 */
  prepareSubmitScoringBank(ctx) {
    const stripped = consumeSpongeStripBankCredits(ctx);
    if (stripped > 0) {
      addMultMulBank(ctx.treasureRun, ID, MULT_GAIN_PER_STRIP * stripped, ctx);
    }
  },
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
  async runAfterLettersBeforePostSteps(ctx) {
    const tiles = ctx.submittedScoringTiles;
    if (!Array.isArray(tiles)) return;
    /** @type {number[]} */
    const indices = [];
    for (let i = 0; i < tiles.length; i++) {
      if (submitWordTileHasEnhancement(ctx, i, tiles[i])) indices.push(i);
    }
    if (indices.length === 0) return;

    const playStrip =
      ctx.skipSettlementFx === true ? null : ctx.playSubmitTileEnhancementStripLeave;
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
