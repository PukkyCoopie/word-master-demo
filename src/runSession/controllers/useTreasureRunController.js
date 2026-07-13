import { computed, markRaw, ref, watch } from "vue";
import { useTreasureSlotReorder } from "../../composables/useTreasureSlotReorder.js";
import { readTreasureAccessoryIds } from "../../accessories/accessoryState.js";
import {
  applyFlipAndShuffleToOwnedTreasures,
  captureAmberBossTreasureSnapshot,
  restoreAmberBossTreasureLayout,
  AMBER_BOSS_SLUG,
} from "../../game/bossAmberAcornTreasures.js";
import { TREASURE_BAR_VISIBLE_MAX } from "../../game/treasureBarLayout.js";
import { packPickOptionKeyOf } from "../../game/inRunGrantFlow.js";
import {
  createPreviewNavGroupFromItems,
  previewNavIndex,
  previewNavTotal,
  stepPreviewNavGroup,
} from "../../preview/previewGroupNav.js";
import { ensureBigramTargetPair, rollRandomBigramFromDictionary } from "../../game/treasureBigramRoll.js";
import { applyDisabledTreasureSlots } from "../../game/bossMechanicsContext.js";
import { getPresetTreasureSlotDelta } from "../../game/runPresetRuntime.js";
import {
  applyTreasureAcquireImmediateEffects,
  initTreasureBankOnAcquire,
} from "../../treasures/treasureAcquireInit.js";
import { normalizeTreasureDescription } from "../../treasures/treasureDescription.js";
import { buildOwnedTreasureSlot, computeOwnedTreasureSellRefund } from "../../treasures/ownedTreasureSlot.js";
import {
  canAcquireTreasureOffer,
  compactOwnedTreasureSlotsAtIndex,
  computeOwnedTreasureSlotTargetLength,
  nextUniqueOwnedTreasureSlotKey,
  reconcileOwnedTreasureSlotsAfterDestruction,
  willIncomingTreasureAccessoriesExpandSlots,
} from "../../game/treasureSlotCapacity.js";
import { parseChapterFromLevelId } from "../../treasures/treasureLifecycleShared.js";
import { resetTreasureLevelScopedState } from "../../treasures/treasureRunState.js";
import { runLevelEndPreSettlementFx as runLevelEndPreSettlementSequence } from "../../game/levelEndTreasureFx.js";
import {
  shouldSkipSettlementAnim,
  setLevelEndSettlementSkipActive,
} from "../../settings/settlementAnimSkip.js";
import {
  TREASURE_HOOKS_BY_ID,
  notifyOwnedTreasuresOnBossRestrictionTriggered,
  notifyOwnedTreasuresOnChapterEnter,
  notifyOwnedTreasuresOnDeckCardsAdded,
  notifyOwnedTreasuresOnDeckCardsRemoved,
  notifyOwnedTreasuresOnIceBreak,
  notifyOwnedTreasuresOnLevelComplete,
  notifyOwnedTreasuresOnLevelEnter,
  notifyOwnedTreasuresOnShopLeave,
  notifyOwnedTreasuresOnTreasureSold,
  notifyOwnedTreasuresOnWordDefinitionOpenAttempt,
  notifyOwnedTreasuresPrepareLevelEnter,
  notifyOwnedTreasuresSuccessfulWordSubmit,
  resolveTreasureChargeProgress,
  resolveTreasureChargeVisualState,
  resolveTreasureEffectDepleted,
  resolveTreasureDescriptionPatches,
  treasureDescriptionPatchReplacesBase,
} from "../../treasures/treasureRegistry.js";
import { countProbabilityDoublerContributions } from "../../treasures/treasureProbability.js";
import { isVowelLetterWithMask } from "../../treasures/treasureLetterClassify.js";
import {
  beginLevelLegendaryDeckTracking,
  checkLevelLegendaryDeckExhaustedUnlock,
  noteEverTwoTreasuresWithAccessoryUnlocked,
  onTreasureRunChapterEnter,
  recordTreasureRunDeckCardsAdded,
} from "../../treasures/treasureRunTracking.js";
import { getOwnedTreasureSlotBonusFromVouchers, parseLevelSubFromId } from "../../vouchers/voucherRuntime.js";

/**
 * 宝藏栏失效/充能 UI 依赖槽位 bank 与配饰的就地 mutation；显式追踪以便 computed 重算。
 * @param {import('../../treasures/treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {(object | null | undefined)[]} instances
 */
function trackOwnedTreasureBarVisualDeps(runState, instances) {
  void runState?.ownedSlotBankRevision;
  if (!Array.isArray(instances)) return;
  for (const slot of instances) {
    if (!slot || typeof slot !== "object") continue;
    void slot.treasureAccessoryExpired;
    void slot.hourglassStagesElapsed;
    const bank = slot.bank;
    if (bank && typeof bank === "object") {
      void bank.multAdd;
      void bank.multMul;
      void bank.scoreAdd;
      void bank.posPackProgress;
    }
  }
}

/** @typedef {import('../runSessionTypes.js').TreasureRunController} TreasureRunController */

