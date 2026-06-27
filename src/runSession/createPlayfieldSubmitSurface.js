import { computed } from "vue";
import {
  buildEffectiveWordPartsForSubmit as buildEffectiveWordPartsForSubmitFromPipeline,
  listEffectiveTilesForSubmit as listEffectiveTilesForSubmitFromPipeline,
} from "../game/submitWordPipeline.js";
import {
  pfFlyingBackBatchesRef,
  pfFlyingLettersRef,
  pfPlayfieldFlyingBackBatchesCount,
  pfPlayfieldFlyingLettersCount,
} from "./gpPlayfieldBridge.js";

/**
 * 提交 snapshot / 有效词解析（assembly 前可用；bind 后飞字状态经 gpPlayfieldBridge 转发）。
 * @param {{
 *   grid: import('vue').Ref<object[][]>,
 *   selectedOrder: import('vue').Ref<{ row: number, col: number }[]>,
 *   selectedTiles: import('vue').Ref<unknown[]>,
 *   COLS: number,
 *   ROWS: number,
 *   flyingLetters: import('vue').Ref<unknown[]>,
 *   flyingBackBatches: import('vue').Ref<unknown[]>,
 *   ownedSlotTreasureIdList: () => string[],
 *   rarityLevelsByRarity: import('vue').Ref<Record<string, number>>,
 *   submitWordResolver: { resolveWordFromEffectiveParts: Function },
 *   bossMechanicsBridge: { buildBossWildcardResolveContext: () => unknown },
 * }} deps
 */
export function createPlayfieldSubmitSurface(deps) {
  const {
    grid,
    selectedOrder,
    selectedTiles,
    COLS,
    ROWS,
    flyingLetters,
    flyingBackBatches,
    ownedSlotTreasureIdList,
    rarityLevelsByRarity,
    submitWordResolver,
    bossMechanicsBridge,
  } = deps;

  /** @param {{ appendTile?: object | null }} [opts] */
  function buildSubmitSelectionSnapshot(opts = {}) {
    const flyingBackRef = pfFlyingBackBatchesRef() ?? flyingBackBatches;
    const flyingRef = pfFlyingLettersRef() ?? flyingLetters;
    return {
      selectedTiles: selectedTiles.value,
      flyingBackBatches: flyingBackRef.value,
      flyingLetters: flyingRef.value,
      grid: grid.value,
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      appendTile: opts.appendTile ?? null,
    };
  }

  /** @returns {{ word: string, vowelAltMask: boolean[] }} */
  function buildEffectiveWordPartsForSubmit(opts = {}) {
    return buildEffectiveWordPartsForSubmitFromPipeline(buildSubmitSelectionSnapshot(opts));
  }

  function buildBossWildcardResolveContext() {
    return bossMechanicsBridge.buildBossWildcardResolveContext();
  }

  function buildWordResolveContext() {
    return {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      rarityLevelsByRarity: rarityLevelsByRarity.value,
      bossResolveContext: buildBossWildcardResolveContext(),
    };
  }

  /** @param {{ word: string, vowelAltMask: boolean[] }} parts */
  function resolveWordFromEffectiveParts(parts) {
    return submitWordResolver.resolveWordFromEffectiveParts(parts, buildWordResolveContext());
  }

  /** @param {object | null | undefined} [extraTile] */
  function listEffectiveTilesForSubmit(extraTile = null) {
    return listEffectiveTilesForSubmitFromPipeline({
      ...buildSubmitSelectionSnapshot(),
      appendTile: extraTile ?? undefined,
    });
  }

  /** 本手词槽 `i` 对应的棋盘真实 tile（用于剪贴板等：与计分动画同步写回角标） */
  function resolveRealSubmitTileForWordSlot(slotIndex, scoringTile = null) {
    const order = selectedOrder.value;
    if (Array.isArray(order) && slotIndex >= 0 && slotIndex < order.length) {
      const pos = order[slotIndex];
      if (pos && typeof pos.row === "number" && typeof pos.col === "number") {
        const t = grid.value[pos.row]?.[pos.col];
        if (t && typeof t === "object") return t;
      }
    }
    const id = scoringTile?.id;
    if (id == null) {
      return null;
    }
    const g = grid.value;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t && t.id === id) return t;
      }
    }
    return null;
  }

  function getPlayfieldFlySnapshot() {
    const fl = pfFlyingLettersRef();
    const fb = pfFlyingBackBatchesRef();
    if (fl && fb) {
      return { flyingLetters: fl.value, flyingBackBatches: fb.value };
    }
    return {
      flyingLetters: flyingLetters.value,
      flyingBackBatches: flyingBackBatches.value,
    };
  }

  function playfieldFlyingLettersCount() {
    return pfPlayfieldFlyingLettersCount(flyingLetters);
  }

  function playfieldFlyingBackBatchesCount() {
    return pfPlayfieldFlyingBackBatchesCount(flyingBackBatches);
  }

  const effectiveWordPartsForSubmit = computed(() => buildEffectiveWordPartsForSubmit());
  const effectiveWordForSubmit = computed(() => effectiveWordPartsForSubmit.value.word);
  const resolvedWordForSubmit = computed(() =>
    resolveWordFromEffectiveParts(effectiveWordPartsForSubmit.value),
  );

  return {
    buildSubmitSelectionSnapshot,
    buildEffectiveWordPartsForSubmit,
    buildBossWildcardResolveContext,
    buildWordResolveContext,
    resolveWordFromEffectiveParts,
    listEffectiveTilesForSubmit,
    resolveRealSubmitTileForWordSlot,
    getPlayfieldFlySnapshot,
    playfieldFlyingLettersCount,
    playfieldFlyingBackBatchesCount,
    effectiveWordPartsForSubmit,
    effectiveWordForSubmit,
    resolvedWordForSubmit,
  };
}
