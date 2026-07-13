import { computed, ref, nextTick } from "vue";
import { ACCESSORY_CROP } from "../../accessories/accessoryCatalog.js";
import { compactOwnedSlotsAfterCropSell } from "../../accessories/accessorySlotCapacity.js";
import { createShopTreasurePurchaseFx } from "../../game/shopTreasurePurchaseFx.js";
import { planRandomTreasureGrant } from "../../game/treasureInventoryMutation.js";
import {
  countFilledTreasureSlots,
  countHiddenBarTreasures,
  isTreasureBarSlotVisible,
  isTreasureBarStackMode,
} from "../../game/treasureBarLayout.js";
import { offerFlyOriginRectFromEl } from "../../game/offerFlyOrigin.js";
import { createPreviewNavGroupFromItems } from "../../preview/previewGroupNav.js";
import { animSleep } from "../../settings/animationSpeed.js";
import { pickMirrorCopySourceSlotIndex } from "../../treasures/items/treasure_104.js";
import { getTreasureDef } from "../../treasures/treasureRegistry.js";
/** @param {string | null | undefined} rarity */
export function treasureGemClassForRarity(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}

/**
 * 宝藏槽位、授予、bar presentation 与 DOM 查找。
 *
 * @param {Object} options
 * @param {import('vue').Ref<(object | null)[]>} options.ownedTreasures
 * @param {import('vue').Ref<object>} options.treasureRunState
 * @param {import('vue').ComputedRef<Set<string>>} options.ownedTreasureIdSet
 * @param {import('vue').ComputedRef<object[]>} options.shopTreasurePool
 * @param {() => number} options.runRandom
 * @param {() => boolean} options.getShowShop
 * @param {() => { getTreasureBarExpandBtnEl?: () => HTMLElement | null, getOwnedSlotEl?: (i: number) => HTMLElement | null } | null} options.getShopPanel
 * @param {() => { getExpandBtnEl?: () => HTMLElement | null } | null} options.getPlayfieldTreasureBar
 * @param {(slotIndex: number) => HTMLElement | null | undefined} options.getPlayfieldSlotEl
 * @param {import('vue').Ref<boolean>} options.showEmptyTreasureSlotHelp
 * @param {() => boolean} options.isFirstWordTutorialActive
 * @param {import('vue').Ref<number | null>} options.scoringTreasureBarIndex
 * @param {() => boolean} options.isAmberBossMaskActive
 * @param {() => void} options.playBossTapeTriggerCue
 * @param {(slotIndex: number) => boolean} options.isCrimsonTreasureSlotDisabled
 * @param {() => boolean} options.getGameOwnedDragMoved
 * @param {import('vue').Ref<boolean>} [options.shopOverlayLayersSuppressed]
 */
