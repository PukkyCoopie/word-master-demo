import { syncTileStateToDeckCard } from "../game/deckCardSync.js";

export const MASK_TREASURE_ID = "98";
export const BUBBLE_TREASURE_ID = "80";
export const MASK_BUBBLE_DEV_QUERY = "maskBubble";

/**
 * @param {() => number} [rng]
 */
export function isMaskBubbleDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === MASK_BUBBLE_DEV_QUERY;
}

/**
 * 在棋盘上随机挑选若干格改为字母 B（跳过空格、Boss 禁格、万能块）。
 * @param {object[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {() => number} [rng]
 * @param {number} [count]
 */
export function applyRandomBLettersToGrid(grid, rows, cols, rng = Math.random, count = 2) {
  /** @type {{ r: number, c: number }[]} */
  const candidates = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = grid[r]?.[c];
      if (!tile?.letter || tile.bossGridBlocked || tile.isWildcard) continue;
      candidates.push({ r, c });
    }
  }
  const n = Math.min(Math.max(0, Math.floor(Number(count) || 0)), candidates.length);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (let k = 0; k < n; k++) {
    const { r, c } = candidates[k];
    const tile = grid[r][c];
    tile.letter = "B";
    const card = tile._deckCard;
    if (card && typeof card === "object") card.raw = "b";
    syncTileStateToDeckCard(tile);
  }
  return n;
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyMaskBubbleOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  const slots = [...ownedTreasuresRef.value];
  while (slots.length < 2) slots.push(null);
  slots[0] = buildOwnedTreasureSlot({ treasureId: MASK_TREASURE_ID });
  slots[1] = buildOwnedTreasureSlot({ treasureId: BUBBLE_TREASURE_ID });
  ownedTreasuresRef.value = slots;
}