/**
 * @typedef {Object} TreasureRunControllerOptions
 * @property {{
 *   ownedTreasures: import('vue').Ref<(object | null)[]>,
 *   treasureRunState: import('vue').Ref<object>,
 *   ownedVoucherIds: import('vue').Ref<string[]>,
 *   runPresetId: import('vue').Ref<string>,
 *   money: import('vue').Ref<number>,
 *   runRandom: () => number,
 *   isEndlessRun: import('vue').Ref<boolean>,
 * }} run
 * @property {{
 *   basketballWordsSubmitted: import('vue').Ref<number>,
 *   currentScore: import('vue').Ref<number>,
 *   targetScore: import('vue').Ref<number>,
 *   deckCount: import('vue').Ref<number>,
 *   initialDeckSnapshot: import('vue').Ref<object[]>,
 *   deck: import('vue').Ref<object[]>,
 *   bumpBasketballWordSubmitted: () => void,
 *   appendShopDeckEntries: (entries: object[]) => object[],
 *   appendDeckCardSpecToInitialSnapshot: (spec: object) => object | null,
 *   removeDeckLetterInstancesByRaws: (raws: string[]) => void,
 * }} grid
 * @property {{
 *   transitionBusy: import('vue').Ref<boolean>,
 *   getShowShop: () => boolean,
 *   isRunFlowOverlayOpen: () => boolean,
 * }} phase
 * @property {{
 *   getSlotElement: (index: number) => HTMLElement | null | undefined,
 *   getOverlayContainer: () => HTMLElement | null | undefined,
 *   getStackMode: () => boolean,
 * }} reorderDom
 * @property {{
 *   noteCollectionTreasureAcquired: (treasureId: string) => void,
 *   noteCollectionTreasureSlotAccessories: (input: object) => void,
 *   noteCollectionDeckEntryModifiers: (entry: object) => void,
 *   flushDeckMultisetAchievements: () => void,
 * }} collection
 * @property {() => void} scheduleRunAutoSave
 * @property {(kind: string) => void} triggerHaptic
 * @property {(raws: string[]) => Promise<void>} [notifyTreasureDeckCardsRemovedByRaws]
 * @property {import('vue').Ref<object | null>} [amberBossTreasureSnapshot]
 * @property {import('vue').Ref<object | null>} [sharedTreasureDetail] 与壳层 pause / spell 共用的详情 ref
 * @property {{
 *   getCandidateWordsByLength: (len: number) => string[],
 *   ownedTreasureHookFxBridge: () => object,
 *   scheduleAfterGridTilesSettled: (fn: () => void | Promise<void>) => void,
 *   buildLevelResetRunOpts: (levelDef: object) => object,
 *   resetLevel: (levelDef: object, opts: object) => void,
 *   syncPlayerMarkBatchCounterFromGrid: () => void,
 *   resolveBossSlugForMechanics: (slug: string, ownedIds: (string | null)[]) => string,
 *   bossMechanicsSuppressed: import('vue').ComputedRef<boolean>,
 *   isBossLevelEnterRestrictionSlug: (slug: string) => boolean,
 *   getBossSlugForMechanics: () => string,
 *   notifyBossRestrictionTreasures: (slug?: string) => Promise<void>,
 *   addRemainingRemovalsClamped: (n: number) => void,
 *   openRunEndDiscoveryTreasurePreview: (item: object, originRect: object | null, nav: object) => void,
 *   buildTreasureSubmitSuccessContextExtras: (tiles: object[], resolvedWord: string, judgedLenTable: number, scoreBeforeHand: number, handFinalScore: number) => object,
 *   buildTreasureLevelEnterEffectContextExtras: (levelId: string) => object,
 *   buildTreasureLevelCompleteContextExtras: () => object,
 *   playOwnedTreasureMoneyFx: (...args: unknown[]) => unknown,
 * }} hooks
 */

/**
 * 宝藏局内调度：notify 钩子、充能条、详情 mode、栏位重排（任务 6.1）。
 *
 * @param {TreasureRunControllerOptions} options
 * @returns {TreasureRunController}
 */