export function useTreasureInventoryController(options) {
  const filledCount = computed(() => countFilledTreasureSlots(options.ownedTreasures.value));
  const stackMode = computed(() => isTreasureBarStackMode(filledCount.value));
  const hiddenCount = computed(() => countHiddenBarTreasures(options.ownedTreasures.value));
  const compactAnimating = ref(false);

  const expandBtnHighlight = computed(() => {
    const ix = options.scoringTreasureBarIndex.value;
    return ix != null && ix >= 0 && !isTreasureBarSlotVisible(ix);
  });

  /** @type {(offer: object | null) => number} */
  let findPlacementIndexImpl = () => -1;
  /** @type {(ix: number, input: object) => void} */
  let grantAtImpl = (_ix, _input) => {};
  /** @type {(detail: object) => void} */
  let presentTreasureDetailImpl = (_detail) => {};
  /** @type {() => object[]} */
  let buildShopOwnedPreviewNavItemsImpl = () => [];
  /** @type {{ ref: import('vue').Ref<string[]> }} */
  let gameOwnedKeyOrderBag = { ref: ref([]) };
  /** @type {(treasureId: string) => void} */
  let applyAcquireEffectsImpl = () => {};
  /** @type {() => object} */
  let buildTreasurePoolSnapshotImpl = () => ({});

  function getExpandBtnEl() {
    if (options.getShowShop()) {
      return options.getShopPanel()?.getTreasureBarExpandBtnEl?.() ?? null;
    }
    return options.getPlayfieldTreasureBar()?.getExpandBtnEl?.() ?? null;
  }

  function getSlotElement(slotIndex) {
    if (typeof slotIndex !== "number" || slotIndex < 0) return null;
    if (!isTreasureBarSlotVisible(slotIndex)) return null;
    if (options.getShowShop()) {
      return options.getShopPanel()?.getOwnedSlotEl?.(slotIndex) ?? null;
    }
    return options.getPlayfieldSlotEl(slotIndex) ?? null;
  }

  function getBarFxEl(slotIndex) {
    if (typeof slotIndex !== "number" || slotIndex < 0) return null;
    if (!isTreasureBarSlotVisible(slotIndex)) return getExpandBtnEl();
    return getSlotElement(slotIndex);
  }

  const { waitForOwnedTreasureSlotEl, playTreasureGrantPopAtSlotIndex } = createShopTreasurePurchaseFx({
    getOwnedTreasureSlotEl: getSlotElement,
  });

  async function triggerCompactAnim() {
    if (!stackMode.value) return;
    compactAnimating.value = true;
    await animSleep(280);
    compactAnimating.value = false;
  }

  /**
   * @param {string | null} rarityFilter
   * @param {{ expandWithCropWhenFull?: boolean }} [opts]
   */
  function grantRandomByRarity(rarityFilter, opts = {}) {
    const plan = planRandomTreasureGrant({
      rarityFilter,
      expandWithCropWhenFull: opts.expandWithCropWhenFull === true,
      accessoryCropId: ACCESSORY_CROP,
      ownedIdSet: options.ownedTreasureIdSet.value,
      shopTreasurePool: options.shopTreasurePool.value,
      buildTreasurePoolSnapshot: buildTreasurePoolSnapshotImpl,
      findPlacementIndex: findPlacementIndexImpl,
      runRandom: options.runRandom,
    });
    if (!plan.ok) return { ok: false, slotIndex: -1 };

    grantAtImpl(plan.slotIndex, {
      treasureId: plan.treasureDef.treasureId,
      price: plan.treasureDef.price,
      ...(plan.usedCrop ? { treasureAccessoryIds: [ACCESSORY_CROP] } : {}),
    });
    applyAcquireEffectsImpl(plan.treasureDef.treasureId);
    return { ok: true, slotIndex: plan.slotIndex };
  }

  function grantRandom() {
    return grantRandomByRarity(null).ok;
  }

  function grantRandomCopy(soldSlotIndex = -1, targetSlotIndex = -1) {
    const owned = options.ownedTreasures.value;
    const sourceIx = pickMirrorCopySourceSlotIndex(owned, soldSlotIndex, options.runRandom);
    if (sourceIx < 0) return -1;
    const pick = owned[sourceIx];
    if (!pick?.treasureId) return -1;
    const def = getTreasureDef(String(pick.treasureId));
    if (!def) return -1;
    const preferred = Math.floor(Number(targetSlotIndex));
    const ix =
      Number.isInteger(preferred) && preferred >= 0 && preferred < options.ownedTreasures.value.length
        ? preferred
        : findPlacementIndexImpl(null);
    if (ix < 0) return -1;
    grantAtImpl(ix, {
      treasureId: def.treasureId,
      price: def.price,
    });
    applyAcquireEffectsImpl(def.treasureId);
    return ix;
  }

  /** @param {number} [maxCount] @param {{ expandWithCropWhenFull?: boolean }} [opts] */
  async function grantRandomOwnedInRunWithPopAnim(maxCount = 1, opts = {}) {
    const cap = Math.max(0, Math.floor(Number(maxCount) || 0));
    let granted = 0;
    if (options.shopOverlayLayersSuppressed) {
      options.shopOverlayLayersSuppressed.value = true;
    }
    await nextTick();
    for (let i = 0; i < cap; i += 1) {
      const slotsLenBefore = options.ownedTreasures.value.length;
      const r = grantRandomByRarity(null, opts);
      if (!r.ok) break;
      granted += 1;
      await playTreasureGrantPopAtSlotIndex(r.slotIndex, {
        slotsExpanded: options.ownedTreasures.value.length > slotsLenBefore,
      });
    }
    if (options.shopOverlayLayersSuppressed) {
      options.shopOverlayLayersSuppressed.value = false;
    }
    return granted;
  }

  async function grantRandomOwnedInRun(maxCount = 1) {
    return grantRandomOwnedInRunWithPopAnim(maxCount);
  }

  function openOwnedDetail(slotIndex, slot, ev) {
    if (!slot) return;
    if (options.isAmberBossMaskActive()) {
      options.playBossTapeTriggerCue();
      return;
    }
    const el = ev?.currentTarget ?? null;
    const items = buildShopOwnedPreviewNavItemsImpl();
    presentTreasureDetailImpl({
      kind: "owned",
      slotIndex,
      treasure: slot,
      originRect: offerFlyOriginRectFromEl(el),
      previewNav: createPreviewNavGroupFromItems(items, (x) => x.index === slotIndex),
    });
  }

  function onOwnedSlotClick(index, slot, ev) {
    if (options.getGameOwnedDragMoved()) return;
    openOwnedDetail(index, slot, ev);
  }

  function onEmptySlotClick() {
    if (options.isFirstWordTutorialActive()) return;
    options.showEmptyTreasureSlotHelp.value = true;
  }

  function gemClassResolver(_i, slot) {
    return treasureGemClassForRarity(slot?.rarity);
  }

  function slotClassResolver(i) {
    return {
      "treasure-slot--scoring-highlight":
        options.scoringTreasureBarIndex.value === i && isTreasureBarSlotVisible(i),
    };
  }

  function crimsonDisabledResolver(i) {
    return options.isCrimsonTreasureSlotDisabled(i);
  }

  /**
   * @param {number} soldIndex
   * @param {object} soldSlot
   * @param {boolean} copyGrantedAtSoldSlot
   */
  function applySellSlotState(soldIndex, soldSlot, copyGrantedAtSoldSlot) {
    const slots = [...options.ownedTreasures.value];
    const compacted = compactOwnedSlotsAfterCropSell(slots, soldIndex, soldSlot);
    if (!compacted && !copyGrantedAtSoldSlot) slots[soldIndex] = null;
    options.ownedTreasures.value = slots;
    if (compacted) {
      const keys = [...gameOwnedKeyOrderBag.ref.value];
      if (soldIndex >= 0 && soldIndex < keys.length) keys.splice(soldIndex, 1);
      gameOwnedKeyOrderBag.ref.value = keys;
    }
    return compacted;
  }

  /**
   * @param {Object} apis
   * @param {(offer: object | null) => number} apis.findTreasurePlacementIndex
   * @param {(ix: number, input: object) => void} apis.grantOwnedTreasureAt
   * @param {(detail: object) => void} apis.presentTreasureDetail
   * @param {() => object[]} apis.buildShopOwnedPreviewNavItems
   * @param {() => object} apis.buildTreasurePoolSnapshot
   * @param {(treasureId: string) => void} apis.applyTreasureAcquireImmediateEffectsForRun
   * @param {{ ref: import('vue').Ref<string[]> }} apis.gameOwnedKeyOrderBag
   */
  function bindTreasureRun(apis) {
    findPlacementIndexImpl = apis.findTreasurePlacementIndex;
    grantAtImpl = apis.grantOwnedTreasureAt;
    presentTreasureDetailImpl = apis.presentTreasureDetail;
    buildShopOwnedPreviewNavItemsImpl = apis.buildShopOwnedPreviewNavItems;
    gameOwnedKeyOrderBag = apis.gameOwnedKeyOrderBag;
    applyAcquireEffectsImpl = apis.applyTreasureAcquireImmediateEffectsForRun;
    buildTreasurePoolSnapshotImpl = apis.buildTreasurePoolSnapshot;
  }

  const presentation = {
    filledCount,
    stackMode,
    hiddenCount,
    compactAnimating,
    expandBtnHighlight,
    gemClassResolver,
    slotClassResolver,
    crimsonDisabledResolver,
  };

  return {
    presentation,
    filledCount,
    stackMode,
    hiddenCount,
    compactAnimating,
    expandBtnHighlight,
    findPlacementIndex: (...args) => findPlacementIndexImpl(...args),
    grantAt: (...args) => grantAtImpl(...args),
    grantRandom,
    grantRandomByRarity,
    grantRandomCopy,
    grantRandomOwnedInRun,
    grantRandomOwnedInRunWithPopAnim,
    openOwnedDetail,
    onOwnedSlotClick,
    onEmptySlotClick,
    getSlotElement,
    getBarFxEl,
    getExpandBtnEl,
    waitForSlotElement: waitForOwnedTreasureSlotEl,
    playGrantPopAtSlot: playTreasureGrantPopAtSlotIndex,
    triggerCompactAnim,
    gemClassResolver,
    slotClassResolver,
    crimsonDisabledResolver,
    applySellSlotState,
    bindTreasureRun,
  };
}

