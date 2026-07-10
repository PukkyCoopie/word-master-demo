import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { effectiveProbability } from "../treasures/treasureProbability.js";
import { applyWordToGridTopRow } from "./treasureHookFxDevScenario.js";
import { COMET_TREASURE_ID } from "./noSellGoldBombCometDevScenario.js";
import { VOLCANO_TREASURE_ID } from "./volcanoKiteDevScenario.js";
import {
  buildVolcanoCometOwnedTreasureSlots,
  VOLCANO_COMET_DEV_COMET_COUNT,
} from "./volcanoCometDevSlots.js";

export { buildVolcanoCometOwnedTreasureSlots, buildVolcanoCometDevOwnedSlot } from "./volcanoCometDevSlots.js";
export {
  SPARK_TREASURE_ID,
  FLAME_TREASURE_ID,
  VOLCANO_COMET_DEV_COMET_COUNT,
} from "./volcanoCometDevSlots.js";

export const VOLCANO_COMET_DEV_QUERY = "volcanoComet";
export const VOLCANO_COMET_DEV_GRID_WORD = "cat";
export const VOLCANO_ERUPTION_PROB_NUM = 1;
export const VOLCANO_ERUPTION_PROB_DEN = 20;

/**
 * @param {() => number} [rng]
 */
export function isVolcanoCometDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === VOLCANO_COMET_DEV_QUERY;
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyVolcanoCometOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  ownedTreasuresRef.value = buildVolcanoCometOwnedTreasureSlots(buildOwnedTreasureSlot);
}

/**
 * @param {{
 *   remainingWordsRef: import('vue').Ref<number>,
 *   targetScoreRef: import('vue').Ref<number>,
 * }} refs
 */
export function applyVolcanoCometRunState(refs) {
  refs.remainingWordsRef.value = 5;
  refs.targetScoreRef.value = 1;
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 */
export function applyVolcanoCometGridWord(grid, rows, cols) {
  applyWordToGridTopRow(grid, rows, cols, VOLCANO_COMET_DEV_GRID_WORD);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const tile = grid?.[r]?.[c];
      if (!tile) continue;
      syncTileStateToDeckCard(tile);
    }
  }
}

/** @returns {string} */
export function formatVolcanoCometDevEruptionChanceLabel() {
  const ownedIds = [
    ...Array.from({ length: VOLCANO_COMET_DEV_COMET_COUNT }, () => COMET_TREASURE_ID),
    VOLCANO_TREASURE_ID,
  ];
  const p = effectiveProbability(
    VOLCANO_ERUPTION_PROB_NUM,
    VOLCANO_ERUPTION_PROB_DEN,
    ownedIds,
  );
  const pct = Math.round(p * 100);
  return `${VOLCANO_ERUPTION_PROB_NUM}/${VOLCANO_ERUPTION_PROB_DEN} × 2^${VOLCANO_COMET_DEV_COMET_COUNT} = ${pct}%`;
}