export function useTreasureRunController(options) {
  const { run, grid, phase, reorderDom, collection, scheduleRunAutoSave, triggerHaptic, hooks } = options;
  const { ownedTreasures, treasureRunState, ownedVoucherIds, runPresetId, money, runRandom, isEndlessRun } = run;
  const { transitionBusy, getShowShop, isRunFlowOverlayOpen } = phase;
  const amberBossTreasureSnapshot = options.amberBossTreasureSnapshot ?? ref(null);

  function ownedSlotTreasureIdList() {
    return ownedTreasures.value.map((s) => s?.treasureId ?? null);
  }

  function findOwnedTreasureSlotIndex(treasureId) {
    const tid = String(treasureId ?? "").trim();
    if (!tid) return -1;
    return ownedTreasures.value.findIndex((s) => String(s?.treasureId ?? "").trim() === tid);
  }

  /** @param {string} treasureId @returns {number[]} */
  function findAllOwnedTreasureSlotIndices(treasureId) {
    const tid = String(treasureId ?? "").trim();
    if (!tid) return [];
    /** @type {number[]} */
    const indices = [];
    ownedTreasures.value.forEach((s, i) => {
      if (String(s?.treasureId ?? "").trim() === tid) indices.push(i);
    });
    return indices;
  }

  function treasureVoucherExtraSlots() {
    return getOwnedTreasureSlotBonusFromVouchers(ownedVoucherIds.value);
  }

  /** 券 + 预设对栏位上限的加减（如挂钩 +1、三角尺 -1） */
  function treasureSlotCapacityExtra() {
    return treasureVoucherExtraSlots() + getPresetTreasureSlotDelta(runPresetId.value);
  }

  function syncOwnedTreasureSlots() {
    const arr = ownedTreasures.value;
    const target = computeOwnedTreasureSlotTargetLength(arr, treasureSlotCapacityExtra());
    const next = [...arr];
    while (next.length < target) next.push(null);
    while (next.length > target && next[next.length - 1] == null) next.pop();
    let keys = [...gameOwnedKeyOrder.value];
    while (keys.length < next.length) keys.push(nextUniqueOwnedTreasureSlotKey(keys));
    while (keys.length > next.length) keys.pop();
    const keysSame =
      keys.length === gameOwnedKeyOrder.value.length && keys.every((k, i) => k === gameOwnedKeyOrder.value[i]);
    const arrSame = next.length === arr.length && next.every((v, i) => v === arr[i]);
    if (!arrSame) ownedTreasures.value = next;
    if (!keysSame) gameOwnedKeyOrder.value = keys;
  }

  const gameOwnedKeyOrder = ref(ownedTreasures.value.map((_, i) => `g-slot-${i}`));
  /** markRaw：经 sessionReactive 传给子组件时，避免嵌套 ref 被解包成普通数组 */
  const gameOwnedKeyOrderBag = markRaw({ ref: gameOwnedKeyOrder });

  watch(
    ownedTreasures,
    () => {
      syncOwnedTreasureSlots();
    },
    { deep: true },
  );

  watch(
    ownedVoucherIds,
    () => {
      syncOwnedTreasureSlots();
    },
    { deep: true },
  );

  watch(runPresetId, () => {
    syncOwnedTreasureSlots();
  });

  syncOwnedTreasureSlots();

  const {
    dragActive: gameOwnedDragActive,
    dragGhostVisible: gameOwnedDragGhostVisible,
    dragPlaceholderVisible: gameOwnedDragPlaceholderVisible,
    dragSourceIndex: gameOwnedDragSourceIndex,
    dragMoved: gameOwnedDragMoved,
    dragTreasure: gameOwnedDragTreasure,
    dragGhostStyle: gameOwnedDragGhostStyle,
    dragPlaceholderStyle: gameOwnedDragPlaceholderStyle,
    displaySlots: displayOwnedTreasures,
    displayKeys: displayOwnedTreasureKeys,
    onSlotPointerDown: onGameOwnedSlotPointerDown,
  } = useTreasureSlotReorder({
    getSourceSlots: () => ownedTreasures.value,
    keyOrder: gameOwnedKeyOrder,
    canDrag: () => !transitionBusy.value && !getShowShop() && !isRunFlowOverlayOpen(),
    onCommit: (preview) => {
      ownedTreasures.value = [...preview];
      scheduleRunAutoSave();
    },
    getSlotElement: reorderDom.getSlotElement,
    getOverlayContainer: reorderDom.getOverlayContainer,
    stackMode: reorderDom.getStackMode,
    visibleSlotMax: TREASURE_BAR_VISIBLE_MAX,
  });

  /** @type {import('vue').Ref<object | null>} */
  const treasureDetail = options.sharedTreasureDetail ?? ref(null);

  /** @param {NonNullable<typeof treasureDetail.value>} detail */
  function presentTreasureDetail(detail) {
    triggerHaptic("previewOpen");
    treasureDetail.value = detail;
  }

  function buildShopOwnedPreviewNavItems() {
    return ownedTreasures.value
      .map((treasure, index) => (treasure ? { index, treasure } : null))
      .filter(Boolean);
  }

  const treasureDetailPreviewNavTotal = computed(() => previewNavTotal(treasureDetail.value?.previewNav));
  const treasureDetailPreviewNavIndex = computed(() => previewNavIndex(treasureDetail.value?.previewNav));

  const treasureDetailMode = computed(() => {
    const d = treasureDetail.value;
    if (!d) return "offer";
    if (d.kind === "pack-inner") return "pack-inner";
    if (d.kind === "voucher-owned") return "voucher-owned";
    if (d.kind === "offer") return "offer";
    return getShowShop() ? "owned-shop" : "owned-game";
  });

  function rollRandomBigramForTreasure() {
    return rollRandomBigramFromDictionary(hooks.getCandidateWordsByLength, runRandom);
  }

  function buildTreasurePatchDescriptionContext() {
    ensureBigramTargetPair(treasureRunState.value, rollRandomBigramForTreasure);
    const detail = treasureDetail.value;
    const instances = ownedTreasures.value;
    let slotIndex =
      detail && typeof detail.slotIndex === "number" && Number.isFinite(detail.slotIndex)
        ? Math.floor(detail.slotIndex)
        : undefined;
    if (detail?.treasure && Array.isArray(instances)) {
      const physical = instances.indexOf(detail.treasure);
      if (physical >= 0) slotIndex = physical;
    }
    return {
      treasureRun: treasureRunState.value,
      fullDeck: grid.initialDeckSnapshot.value,
      levelPosTargetKey: treasureRunState.value.levelPosTargetKey,
      rollRandomBigram: rollRandomBigramForTreasure,
      rng: runRandom,
      money: money.value,
      ownedSlotTreasureIds: instances.map((s) => s?.treasureId ?? null),
      ownedTreasureInstances: instances,
      ...(slotIndex != null ? { slotIndex } : {}),
    };
  }

  const treasureDetailDescriptionOverride = computed(() => {
    const d = treasureDetail.value;
    if (!d?.treasure) return null;
    const tid = d.treasure.treasureId;
    const base = normalizeTreasureDescription(d.treasure.description);
    const patch = resolveTreasureDescriptionPatches(tid, buildTreasurePatchDescriptionContext());
    const replacesBase = treasureDescriptionPatchReplacesBase(tid);
    const parts =
      replacesBase && patch?.length ? [...patch] : [...base, ...(patch?.length ? patch : [])];
    if (d.kind !== "offer") {
      const extra = TREASURE_HOOKS_BY_ID.get(tid)?.buildOwnedDetailDescriptionSegments?.({
        chargeWordsSubmitted: grid.basketballWordsSubmitted.value,
        ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null),
        remainingDeckCount: grid.deckCount.value,
      });
      if (extra?.length) parts.push(...extra);
    }
    if (replacesBase && patch?.length) return parts;
    return parts.length > base.length ? parts : null;
  });

  const treasureDetailSpellReplayTargetId = computed(() => {
    const d = treasureDetail.value;
    if (!d?.treasure || d.kind !== "owned") return null;
    const tid = String(d.treasure.treasureId ?? "");
    return (
      TREASURE_HOOKS_BY_ID.get(tid)?.getOwnedDetailSpellReplayTargetId?.({
        treasureRun: treasureRunState.value,
      }) ?? null
    );
  });

  const treasureChargeVisualBySlot = computed(() => {
    const runState = treasureRunState.value;
    const instances = ownedTreasures.value;
    return instances.map((s, slotIndex) =>
      s?.treasureId
        ? resolveTreasureChargeVisualState(
            s.treasureId,
            grid.basketballWordsSubmitted.value,
            runState,
            s,
            slotIndex,
            instances,
          )
        : null,
    );
  });

  const treasureChargeProgressBySlot = computed(() => {
    const runState = treasureRunState.value;
    const instances = ownedTreasures.value;
    return instances.map((s, slotIndex) =>
      s?.treasureId
        ? resolveTreasureChargeProgress(
            s.treasureId,
            grid.basketballWordsSubmitted.value,
            runState,
            s,
            slotIndex,
            instances,
          )
        : 0,
    );
  });

  const treasureEffectDepletedBySlot = computed(() => {
    const runState = treasureRunState.value;
    const instances = ownedTreasures.value;
    trackOwnedTreasureBarVisualDeps(runState, instances);
    return instances.map((s, slotIndex) =>
      s?.treasureId
        ? resolveTreasureEffectDepleted(
            s.treasureId,
            grid.basketballWordsSubmitted.value,
            runState,
            s,
            slotIndex,
            instances,
          )
        : false,
    );
  });

  const treasureDetailChargeVisualState = computed(() => {
    const d = treasureDetail.value;
    if (!d || d.kind !== "owned") return null;
    const instances = ownedTreasures.value;
    const physical = d.treasure ? instances.indexOf(d.treasure) : -1;
    const i =
      physical >= 0
        ? physical
        : typeof d.slotIndex === "number" && Number.isFinite(d.slotIndex)
          ? Math.floor(d.slotIndex)
          : -1;
    if (!Number.isInteger(i) || i < 0) return null;
    return treasureChargeVisualBySlot.value[i] ?? null;
  });

  const treasureDetailChargeProgress = computed(() => {
    const d = treasureDetail.value;
    if (!d || d.kind !== "owned") return 0;
    const instances = ownedTreasures.value;
    const physical = d.treasure ? instances.indexOf(d.treasure) : -1;
    const i =
      physical >= 0
        ? physical
        : typeof d.slotIndex === "number" && Number.isFinite(d.slotIndex)
          ? Math.floor(d.slotIndex)
          : -1;
    if (!Number.isInteger(i) || i < 0) return 0;
    return treasureChargeProgressBySlot.value[i] ?? 0;
  });

  const treasureDetailEffectDepleted = computed(() => {
    const d = treasureDetail.value;
    if (!d || d.kind !== "owned") return false;
    const instances = ownedTreasures.value;
    const physical = d.treasure ? instances.indexOf(d.treasure) : -1;
    const i =
      physical >= 0
        ? physical
        : typeof d.slotIndex === "number" && Number.isFinite(d.slotIndex)
          ? Math.floor(d.slotIndex)
          : -1;
    if (!Number.isInteger(i) || i < 0) return false;
    return treasureEffectDepletedBySlot.value[i] === true;
  });

  const gameOwnedDragChargeState = computed(() => {
    const treasure = gameOwnedDragTreasure.value;
    const slotIndex = gameOwnedDragSourceIndex.value;
    if (!treasure?.treasureId || slotIndex < 0) return null;
    return resolveTreasureChargeVisualState(
      treasure.treasureId,
      grid.basketballWordsSubmitted.value,
      treasureRunState.value,
      treasure,
      slotIndex,
      ownedTreasures.value,
    );
  });

  const gameOwnedDragChargeProgress = computed(() => {
    const treasure = gameOwnedDragTreasure.value;
    const slotIndex = gameOwnedDragSourceIndex.value;
    if (!treasure?.treasureId || slotIndex < 0) return 0;
    return resolveTreasureChargeProgress(
      treasure.treasureId,
      grid.basketballWordsSubmitted.value,
      treasureRunState.value,
      treasure,
      slotIndex,
      ownedTreasures.value,
    );
  });

  const gameOwnedDragEffectDepleted = computed(() => {
    const treasure = gameOwnedDragTreasure.value;
    const slotIndex = gameOwnedDragSourceIndex.value;
    if (!treasure?.treasureId || slotIndex < 0) return false;
    return resolveTreasureEffectDepleted(
      treasure.treasureId,
      grid.basketballWordsSubmitted.value,
      treasureRunState.value,
      treasure,
      slotIndex,
      ownedTreasures.value,
    );
  });

  const displayTreasureChargeVisualBySlot = computed(() => {
    const runState = treasureRunState.value;
    const instances = ownedTreasures.value;
    return displayOwnedTreasures.value.map((s) => {
      if (!s?.treasureId) return null;
      const physicalIndex = instances.indexOf(s);
      return resolveTreasureChargeVisualState(
        s.treasureId,
        grid.basketballWordsSubmitted.value,
        runState,
        s,
        physicalIndex >= 0 ? physicalIndex : null,
        instances,
      );
    });
  });

  const displayTreasureChargeProgressBySlot = computed(() => {
    const runState = treasureRunState.value;
    const instances = ownedTreasures.value;
    return displayOwnedTreasures.value.map((s) => {
      if (!s?.treasureId) return 0;
      const physicalIndex = instances.indexOf(s);
      return resolveTreasureChargeProgress(
        s.treasureId,
        grid.basketballWordsSubmitted.value,
        runState,
        s,
        physicalIndex >= 0 ? physicalIndex : null,
        instances,
      );
    });
  });

  const displayTreasureEffectDepletedBySlot = computed(() => {
    const runState = treasureRunState.value;
    const instances = ownedTreasures.value;
    trackOwnedTreasureBarVisualDeps(runState, instances);
    return displayOwnedTreasures.value.map((s) => {
      if (!s?.treasureId) return false;
      const physicalIndex = instances.indexOf(s);
      return resolveTreasureEffectDepleted(
        s.treasureId,
        grid.basketballWordsSubmitted.value,
        runState,
        s,
        physicalIndex >= 0 ? physicalIndex : null,
        instances,
      );
    });
  });

  const treasureSellRefund = computed(() => {
    const d = treasureDetail.value;
    if (!d || d.kind !== "owned" || !d.treasure) return 0;
    return computeOwnedTreasureSellRefund(d.treasure);
  });

  const treasureProbabilityDoublerCount = computed(() =>
    countProbabilityDoublerContributions(ownedSlotTreasureIdList()),
  );

  /** @param {NonNullable<typeof treasureDetail.value>} d @param {object} nav */
  function applyTreasureDetailAtPreviewNav(d, nav) {
    if (nav.kind === "run-end-treasure") {
      hooks.openRunEndDiscoveryTreasurePreview(nav.items[nav.index], null, nav);
      return;
    }
    const kind = d.kind;
    if (kind === "offer") {
      treasureDetail.value = {
        ...d,
        treasure: nav.items[nav.index],
        originRect: null,
        previewNav: nav,
      };
      return;
    }
    if (kind === "owned") {
      const slot = /** @type {{ index: number, treasure: object }} */ (nav.items[nav.index]);
      treasureDetail.value = {
        ...d,
        slotIndex: slot.index,
        treasure: slot.treasure,
        originRect: null,
        previewNav: nav,
      };
      return;
    }
    if (kind === "pack-inner") {
      const item = nav.items[nav.index];
      treasureDetail.value = {
        ...d,
        treasure: item,
        packOptionKey: packPickOptionKeyOf(item),
        originRect: null,
        previewNav: nav,
      };
    }
  }

  /** @param {number} delta */
  function onTreasurePreviewNav(delta) {
    const d = treasureDetail.value;
    if (!d?.previewNav) return;
    const nav = stepPreviewNavGroup(d.previewNav, delta);
    if (!nav || nav.index === d.previewNav.index) return;
    applyTreasureDetailAtPreviewNav(d, nav);
  }

  /** @param {(object | null)[]} preview @param {string[]} keys */
  function onTreasureCollectionReorder(preview, keys) {
    ownedTreasures.value = [...preview];
    if (Array.isArray(keys)) gameOwnedKeyOrder.value = keys;
    scheduleRunAutoSave();
  }

  /**
   * @param {number} ix
   * @param {import('../../treasures/ownedTreasureSlot.js').OwnedTreasureSlotPersisted | Record<string, unknown>} input
   */
  function grantOwnedTreasureAt(ix, input) {
    ownedTreasures.value[ix] = buildOwnedTreasureSlot(input);
    const slot = ownedTreasures.value[ix];
    initTreasureBankOnAcquire(String(input?.treasureId ?? ""), treasureRunState.value, slot);
    collection.noteCollectionTreasureAcquired(String(input?.treasureId ?? ""));
    collection.noteCollectionTreasureSlotAccessories(input);
    noteEverTwoTreasuresWithAccessoryUnlocked(treasureRunState.value, ownedTreasures.value);
  }

  function applyTreasureAcquireImmediateEffectsForRun(treasureId) {
    applyTreasureAcquireImmediateEffects(treasureId, {
      addRemainingRemovals: hooks.addRemainingRemovalsClamped,
      treasureRun: treasureRunState.value,
    });
  }

  /** @param {{ treasureAccessoryId?: string | null, treasureAccessoryIds?: string[] } | null | undefined} offer */
  function canPlaceTreasureOffer(offer) {
    return canAcquireTreasureOffer(
      ownedTreasures.value,
      treasureSlotCapacityExtra(),
      readTreasureAccessoryIds(offer),
    );
  }

  /** @param {{ treasureAccessoryId?: string | null } | null | undefined} offer */
  function findTreasurePlacementIndex(offer) {
    const slots = ownedTreasures.value;
    const ix = slots.findIndex((s) => s == null);
    if (ix >= 0) return ix;
    if (willIncomingTreasureAccessoriesExpandSlots(slots, treasureSlotCapacityExtra(), readTreasureAccessoryIds(offer))) {
      const next = [...slots, null];
      ownedTreasures.value = next;
      const keys = [...gameOwnedKeyOrder.value];
      while (keys.length < next.length) keys.push(nextUniqueOwnedTreasureSlotKey(keys));
      gameOwnedKeyOrder.value = keys;
      return next.length - 1;
    }
    return -1;
  }

  function buildTreasurePoolSnapshot() {
    return {
      deck: grid.deck.value,
      isEndlessRun: isEndlessRun.value,
      runState: treasureRunState.value,
      ownedTreasureSlots: ownedTreasures.value,
    };
  }

  async function notifyTreasureDeckCardsRemovedByRaws(raws) {
    const slots = ownedSlotTreasureIdList();
    let vowelsRemoved = 0;
    for (const raw0 of raws ?? []) {
      let raw = String(raw0 ?? "").toLowerCase();
      if (raw === "qu") raw = "q";
      if (isVowelLetterWithMask(raw, slots)) vowelsRemoved += 1;
    }
    if (vowelsRemoved <= 0) return;
    await notifyOwnedTreasuresOnDeckCardsRemoved(slots, {
      ownedSlotTreasureIds: slots,
      treasureRun: treasureRunState.value,
      vowelsRemoved,
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      ...hooks.ownedTreasureHookFxBridge(),
    });
  }

  /**
   * @param {{ raw: string, materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }[]} entries
   */
  function appendShopDeckEntriesAndNotify(entries) {
    for (const entry of entries ?? []) collection.noteCollectionDeckEntryModifiers(entry);
    const created = grid.appendShopDeckEntries(entries);
    const n = created.length;
    if (!n) return created;
    recordTreasureRunDeckCardsAdded(treasureRunState.value, created);
    void notifyOwnedTreasuresOnDeckCardsAdded(ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      treasureRun: treasureRunState.value,
      count: n,
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      ...hooks.ownedTreasureHookFxBridge(),
    });
    collection.flushDeckMultisetAchievements();
    return created;
  }

  /** @param {Parameters<typeof grid.appendDeckCardSpecToInitialSnapshot>[0]} spec */
  function appendDeckCardSpecToInitialSnapshotAndNotify(spec) {
    collection.noteCollectionDeckEntryModifiers(spec);
    const card = grid.appendDeckCardSpecToInitialSnapshot(spec);
    if (!card) return card;
    recordTreasureRunDeckCardsAdded(treasureRunState.value, [card]);
    void notifyOwnedTreasuresOnDeckCardsAdded(ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      treasureRun: treasureRunState.value,
      count: 1,
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      ...hooks.ownedTreasureHookFxBridge(),
    });
    collection.flushDeckMultisetAchievements();
    return card;
  }

  function clearOwnedTreasureSlotById(treasureId) {
    clearOwnedTreasureSlotLeaveGapById(treasureId);
  }

  /** 清空槽位但保留空位（雷管等：触发源不向前压实） */
  function clearOwnedTreasureSlotLeaveGapById(treasureId) {
    const tid = String(treasureId ?? "");
    if (!tid) return;
    const ix = findOwnedTreasureSlotIndex(tid);
    if (ix >= 0) removeOwnedTreasureSlotsLeaveGapAtIndices([ix]);
  }

  /** @deprecated 自毁/摧毁应使用 removeOwnedTreasureSlotsLeaveGapAtIndices */
  function removeAndCompactOwnedTreasureAtIndex(slotIndex, opts = {}) {
    const ix = Math.floor(Number(slotIndex));
    if (!Number.isFinite(ix) || ix < 0 || ix >= ownedTreasures.value.length) return;
    const slots = [...ownedTreasures.value];
    if (!compactOwnedTreasureSlotsAtIndex(slots, ix)) return;
    ownedTreasures.value = slots;
    const keys = [...gameOwnedKeyOrder.value];
    if (ix >= 0 && ix < keys.length) keys.splice(ix, 1);
    gameOwnedKeyOrder.value = keys;
    syncOwnedTreasureSlots();
    if (opts.triggerBarCompactAnim !== false) hooks.triggerTreasureBarCompactAnim?.();
  }

  /** 清空槽位但保留空位（火山喷发等：其它宝藏消失、触发源不动） */
  function clearOwnedTreasureSlotLeaveGapAtIndex(slotIndex) {
    const ix = Math.floor(Number(slotIndex));
    if (!Number.isFinite(ix) || ix < 0 || ix >= ownedTreasures.value.length) return;
    const slots = [...ownedTreasures.value];
    if (slots[ix] == null) return;
    slots[ix] = null;
    ownedTreasures.value = slots;
    syncOwnedTreasureSlots();
  }

  /**
   * 留空位式摧毁之后：若裁剪配饰减少导致栏位上限变小，将超出段的宝藏移入左侧空位并裁尾。
   * @param {{ triggerBarCompactAnim?: boolean }} [opts]
   * @returns {boolean}
   */
  function reconcileOwnedTreasureSlotsAfterLeaveGapDestruction(opts = {}) {
    const slots = [...ownedTreasures.value];
    const keys = [...gameOwnedKeyOrder.value];
    const reconciled = reconcileOwnedTreasureSlotsAfterDestruction(
      slots,
      keys,
      treasureSlotCapacityExtra(),
    );
    ownedTreasures.value = slots;
    gameOwnedKeyOrder.value = keys;
    syncOwnedTreasureSlots();
    if (reconciled && opts.triggerBarCompactAnim !== false) {
      hooks.triggerTreasureBarCompactAnim?.();
    }
    return reconciled;
  }

  /**
   * 批量清空槽位但保留空位（炸弹等）；仅当裁剪配饰减少栏位上限时才前移超出段的宝藏。
   * @param {readonly number[]} indices
   * @param {{ triggerBarCompactAnim?: boolean }} [opts]
   */
  function removeOwnedTreasureSlotsLeaveGapAtIndices(indices, opts = {}) {
    const unique = [
      ...new Set(
        indices.map((i) => Math.floor(Number(i))).filter((i) => Number.isFinite(i) && i >= 0),
      ),
    ];
    if (!unique.length) return;

    const slots = [...ownedTreasures.value];
    let any = false;
    for (const ix of unique) {
      if (ix >= slots.length || slots[ix] == null) continue;
      slots[ix] = null;
      any = true;
    }
    if (!any) return;

    ownedTreasures.value = slots;
    reconcileOwnedTreasureSlotsAfterLeaveGapDestruction(opts);
  }

  function syncAmberBossTreasureLayoutForLevelEnter(incomingMechSlug) {
    const slug = String(incomingMechSlug ?? "").trim();
    if (amberBossTreasureSnapshot.value && slug !== AMBER_BOSS_SLUG) {
      const restored = restoreAmberBossTreasureLayout(
        ownedTreasures.value,
        gameOwnedKeyOrder.value,
        amberBossTreasureSnapshot.value,
      );
      ownedTreasures.value = restored.slots;
      gameOwnedKeyOrder.value = restored.keys;
      amberBossTreasureSnapshot.value = null;
    }
    if (slug !== AMBER_BOSS_SLUG || hooks.bossMechanicsSuppressed.value) return;
    if (!amberBossTreasureSnapshot.value) {
      amberBossTreasureSnapshot.value = captureAmberBossTreasureSnapshot(
        ownedTreasures.value,
        gameOwnedKeyOrder.value,
      );
    }
    const base = amberBossTreasureSnapshot.value;
    const shuffled = applyFlipAndShuffleToOwnedTreasures(base.slots, base.keys, runRandom);
    ownedTreasures.value = shuffled.slots;
    gameOwnedKeyOrder.value = shuffled.keys;
  }

  /** @param {string} levelId */
  function buildTreasureLevelEnterEffectContext(levelId) {
    return {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      getOwnedSlotTreasureIds: ownedSlotTreasureIdList,
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      treasureRun: treasureRunState.value,
      rng: runRandom,
      levelId,
      findOwnedTreasureSlotIndex,
      ...hooks.ownedTreasureHookFxBridge(),
      ...hooks.buildTreasureLevelEnterEffectContextExtras(levelId),
    };
  }

  /** @param {string} levelId */
  function runTreasureLevelEnterHooks(levelId) {
    resetTreasureLevelScopedState(treasureRunState.value);
    const ch = parseChapterFromLevelId(levelId);
    const prev = treasureRunState.value.lastChapterNumber;
    if (ch !== prev) {
      onTreasureRunChapterEnter(treasureRunState.value, ch);
      notifyOwnedTreasuresOnChapterEnter(ownedSlotTreasureIdList(), {
        treasureRun: treasureRunState.value,
      });
      treasureRunState.value.lastChapterNumber = ch;
      treasureRunState.value.discardExhaustedSubsThisChapter = new Set();
    }
    hooks.scheduleAfterGridTilesSettled(async () => {
      await notifyOwnedTreasuresOnLevelEnter(
        ownedSlotTreasureIdList(),
        buildTreasureLevelEnterEffectContext(levelId),
      );
    });
  }

  function buildLevelCompleteHookEstimateCtx() {
    return {
      currentScore: grid.currentScore.value,
      targetScore: grid.targetScore.value,
    };
  }

  async function runTreasureLevelCompleteHooks(opts = {}) {
    checkLevelLegendaryDeckExhaustedUnlock(treasureRunState.value, grid.deck.value);
    noteEverTwoTreasuresWithAccessoryUnlocked(treasureRunState.value, ownedTreasures.value);
    const skipSettlementFx = shouldSkipSettlementAnim(isEndlessRun.value === true);
    await notifyOwnedTreasuresOnLevelComplete(ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      getOwnedSlotTreasureIds: ownedSlotTreasureIdList,
      getOwnedTreasures: () => ownedTreasures.value,
      treasureRun: treasureRunState.value,
      rng: runRandom,
      skipSettlementFx,
      clearTreasureSlotById: clearOwnedTreasureSlotById,
      findOwnedTreasureSlotIndex,
      onBeforeLevelCompleteHook: opts.onBeforeEachHook,
      ...hooks.ownedTreasureHookFxBridge(),
      ...hooks.buildTreasureLevelCompleteContextExtras(),
    });
  }

  /**
   * @param {{
   *   runHourglassStageEndFx: (opts?: { onBeforeEachTick?: () => void | Promise<void> }) => Promise<void>,
   * }} deps
   */
  async function runLevelEndPreSettlementFx(deps) {
    const skip = shouldSkipSettlementAnim(isEndlessRun.value === true);
    setLevelEndSettlementSkipActive(skip);
    try {
      await runLevelEndPreSettlementSequence({
        getOwnedTreasures: () => ownedTreasures.value,
        getOwnedSlotTreasureIds: ownedSlotTreasureIdList,
        buildLevelCompleteHookEstimateCtx,
        runHourglassStageEndFx: deps.runHourglassStageEndFx,
        runTreasureLevelCompleteHooks,
      });
    } finally {
      setLevelEndSettlementSkipActive(false);
    }
  }

  /**
   * @param {object} levelDef
   * @param {{ skipBossRestrictionNotify?: boolean, discardPendingAfterGridSettled?: boolean }} [opts]
   */
  async function resetLevelAfterTreasurePrep(levelDef, opts = {}) {
    hooks.clearPendingAfterGridTilesSettled?.();
    const resetOptsPreview = hooks.buildLevelResetRunOpts(levelDef);
    const incomingMechSlug = hooks.resolveBossSlugForMechanics(
      resetOptsPreview.bossSlug,
      ownedSlotTreasureIdList(),
    );
    syncAmberBossTreasureLayoutForLevelEnter(incomingMechSlug);
    await notifyOwnedTreasuresPrepareLevelEnter(ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      treasureRun: treasureRunState.value,
      rng: runRandom,
      appendDeckCardSpecToInitialSnapshot: appendDeckCardSpecToInitialSnapshotAndNotify,
    });
    const resetOpts = hooks.buildLevelResetRunOpts(levelDef);
    const forced = treasureRunState.value.jokerForcedDrawUid;
    if (forced != null) resetOpts.forcedJokerDrawUid = forced;
    treasureRunState.value.jokerForcedDrawUid = null;
    hooks.resetLevel(levelDef, resetOpts);
    hooks.syncPlayerMarkBatchCounterFromGrid();
    runTreasureLevelEnterHooks(levelDef?.id ?? "1-1");
    beginLevelLegendaryDeckTracking(treasureRunState.value, grid.deck.value);
    const levelId = levelDef?.id ?? "1-1";
    const mechSlug = hooks.getBossSlugForMechanics();
    if (
      !opts.skipBossRestrictionNotify &&
      parseLevelSubFromId(levelId) === 3 &&
      hooks.isBossLevelEnterRestrictionSlug(mechSlug)
    ) {
      hooks.scheduleAfterGridTilesSettled(async () => {
        await hooks.notifyBossRestrictionTreasures(mechSlug);
      });
    }
    if (opts.discardPendingAfterGridSettled) {
      hooks.clearPendingAfterGridTilesSettled?.();
    }
    scheduleRunAutoSave();
  }

  /**
   * @param {Record<string, unknown>[][]} tiles
   * @param {string} resolvedWord
   * @param {number} judgedLenTable
   * @param {number} scoreBeforeHand
   * @param {number} handFinalScore
   */
  function buildTreasureSubmitSuccessContext(
    tiles,
    resolvedWord,
    judgedLenTable,
    scoreBeforeHand,
    handFinalScore,
    skipSettlementFx = false,
  ) {
    const owned = ownedTreasures.value;
    return {
      skipSettlementFx,
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      getOwnedSlotTreasureIds: ownedSlotTreasureIdList,
      findOwnedTreasureSlotIndex,
      incrementChargeWordSubmissionCount: grid.bumpBasketballWordSubmitted,
      submittedScoringTiles: tiles,
      treasureRun: treasureRunState.value,
      resolvedWord,
      judgedWordLength: judgedLenTable,
      ownedTreasureInstances: owned,
      getOwnedTreasures: () => ownedTreasures.value,
      rng: runRandom,
      moneyAfterSubmit: money.value,
      removeDeckLettersByRaws: (raws) => {
        grid.removeDeckLetterInstancesByRaws(raws);
        void notifyTreasureDeckCardsRemovedByRaws(raws);
        collection.flushDeckMultisetAchievements();
      },
      ...hooks.ownedTreasureHookFxBridge(),
      ...hooks.buildTreasureSubmitSuccessContextExtras(
        tiles,
        resolvedWord,
        judgedLenTable,
        scoreBeforeHand,
        handFinalScore,
        skipSettlementFx,
      ),
    };
  }

  /**
   * @param {Record<string, unknown>[][]} tiles
   * @param {string} resolvedWord
   * @param {number} judgedLenTable
   * @param {number} scoreBeforeHand
   * @param {number} handFinalScore
   * @param {Set<number> | readonly number[] | null | undefined} [disabledTreasureSlotIndices]
   */
  async function runPendingInRunGrantsAfterSubmit(
    tiles,
    resolvedWord,
    judgedLenTable,
    scoreBeforeHand,
    handFinalScore,
    disabledTreasureSlotIndices = null,
  ) {
    const skipSettlementFx = shouldSkipSettlementAnim(isEndlessRun.value === true);
    const ownedIds = applyDisabledTreasureSlots(
      ownedSlotTreasureIdList(),
      disabledTreasureSlotIndices,
    );
    /** @type {import('../../treasures/treasureTypes.js').SubmitWordLeaveFxRunner[]} */
    const submitWordLeaveFx = [];
    /** @type {(() => Promise<void>)[]} */
    const submitAfterWordLeaveFx = [];
    /** @type {(() => Promise<void>)[]} */
    const submitPostScoreClearFx = [];
    await notifyOwnedTreasuresSuccessfulWordSubmit(ownedIds, {
      ...buildTreasureSubmitSuccessContext(
        tiles,
        resolvedWord,
        judgedLenTable,
        scoreBeforeHand,
        handFinalScore,
        skipSettlementFx,
      ),
      registerSubmitWordLeaveFx: (runner) => {
        if (typeof runner === "function") submitWordLeaveFx.push(runner);
      },
      registerSubmitAfterWordLeaveFx: (runner) => {
        if (typeof runner === "function") submitAfterWordLeaveFx.push(runner);
      },
      registerSubmitPostScoreClearFx: (runner) => {
        if (typeof runner === "function") submitPostScoreClearFx.push(runner);
      },
      registerSubmitAccessoryUpgradeCue: (cue) => {
        hooks.submitAccessoryUpgradeBatchState?.current?.registerCue(cue);
      },
      registerSubmitAccessoryUpgradeStep: (step) => {
        hooks.submitAccessoryUpgradeBatchState?.current?.registerStep(step);
      },
      buildInRunLengthUpgradeStep: hooks.buildInRunLengthUpgradeStep,
    });
    return { submitWordLeaveFx, submitAfterWordLeaveFx, submitPostScoreClearFx };
  }

  async function notifyBossRestrictionTreasures(bossSlug) {
    const slug = String(bossSlug ?? "").trim();
    if (!slug || hooks.bossMechanicsSuppressed.value) return;
    await notifyOwnedTreasuresOnBossRestrictionTriggered(ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      treasureRun: treasureRunState.value,
      bossSlug: slug,
      addMoney: (n) => {
        money.value += Math.max(0, Math.floor(Number(n) || 0));
      },
      playOwnedTreasureMoneyFx: hooks.playOwnedTreasureMoneyFx,
    });
  }

  /** @param {string} word */
  async function notifyWordDefinitionOpenAttempt(word) {
    return notifyOwnedTreasuresOnWordDefinitionOpenAttempt(ownedSlotTreasureIdList(), {
      ...hooks.ownedTreasureHookFxBridge(),
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      word: String(word ?? ""),
    });
  }

  /** @param {object} ctx */
  async function notifyIceBreak(ctx = {}) {
    await notifyOwnedTreasuresOnIceBreak(ownedSlotTreasureIdList(), {
      treasureRun: treasureRunState.value,
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      ...hooks.ownedTreasureHookFxBridge(),
      ...ctx,
    });
  }

  /** @param {object} ctx */
  async function notifyTreasureSold(ctx = {}) {
    await notifyOwnedTreasuresOnTreasureSold(ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      treasureRun: treasureRunState.value,
      ...hooks.ownedTreasureHookFxBridge(),
      ...ctx,
    });
  }

  /** @param {object} ctx */
  async function notifyShopLeave(ctx = {}) {
    await notifyOwnedTreasuresOnShopLeave(ownedSlotTreasureIdList(), {
      treasureRun: treasureRunState.value,
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ownedTreasureInstances: ownedTreasures.value,
      getOwnedTreasures: () => ownedTreasures.value,
      ...ctx,
    });
  }

  return {
    ownedSlotTreasureIdList,
    findOwnedTreasureSlotIndex,
    findAllOwnedTreasureSlotIndices,
    grantOwnedTreasureAt,
    applyTreasureAcquireImmediateEffectsForRun,
    initTreasureBankOnAcquire,
    canPlaceTreasureOffer,
    findTreasurePlacementIndex,
    syncOwnedTreasureSlots,
    gameOwnedKeyOrder,
    gameOwnedKeyOrderBag,
    gameOwnedDragActive,
    gameOwnedDragGhostVisible,
    gameOwnedDragPlaceholderVisible,
    gameOwnedDragSourceIndex,
    gameOwnedDragMoved,
    gameOwnedDragTreasure,
    gameOwnedDragGhostStyle,
    gameOwnedDragPlaceholderStyle,
    displayOwnedTreasures,
    displayOwnedTreasureKeys,
    onGameOwnedSlotPointerDown,
    treasureDetail,
    presentTreasureDetail,
    treasureDetailMode,
    treasureDetailDescriptionOverride,
    treasureDetailSpellReplayTargetId,
    treasureDetailChargeVisualState,
    treasureDetailChargeProgress,
    treasureDetailEffectDepleted,
    treasureDetailPreviewNavTotal,
    treasureDetailPreviewNavIndex,
    onTreasurePreviewNav,
    applyTreasureDetailAtPreviewNav,
    buildShopOwnedPreviewNavItems,
    treasureChargeVisualBySlot,
    treasureChargeProgressBySlot,
    treasureEffectDepletedBySlot,
    displayTreasureChargeVisualBySlot,
    displayTreasureChargeProgressBySlot,
    displayTreasureEffectDepletedBySlot,
    gameOwnedDragChargeState,
    gameOwnedDragChargeProgress,
    gameOwnedDragEffectDepleted,
    treasureSellRefund,
    treasureProbabilityDoublerCount,
    onTreasureCollectionReorder,
    buildTreasurePoolSnapshot,
    buildTreasureSubmitSuccessContext,
    runPendingInRunGrantsAfterSubmit,
    buildTreasureLevelEnterEffectContext,
    runTreasureLevelEnterHooks,
    runTreasureLevelCompleteHooks,
    runLevelEndPreSettlementFx,
    resetLevelAfterTreasurePrep,
    notifyTreasureDeckCardsRemovedByRaws,
    appendShopDeckEntriesAndNotify,
    appendDeckCardSpecToInitialSnapshotAndNotify,
    clearOwnedTreasureSlotById,
    clearOwnedTreasureSlotLeaveGapById,
    removeAndCompactOwnedTreasureAtIndex,
    clearOwnedTreasureSlotLeaveGapAtIndex,
    removeOwnedTreasureSlotsLeaveGapAtIndices,
    reconcileOwnedTreasureSlotsAfterLeaveGapDestruction,
    notifyBossRestrictionTreasures,
    notifyWordDefinitionOpenAttempt,
    notifyIceBreak,
    notifyTreasureSold,
    notifyShopLeave,
    syncAmberBossTreasureLayoutForLevelEnter,
    rollRandomBigramForTreasure,
    amberBossTreasureSnapshot,
  };
}