/**
 * GamePanel 侧：inventory ↔ treasureRun 二次绑定。
 * @param {ReturnType<typeof useTreasureInventoryController>} inventory
 * @param {ReturnType<import('./useTreasureRunController.js').useTreasureRunController>} treasureRun
 * @param {{ ref: import('vue').Ref<boolean> | null }} gameOwnedDragMovedBridge
 */
export function wireTreasureInventoryFromGamePanel(inventory, treasureRun, gameOwnedDragMovedBridge) {
  gameOwnedDragMovedBridge.ref = treasureRun.gameOwnedDragMoved;
  inventory.bindTreasureRun({
    findTreasurePlacementIndex: treasureRun.findTreasurePlacementIndex,
    grantOwnedTreasureAt: treasureRun.grantOwnedTreasureAt,
    presentTreasureDetail: treasureRun.presentTreasureDetail,
    buildShopOwnedPreviewNavItems: treasureRun.buildShopOwnedPreviewNavItems,
    gameOwnedKeyOrderBag: treasureRun.gameOwnedKeyOrderBag,
    buildTreasurePoolSnapshot: treasureRun.buildTreasurePoolSnapshot,
    applyTreasureAcquireImmediateEffectsForRun: treasureRun.applyTreasureAcquireImmediateEffectsForRun,
  });
}
