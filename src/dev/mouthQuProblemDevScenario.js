import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { setLetterQMode } from "../settings/gameSettings.js";

export const MOUTH_TREASURE_ID = "95";
export const TEST_TUBE_TREASURE_ID = "30";
export const MOUTH_QU_PROBLEM_DEV_QUERY = "mouthQuProblem";

/** problem 首行字母（Qu 块 raw=q） */
const PROBLEM_ROW_RAW = Object.freeze(["q", "r", "o", "b", "l", "e", "m"]);

/**
 * @param {() => number} [rng]
 */
export function isMouthQuProblemDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return (
    new URLSearchParams(globalThis.location?.search ?? "").get("dev") === MOUTH_QU_PROBLEM_DEV_QUERY
  );
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyMouthQuProblemOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  const slots = [...ownedTreasuresRef.value];
  while (slots.length < 2) slots.push(null);
  slots[0] = buildOwnedTreasureSlot({ treasureId: MOUTH_TREASURE_ID });
  slots[1] = buildOwnedTreasureSlot({ treasureId: TEST_TUBE_TREASURE_ID });
  ownedTreasuresRef.value = slots;
}

/**
 * 棋盘首行摆 problem（首格 Qu 块），便于 Qu+嘴+试管替换测试。
 * @param {object[][]} grid
 * @param {number} rows
 * @param {number} cols
 */
export function applyProblemQuRowToGrid(grid, rows, cols) {
  setLetterQMode("qu");
  const row = 0;
  for (let c = 0; c < Math.min(PROBLEM_ROW_RAW.length, cols); c += 1) {
    const tile = grid[row]?.[c];
    if (!tile?.letter) continue;
    const raw = PROBLEM_ROW_RAW[c];
    tile.letter = resolveLetterFromRaw(raw);
    const card = tile._deckCard;
    if (card && typeof card === "object") {
      card.raw = raw;
      delete card.vowelDisplayShift;
    }
    syncTileStateToDeckCard(tile);
  }
  void rows;
}
