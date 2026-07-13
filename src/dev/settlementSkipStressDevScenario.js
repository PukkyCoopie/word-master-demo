import { ACCESSORY_CROP } from "../accessories/accessoryCatalog.js";
import { IMPLEMENTED_TREASURE_ID_SET, TREASURE_CATALOG } from "../treasures/treasureCatalog.js";
import { getRunLevelIndexForId } from "../levelDefinitions.js";
import { initTreasureBankOnAcquire } from "../treasures/treasureAcquireInit.js";
import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { applyWordToGridTopRow } from "./treasureHookFxDevScenario.js";

export const SETTLEMENT_SKIP_STRESS_DEV_QUERY = "settlementSkipStress";
export const SETTLEMENT_SKIP_STRESS_TREASURE_TARGET = 150;
export const SETTLEMENT_SKIP_STRESS_GRID_WORD = "stressed";

/** 优先重复注入、易触发多拍计分的宝藏 id */
const PRIORITY_TREASURE_IDS = Object.freeze([
  "98",
  "80",
  "130",
  "16",
  "94",
  "59",
  "39",
  "111",
  "32",
  "33",
  "37",
  "25",
  "27",
  "2",
  "5",
]);

/**
 * @param {() => number} [rng]
 */
export function isSettlementSkipStressDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return (
    new URLSearchParams(globalThis.location?.search ?? "").get("dev") ===
    SETTLEMENT_SKIP_STRESS_DEV_QUERY
  );
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 * @param {import('vue').Ref<object> | null | undefined} [treasureRunStateRef]
 */
export function applySettlementSkipStressOwnedTreasures(
  ownedTreasuresRef,
  buildOwnedTreasureSlot,
  treasureRunStateRef,
) {
  const implemented = TREASURE_CATALOG.filter((t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId));
  /** @type {string[]} */
  const idQueue = [];
  for (const tid of PRIORITY_TREASURE_IDS) {
    if (IMPLEMENTED_TREASURE_ID_SET.has(tid)) idQueue.push(tid);
  }
  for (const def of implemented) {
    idQueue.push(def.treasureId);
  }
  while (idQueue.length < SETTLEMENT_SKIP_STRESS_TREASURE_TARGET) {
    idQueue.push(...PRIORITY_TREASURE_IDS.filter((tid) => IMPLEMENTED_TREASURE_ID_SET.has(tid)));
  }

  /** @type {(object | null)[]} */
  const slots = [];
  let cropEvery = 8;
  for (let i = 0; i < SETTLEMENT_SKIP_STRESS_TREASURE_TARGET; i += 1) {
    const treasureId = idQueue[i % idQueue.length];
    const useCrop = i > 0 && i % cropEvery === 0;
    const slot = buildOwnedTreasureSlot({
      treasureId,
      price: 5,
      ...(useCrop ? { treasureAccessoryIds: [ACCESSORY_CROP] } : {}),
    });
    slots.push(slot);
    if (treasureRunStateRef?.value) {
      initTreasureBankOnAcquire(treasureId, treasureRunStateRef.value, slot);
    }
  }
  ownedTreasuresRef.value = slots;
  return { slotCount: slots.length, treasureIds: idQueue.slice(0, SETTLEMENT_SKIP_STRESS_TREASURE_TARGET) };
}

/**
 * @param {{
 *   isEndlessRunRef: import('vue').Ref<boolean>,
 *   levelIndexRef: import('vue').Ref<number>,
 *   runDifficultyIndexRef: import('vue').Ref<number>,
 *   remainingWordsRef: import('vue').Ref<number>,
 *   targetScoreRef: import('vue').Ref<number>,
 * }} refs
 */
export function applySettlementSkipStressRunState(refs) {
  const endlessIdx = getRunLevelIndexForId("9-1");
  refs.isEndlessRunRef.value = true;
  if (endlessIdx != null) refs.levelIndexRef.value = endlessIdx;
  refs.runDifficultyIndexRef.value = 8;
  refs.remainingWordsRef.value = 2;
  refs.targetScoreRef.value = 100;
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 */
export function applySettlementSkipStressGridWord(grid, rows, cols) {
  applyWordToGridTopRow(grid, rows, cols, SETTLEMENT_SKIP_STRESS_GRID_WORD);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const tile = grid?.[r]?.[c];
      if (!tile) continue;
      syncTileStateToDeckCard(tile);
    }
  }
}
