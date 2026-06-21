import { describe, mult } from "../treasureDescription.js";
import {
  commitWildcardMorphBeforeEnhancementStrip,
  stripEnhancementsFromTileOrDeckCard,
  submitScoringTileHasEnhancement,
} from "../../game/treasureEnhancementStrip.js";
import { syncTileStateToDeckCard } from "../../game/deckCardSync.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { isBossDebuffedSubmitTile } from "../treasureScoring.js";

const ID = "88";
const MULT_GAIN_PER_STRIP = 0.1;
/** 本手逐字结算会把持久平面分/倍率写回牌张的宝藏（计分板、回形针、泡泡；非玩家标记折角） */
const INTRINSIC_PERSIST_TREASURE_IDS = new Set(["75", "76", "80"]);

/**
 * @param {import('../treasureTypes.js').TreasureLogicContext | import('../treasureTypes.js').TreasureSubmitAfterLettersContext} ctx
 * @param {number} index
 * @param {object | null | undefined} scoringTile
 */
function spongeSubmitTileCountsAsEnhanced(ctx, index, scoringTile) {
  if (isBossDebuffedSubmitTile(scoringTile)) return false;
  const real = ctx.resolveSubmitTileAtIndex?.(index, scoringTile) ?? null;
  if (submitScoringTileHasEnhancement(scoringTile, real)) return true;
  const owned = new Set((ctx.ownedSlotTreasureIds ?? []).filter(Boolean).map(String));
  for (const tid of INTRINSIC_PERSIST_TREASURE_IDS) {
    if (owned.has(tid)) return true;
  }
  return false;
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
    const tiles = ctx.tiles ?? [];
    for (let i = 0; i < tiles.length; i++) {
      if (!spongeSubmitTileCountsAsEnhanced(ctx, i, tiles[i])) continue;
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
      if (spongeSubmitTileCountsAsEnhanced(ctx, i, tiles[i])) indices.push(i);
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
