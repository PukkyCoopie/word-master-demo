import { describe, mult } from "../treasureDescription.js";
import { getBaseScoreForRarity } from "../../composables/useScoring.js";
import { resolveScoringLetterRarity } from "../../game/treasureRarityTierMerge.js";

export const TREASURE_140_ID = "140";
export const NEWSPAPER_TEMP_TILE_ID = "__newspaper_plural_s__";
export const NEWSPAPER_PLURAL_S_MULT = 20;

/**
 * 提交计分追加链上的当前等效整词：原词 + 已追加的临时 S。
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
export function getSubmitScoringWordForAppend(ctx) {
  const base = String(ctx.resolvedWord ?? "").trim().toLowerCase();
  if (!base) return "";
  const tiles = ctx.tiles ?? [];
  let extra = "";
  for (const t of tiles) {
    if (isNewspaperTempTile(t)) {
      extra += String(t.letter ?? "s").toLowerCase();
    }
  }
  return base + extra;
}

/** @param {import('../treasureTypes.js').TreasureLogicContext} ctx */
export function qualifiesForPluralS(ctx) {
  const w = getSubmitScoringWordForAppend(ctx);
  if (!w) return false;
  const lookup = ctx.getWordDefinition;
  if (typeof lookup !== "function") return false;
  return !!lookup(`${w}s`);
}

/**
 * @param {object | null | undefined} tile
 */
export function isNewspaperTempTile(tile) {
  if (!tile) return false;
  if (tile.isNewspaperTempTile === true) return true;
  const id = String(tile.id ?? "");
  return id === NEWSPAPER_TEMP_TILE_ID || id.startsWith(`${NEWSPAPER_TEMP_TILE_ID}:`);
}

/**
 * @param {object | null | undefined} endingTile
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {number} [appendIndex=0] 本词第几个临时 S（多份报纸链式追加时递增）
 */
export function createNewspaperPluralSTile(
  endingTile,
  ownedSlotTreasureIds,
  rarityLevelsByRarity,
  appendIndex = 0,
) {
  const rarity = endingTile?.rarity ?? "common";
  const scoringRarity = resolveScoringLetterRarity(rarity, ownedSlotTreasureIds ?? []);
  const ix = Math.max(0, Math.floor(Number(appendIndex)) || 0);
  return {
    id: ix === 0 ? NEWSPAPER_TEMP_TILE_ID : `${NEWSPAPER_TEMP_TILE_ID}:${ix}`,
    letter: "s",
    rarity,
    baseScore: getBaseScoreForRarity(scoringRarity, rarityLevelsByRarity),
    letterMultBonus: NEWSPAPER_PLURAL_S_MULT,
    tileScoreBonus: 0,
    materialId: null,
    accessoryId: null,
    isNewspaperTempTile: true,
  };
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
  buildSubmitScoringAppendTile(ctx) {
    if (!qualifiesForPluralS(ctx)) return null;
    const tiles = ctx.tiles ?? [];
    const last = tiles[tiles.length - 1];
    const appendIndex = tiles.filter(isNewspaperTempTile).length;
    return createNewspaperPluralSTile(
      last,
      ctx.ownedSlotTreasureIds,
      ctx.rarityLevelsByRarity,
      appendIndex,
    );
  },
  getSubmitScoringWordLetterCountBonus(ctx) {
    return qualifiesForPluralS(ctx) ? 1 : 0;
  },
};
