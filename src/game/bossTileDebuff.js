import { isUndeformedWildcardLetter, isWildcardMaterialTile } from "../composables/useScoring.js";
import { isBossEffectsSuppressedByTreasures } from "./treasureBossSuppress.js";
import {
  isConsonantLetterWithMask,
  isVowelLetterWithMask,
} from "../treasures/treasureLetterClassify.js";

/**
 * @typedef {{ pillarUsedDeckUids?: Set<number>, verdantTreasureSold?: boolean, ownedSlotTreasureIds?: (string | null | undefined)[] }} BossTileDebuffContext
 */

/** Boss 削弱格：拼词槽内与棋盘上的一切块能力（材质、配饰、棋盘光环等）均不生效。 */
/** @param {{ bossTileDebuffed?: boolean } | null | undefined} tile */
export function isBossTileDebuffed(tile) {
  return tile?.bossTileDebuffed === true;
}

/** @param {Record<string, unknown> | null | undefined} tile */
export function isUndeformedWildcardGridTile(tile) {
  if (!tile || !isWildcardMaterialTile(tile)) return false;
  return isUndeformedWildcardLetter(tile.letter);
}

/** 棋盘上仍为 `?` 的万能块不受此类 Boss 削弱；变形入词后再按字母/牌张身份判定。 */
const UNDEF_WILDCARD_EXEMPT_DEBUFF_SLUGS = new Set([
  "the_plant",
  "the_vowel",
  "the_consonant",
  "the_pillar",
]);

/** @param {string} slug */
function isUndeformedWildcardExemptBossSlug(slug) {
  return UNDEF_WILDCARD_EXEMPT_DEBUFF_SLUGS.has(String(slug ?? ""));
}

/** @param {Record<string, unknown> | null | undefined} tile */
export function gridTileRawLowerForBoss(tile) {
  const L = String(tile?.letter ?? "").trim().toLowerCase();
  if (!L) return "";
  return L === "qu" ? "q" : L.charAt(0);
}

/**
 * 按 Boss 规则刷新单格 `bossTileDebuffed`（倒钩等随机削弱不在此处理）。
 * @param {Record<string, unknown>} tile
 * @param {string} slug
 * @param {BossTileDebuffContext} [ctx]
 */
export function applyBossTileDebuffState(tile, slug, ctx = {}) {
  if (!tile || tile.bossGridBlocked) return;
  if (isBossEffectsSuppressedByTreasures(ctx.ownedSlotTreasureIds)) {
    tile.bossTileDebuffed = false;
    return;
  }
  const s = String(slug ?? "");
  if (!s || s === "the_hook") return;
  if (!tile.letter || String(tile.letter).trim() === "") return;
  if (isUndeformedWildcardGridTile(tile) && isUndeformedWildcardExemptBossSlug(s)) {
    tile.bossTileDebuffed = false;
    return;
  }

  if (s === "the_plant") {
    tile.bossTileDebuffed = String(tile.rarity ?? "") === "rare";
    return;
  }
  if (s === "the_vowel") {
    const raw = gridTileRawLowerForBoss(tile);
    tile.bossTileDebuffed = !!(
      raw && isVowelLetterWithMask(raw, ctx.ownedSlotTreasureIds)
    );
    return;
  }
  if (s === "the_consonant") {
    const raw = gridTileRawLowerForBoss(tile);
    tile.bossTileDebuffed = !!(
      raw && isConsonantLetterWithMask(raw, ctx.ownedSlotTreasureIds)
    );
    return;
  }
  if (s === "the_pillar") {
    const uid =
      tile._deckCard && typeof tile._deckCard === "object"
        ? Number(/** @type {{ _dcUid?: number }} */ (tile._deckCard)._dcUid)
        : NaN;
    tile.bossTileDebuffed =
      Number.isFinite(uid) && (ctx.pillarUsedDeckUids?.has(uid) ?? false);
    return;
  }
  if (s === "verdant_leaf") {
    tile.bossTileDebuffed = ctx.verdantTreasureSold !== true;
  }
}

/**
 * 词槽/飞字/详情等展示层：按当前展示字母与稀有度判定 Boss 削弱；
 * 保留格上已有削弱（如倒钩随机标记），并与变形后字母类判定合并。
 * @param {Record<string, unknown>} tile
 * @param {string} slug
 * @param {BossTileDebuffContext} [ctx]
 * @returns {boolean}
 */
export function resolvePresentationBossTileDebuffed(tile, slug, ctx = {}) {
  if (!tile || typeof tile !== "object") return false;
  /** @type {Record<string, unknown>} */
  const probe = { ...tile, bossTileDebuffed: false };
  applyBossTileDebuffState(probe, slug, ctx);
  return probe.bossTileDebuffed === true || tile.bossTileDebuffed === true;
}

/**
 * @param {Record<string, unknown>[][] | null | undefined} grid
 * @param {string} slug
 * @param {BossTileDebuffContext} [ctx]
 * @param {number} [rows]
 * @param {number} [cols]
 */
export function applyBossTileDebuffToGrid(grid, slug, ctx = {}, rows = 4, cols = 4) {
  if (!grid || !slug) return;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r]?.[c];
      if (t) applyBossTileDebuffState(t, slug, ctx);
    }
  }
}
