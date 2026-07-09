import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { vowelDisplayLetter } from "../game/vowelNeighborSubstitute.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";

export const MOUTH_TREASURE_ID = "95";
export const MOUTH_TIA_TEA_DEV_QUERY = "mouthTiaTea";

/** 首行 t + e(展示 I) + a，用于嘴邻位 tia→tea 还原 */
const TIA_TEA_ROW_PLAN = Object.freeze([
  { raw: "t" },
  { raw: "e", vowelDisplayShift: 1 },
  { raw: "a" },
]);

/**
 * @param {() => number} [rng]
 */
export function isMouthTiaTeaDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === MOUTH_TIA_TEA_DEV_QUERY;
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyMouthTiaTeaOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  const slots = [...ownedTreasuresRef.value];
  while (slots.length < 1) slots.push(null);
  slots[0] = buildOwnedTreasureSlot({ treasureId: MOUTH_TREASURE_ID });
  ownedTreasuresRef.value = slots;
}

/**
 * @param {object | null | undefined} tile
 * @param {{ raw: string, vowelDisplayShift?: number }} spec
 */
function applyMouthTiaTeaTileSpec(tile, spec) {
  if (!tile?.letter) return;
  const raw = String(spec.raw ?? "").toLowerCase().charAt(0);
  if (!raw) return;
  const shift = Math.sign(Number(spec.vowelDisplayShift) || 0);
  const displayed =
    shift !== 0 ? vowelDisplayLetter(raw, shift, [MOUTH_TREASURE_ID]) : raw;
  tile.letter = resolveLetterFromRaw(displayed);
  const card = tile._deckCard;
  if (card && typeof card === "object") {
    if (shift !== 0) card.vowelDisplayShift = shift;
    else delete card.vowelDisplayShift;
    // 先 sync 再写回自然 raw：sync 会按 tile.letter 覆盖 raw，嘴偏移时须保留牌张自然字母
    syncTileStateToDeckCard(tile);
    card.raw = raw;
  } else {
    syncTileStateToDeckCard(tile);
  }
}

/**
 * 棋盘首行前三格摆 t、e(自然 E、展示 I)、a。
 * @param {object[][]} grid
 * @param {number} rows
 * @param {number} cols
 */
export function applyMouthTiaTeaRowToGrid(grid, rows, cols) {
  const row = 0;
  for (let c = 0; c < Math.min(TIA_TEA_ROW_PLAN.length, cols); c += 1) {
    const tile = grid[row]?.[c];
    if (!tile) continue;
    applyMouthTiaTeaTileSpec(tile, TIA_TEA_ROW_PLAN[c]);
  }
  void rows;
}
