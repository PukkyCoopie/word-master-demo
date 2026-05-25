import { isBossEffectsSuppressedByTreasures } from "./treasureBossSuppress.js";

/** Boss 元音判定（与棋盘 raw 一致） */
export const BOSS_VOWELS = new Set(["a", "e", "i", "o", "u"]);

/**
 * @typedef {{ pillarUsedDeckUids?: Set<number>, verdantTreasureSold?: boolean, ownedSlotTreasureIds?: (string | null | undefined)[] }} BossTileDebuffContext
 */

/** Boss 削弱格：拼词槽内与棋盘上的一切块能力（材质、配饰、棋盘光环等）均不生效。 */
/** @param {{ bossTileDebuffed?: boolean } | null | undefined} tile */
export function isBossTileDebuffed(tile) {
  return tile?.bossTileDebuffed === true;
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

  if (s === "the_plant") {
    tile.bossTileDebuffed = String(tile.rarity ?? "") === "rare";
    return;
  }
  if (s === "the_vowel") {
    const raw = gridTileRawLowerForBoss(tile);
    tile.bossTileDebuffed = !!(raw && BOSS_VOWELS.has(raw));
    return;
  }
  if (s === "the_consonant") {
    const raw = gridTileRawLowerForBoss(tile);
    tile.bossTileDebuffed = !!(raw && !BOSS_VOWELS.has(raw));
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
