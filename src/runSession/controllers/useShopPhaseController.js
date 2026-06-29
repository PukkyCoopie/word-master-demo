import { computed, ref } from "vue";
import { createShopUpgradePlayback } from "../../game/shopUpgradePlayback.js";
import { createShopWalletGainAnim } from "../../game/shopWalletGainAnim.js";
import { IMPLEMENTED_TREASURE_ID_SET } from "../../treasures/treasureCatalog.js";
import {
  TREASURE_DEFINITIONS,
  notifyOwnedTreasuresOnShopEnter,
  notifyOwnedTreasuresOnShopReroll,
  resolveTreasureWalletFloor,
  sumTreasureShopAccessoryChanceMult,
} from "../../treasures/treasureRegistry.js";
import { filterTreasureDefsForPool } from "../../treasures/treasureAvailability.js";
import {
  addShopShelfTreasureIdsToExclude,
} from "../../treasures/shopTreasureRoll.js";
import {
  expandShopTreasurePoolForRun,
  shopAllowsOwnedTreasureDuplicates,
  shopGuaranteesTreasureGainAccessory,
} from "../../treasures/shopTreasurePoolExpand.js";
import {
  getShopTreasureAccessoryPriceAdd,
  rollShopTreasureAccessoryId,
} from "../../treasures/shopTreasureAccessoryRoll.js";
import { rollPackOfferStock } from "../../shop/rollPackStock.js";
import {
  getShopRandomCardSlotCount,
  rollExtraShopRandomCardOffers,
  rollShopRandomCardOffers,
} from "../../shop/rollShopRandomCardStock.js";
import { applyRandomSaleToOfferRow, applyRandomSaleToShopStockRows } from "../../shop/shopRandomSale.js";
import { resolveShopOfferEffectivePrice } from "../../shop/shopOfferPriceDisplay.js";
import { buildVoucherShopOfferRow } from "../../vouchers/shopVoucherOfferBuild.js";
import {
  resolveVoucherShelfClearTarget,
  shouldClearVoucherShelfSlot,
} from "../../vouchers/shopVoucherShelfPurchase.js";
import { rollShopVoucherOfferDef } from "../../vouchers/voucherRegistry.js";
import {
  buildSpellPoolEligibilityCounts,
  buildSpellPoolExcludeIds,
} from "../../spells/spellPoolEligibility.js";
import { computeShopRerollCost } from "../../constants.js";
import {
  getEffectiveShopRerollCost,
  getShopAccessoryChanceMultiplier,
  getShopRandomCardSlotBonus,
  getVoucherShelfGeneration,
  isLengthObservatoryBoosted,
  parseLevelSubFromId,
} from "../../vouchers/voucherRuntime.js";
import { canAffordWallet } from "../../treasures/treasureWalletFloor.js";
import { syncShopUpgradesFreeFromOwnedTreasures } from "../../treasures/treasureAcquireInit.js";
import { recordReroll } from "../../game/runMatchStats.js";
import { createShopSelectionHandlers } from "../../game/shopSelectionHandlers.js";
import { createShopViewContext } from "../../components/run/shopViewKey.js";
import { assembleShopViewContext } from "../viewContext/assembleShopViewContext.js";

/** @typedef {import('../runSessionTypes.js').ShopStore} ShopStore */

const shopVoucherShelfEmpty = Object.freeze({ kind: "empty", emptySlotId: 0 });

/**
 * @typedef {Object} ShopPhaseControllerOptions
 * @property {{ showShop?: import('vue').Ref<boolean> }} [state]
 * @property {{ transitionBusy: import('vue').Ref<boolean>, shopOverlayLayersSuppressed: import('vue').Ref<boolean> }} gates
 * @property {() => { playUpgradeResult?: (payload: object) => Promise<void> } | null | undefined} getShopPanel
 * @property {() => Promise<void>} waitNextTick
 * @property {import('vue').Ref<number | null>} [walletHeaderDisplayOverride]
 * @property {() => HTMLElement | null} [getDefaultWalletEl]
 * @property {{
 *   getBuildSpellRuntimeContext: () => object,
 *   noteCollectionUpgradeFromRandomPick: (pick: object) => void,
 *   noteCollectionAllLengthUpgrades: () => void,
 *   noteCollectionAllRarityUpgrades: () => void,
 * }} upgradeCallbacks
 * @property {{
 *   money: import('vue').Ref<number>,
 *   ownedTreasures: import('vue').Ref<(object | null)[]>,
 *   ownedVoucherIds: import('vue').Ref<string[]>,
 *   ownedUpgrades: import('vue').Ref<unknown[]>,
 *   treasureRunState: import('vue').Ref<object>,
 *   runMatchStats: import('vue').Ref<object>,
 *   runPresetId: import('vue').Ref<string>,
 *   runDifficultyIndex: import('vue').Ref<number>,
 *   runRandom: () => number,
 * }} run
 * @property {{
 *   lengthLevelsByLength: import('vue').Ref<Record<number, number>>,
 *   rarityLevelsByRarity: import('vue').Ref<Record<string, number>>,
 *   spellCountsByLength: import('vue').Ref<Record<number, number>>,
 * }} grid
 * @property {{
 *   lastReplayableSpellId: import('vue').Ref<string | null>,
 *   spellCastHistory: import('vue').Ref<string[]>,
 * }} spell
 * @property {() => string} getCurrentLevelId
 * @property {() => { id?: string } | null | undefined} getNextLevelDefAfterShop
 * @property {() => object} buildTreasurePoolSnapshot
 * @property {() => (string | null)[]} ownedSlotTreasureIdList
 * @property {(len: number, options?: object) => void} bumpWordLengthLevel
 * @property {(rarity: string, level: number) => void} setRarityLevelWithTreasurePairs
 * @property {() => void} refreshGridTileBaseScoresFromLevels
 * @property {(treasureRunState: object) => void} noteTreasureRunUpgradeUsed
 * @property {(upgradeTreasureId?: string) => void} noteCollectionUpgradeUsed
 * @property {(amount: number) => void} noteRunMoneySpent
 * @property {() => void} scheduleRunAutoSave
 * @property {(msg: string) => void} showToast
 * @property {() => object} ownedTreasureHookFxBridge
 * @property {(fn: (...args: unknown[]) => unknown) => unknown} playOwnedTreasureMultDeltaFx
 * @property {(treasureId: string, options?: object) => void} [recordPrerequisiteTreasureShopAppeared]
 * @property {() => object} readNormalizedSlotCareer
 * @property {{
 *   presentTreasureDetail: (detail: object) => void,
 *   buildShopOwnedPreviewNavItems: () => { index: number, treasure: object }[],
 *   isShopTutorialBlockedShopInteraction: (offer: object) => boolean,
 *   maybeEndShopTutorialOnOfferOpen: (treasure: object) => void,
 *   getFirstWordTutorialPhase: () => string,
 *   getTreasureDetail: () => object | null,
 *   clearTreasureDetail: () => void,
 *   getTreasureDetailLayer: () => { playClose?: (opts?: object) => Promise<void> } | null | undefined,
 * }} selection
 */

/**
 * 商店阶段数据：货架生成、reroll、价格、升级 apply、优惠券槽（任务 5.1，无 UI）。
 *
 * @param {ShopPhaseControllerOptions} options
 * @returns {ShopStore & {
 *   suppressShopEnterVisitInit: import('vue').Ref<boolean>,
 *   balatroFirstShopPackConsumed: import('vue').Ref<boolean>,
 *   firstShopTreasureConsumed: import('vue').Ref<boolean>,
 *   shopVoucherShelfGeneration: import('vue').Ref<number>,
 *   shopVoucherShelf: import('vue').Ref<object | null>,
 *   shopVoucherShelfResolved: import('vue').ComputedRef<object>,
 *   shopVoucherBonusShelf: import('vue').Ref<object | null>,
 *   shopNextRerollCostDisplay: import('vue').ComputedRef<number>,
 *   shopCanReroll: import('vue').ComputedRef<boolean>,
 *   ownedTreasureIdSet: import('vue').ComputedRef<Set<string>>,
 *   shopTreasurePool: import('vue').ComputedRef<object[]>,
 *   shopPriceForOffer: (basePrice: number, offer?: object) => number,
 *   buildUpgradeAnimPayloadFromOffer: (offer: object) => object,
 *   applyUpgradeFromOffer: (offer: object, options?: { price?: number }) => void,
 *   clearOfferSlotAfterPurchase: (offer: object) => void,
 *   appendShopRandomCardSlotsAfterPurchase: (extraCount: number) => void,
 *   refreshShopVoucherShelfForCurrentVisit: () => void,
 *   applyShopVisitStockRoll: () => { shop: object[], pack: object[] },
 *   shopVisitStockMissingFromSave: () => boolean,
 *   onShopVisitEnter: (options?: { hydrateSkip?: boolean }) => void,
 *   rerollShop: (options?: { onAfterStockReroll?: () => void | Promise<void> }) => Promise<void>,
 *   grantSpellBonusShopVoucher: () => { ok: boolean },
 *   hasSpellBonusShopVoucher: () => boolean,
 *   isCouponDropSpellBlockedByBonusVoucher: (spellId: string) => boolean,
 *   spellPoolEligibilityForShop: () => object,
 *   buildShopRandomCardRollCtx: (sessionExcludeTreasureIds?: Set<string> | null) => object,
 *   buildRollBundleOptionsCtx: () => object,
 *   toShopOfferRows: (defs: object[], rng?: () => number) => object[],
 *   makeEmptyShopSlot: () => object,
 *   makeEmptyPackSlot: () => object,
 *   makeEmptyVoucherSlot: () => object,
 *   clearShopVoucherBonusShelf: () => void,
 *   runOwnedTreasuresOnShopEnterFx: () => void,
 *   getOwnedUpgradeLevelByGroup: (groupKey: string) => number,
 *   runShopUpgradePlaybackSteps: (steps: object[], opts?: object) => Promise<void>,
 *   onShopUpgradeInteractionUnlock: () => void,
 *   playArrowUpShopUpgradeSequence: (opts?: object) => Promise<void>,
 *   playEclipseLengthUpgradeSequence: () => Promise<void>,
 *   playEclipseRarityUpgradeSequence: () => Promise<void>,
 *   buildEclipseLengthUpgradeSteps: () => object[],
 *   buildEclipseRarityUpgradeSteps: () => object[],
 *   playWalletHeaderGainAnim: (start: number, end: number, elOverride?: HTMLElement | null) => Promise<void>,
 *   disposeShopWalletGainAnim: () => void,
 *   onShopSelectOffer: (payload: object) => void,
 *   onShopSelectVoucher: (payload: object) => void,
 *   onShopSelectPackOffer: (payload: object) => void,
 *   onShopSelectOwned: (payload: object) => void,
 *   onShopReroll: () => Promise<void>,
 *   onShopReorderOwned: (nextSlots: (object | null)[]) => void,
 * }}
 */
export function useShopPhaseController(options) {
  const {
    state,
    gates,
    run,
    grid,
    spell,
    getCurrentLevelId,
    getNextLevelDefAfterShop,
    buildTreasurePoolSnapshot,
    ownedSlotTreasureIdList,
    bumpWordLengthLevel,
    setRarityLevelWithTreasurePairs,
    refreshGridTileBaseScoresFromLevels,
    noteTreasureRunUpgradeUsed,
    noteCollectionUpgradeUsed,
    noteRunMoneySpent,
    scheduleRunAutoSave,
    showToast,
    ownedTreasureHookFxBridge,
    playOwnedTreasureMultDeltaFx,
    recordPrerequisiteTreasureShopAppeared,
    readNormalizedSlotCareer,
    getShopPanel,
    waitNextTick,
    walletHeaderDisplayOverride,
    getDefaultWalletEl,
    upgradeCallbacks,
    selection,
  } = options;

  const {
    money,
    ownedTreasures,
    ownedVoucherIds,
    ownedUpgrades,
    treasureRunState,
    runMatchStats,
    runPresetId,
    runDifficultyIndex,
    runRandom,
  } = run;
  const { lengthLevelsByLength, rarityLevelsByRarity, spellCountsByLength } = grid;
  const { lastReplayableSpellId, spellCastHistory } = spell;

  const showShop = state?.showShop ?? ref(false);
  const shopOffers = ref(/** @type {object[]} */ ([]));
  const packOffers = ref(/** @type {object[]} */ ([]));
  const shopRerollsThisVisit = ref(0);
  const suppressShopEnterVisitInit = ref(false);
  const balatroFirstShopPackConsumed = ref(false);
  const firstShopTreasureConsumed = ref(false);
  const shopVoucherShelfGeneration = ref(-1);
  /** @type {import('vue').Ref<object | null>} */
  const shopVoucherShelf = ref(null);
  /** @type {import('vue').Ref<object | null>} */
  const shopVoucherBonusShelf = ref(null);
  const shopUpgradeAnimating = ref(false);

  const nextOfferInstanceId = ref(1);
  const nextShopEmptySlotId = ref(1);
  const nextPackEmptySlotId = ref(1);
  const nextVoucherOfferInstanceId = ref(1);
  const nextVoucherEmptySlotId = ref(1);

  const ownedTreasureIdSet = computed(() => {
    const s = new Set();
    for (const t of ownedTreasures.value) {
      if (t?.treasureId) s.add(t.treasureId);
    }
    return s;
  });

  const shopTreasurePool = computed(() => {
    const base = filterTreasureDefsForPool(
      TREASURE_DEFINITIONS.filter(
        (t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId) && t.shopEligible !== false,
      ),
      buildTreasurePoolSnapshot(),
    );
    return expandShopTreasurePoolForRun(
      base,
      ownedSlotTreasureIdList(),
      buildTreasurePoolSnapshot(),
    );
  });

  const runWalletFloor = computed(() => resolveTreasureWalletFloor(ownedSlotTreasureIdList()));

  const shopNextRerollCostDisplay = computed(() => {
    if ((treasureRunState.value.shopFreeRerollsRemaining ?? 0) > 0) return 0;
    return getEffectiveShopRerollCost(
      ownedVoucherIds.value,
      computeShopRerollCost(shopRerollsThisVisit.value),
    );
  });

  const shopCanReroll = computed(() => {
    if (gates.transitionBusy.value) return false;
    return canAffordWallet(money.value, shopNextRerollCostDisplay.value, runWalletFloor.value);
  });

  const shopVoucherShelfResolved = computed(() => shopVoucherShelf.value ?? shopVoucherShelfEmpty);

  function shopPriceForOffer(basePrice, offer = {}) {
    return resolveShopOfferEffectivePrice(
      basePrice,
      offer,
      ownedVoucherIds.value,
      runPresetId.value,
      treasureRunState.value.shopUpgradesFree,
    );
  }

  function makeEmptyShopSlot() {
    return { kind: "empty", emptySlotId: nextShopEmptySlotId.value++ };
  }

  function makeEmptyPackSlot() {
    return { kind: "empty", emptySlotId: nextPackEmptySlotId.value++ };
  }

  function makeEmptyVoucherSlot() {
    return { kind: "empty", emptySlotId: nextVoucherEmptySlotId.value++ };
  }

  /** @param {object | null | undefined} shelf */
  function readVoucherOfferInstanceId(shelf) {
    if (shelf?.kind !== "offer") return 0;
    const id = Math.floor(Number(shelf.offerInstanceId) || 0);
    return id > 0 ? id : 0;
  }

  function syncNextVoucherOfferInstanceIdFromShelves() {
    const maxAssigned = Math.max(
      readVoucherOfferInstanceId(shopVoucherShelf.value),
      readVoucherOfferInstanceId(shopVoucherBonusShelf.value),
    );
    if (maxAssigned > 0) {
      nextVoucherOfferInstanceId.value = Math.max(nextVoucherOfferInstanceId.value, maxAssigned + 1);
    }
  }

  function allocateNextVoucherOfferInstanceId() {
    syncNextVoucherOfferInstanceIdFromShelves();
    return nextVoucherOfferInstanceId.value++;
  }

  function clearShopVoucherBonusShelf() {
    shopVoucherBonusShelf.value = null;
  }

  function hasSpellBonusShopVoucher() {
    return shopVoucherBonusShelf.value?.kind === "offer";
  }

  function spellPoolExcludeIdsWhenBonusVoucherActive() {
    return hasSpellBonusShopVoucher() ? ["coupon_drop"] : [];
  }

  function buildSpellPoolEligibilityCountsForRun() {
    const grantDefs = TREASURE_DEFINITIONS.filter((t) =>
      IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId),
    );
    return buildSpellPoolEligibilityCounts(
      grantDefs,
      buildTreasurePoolSnapshot(),
      ownedTreasureIdSet.value,
      ownedTreasures.value.filter(Boolean).length,
      ownedTreasures.value.filter((s) => s == null).length,
    );
  }

  function spellPoolEligibilityForShop() {
    return {
      ...buildSpellPoolEligibilityCountsForRun(),
      lastReplayableSpellId: lastReplayableSpellId.value,
      spellCastHistory: spellCastHistory.value,
    };
  }

  function isCouponDropSpellBlockedByBonusVoucher(spellId) {
    return String(spellId ?? "") === "coupon_drop" && hasSpellBonusShopVoucher();
  }

  function spellBonusVoucherRollExcludeIds() {
    const shelf = shopVoucherShelf.value;
    if (shelf?.kind === "offer" && shelf.voucherId) {
      return [String(shelf.voucherId)];
    }
    return [];
  }

  /** @returns {{ ok: boolean }} */
  function grantSpellBonusShopVoucher() {
    if (shopVoucherBonusShelf.value?.kind === "offer") {
      return { ok: false };
    }
    const d = rollShopVoucherOfferDef(
      ownedVoucherIds.value,
      runRandom,
      spellBonusVoucherRollExcludeIds(),
    );
    if (!d) {
      showToast("暂无随机优惠券可添加");
      return { ok: false };
    }
    shopVoucherBonusShelf.value = applyRandomSaleToOfferRow(
      buildVoucherShopOfferRow(
        d,
        allocateNextVoucherOfferInstanceId(),
        ownedVoucherIds.value,
        { spellGranted: true },
      ),
      runRandom,
    );
    return { ok: true };
  }

  function buildShopRandomCardPrerequisiteRollOpts() {
    const career = readNormalizedSlotCareer();
    return {
      prerequisiteTreasureRollContext: {
        snap: buildTreasurePoolSnapshot(),
        shopAppearedPrerequisiteTreasureIds: career.shopAppearedPrerequisiteTreasureIds ?? [],
        shopPrerequisiteTreasureSingleCardAppearanceCounts:
          career.shopPrerequisiteTreasureSingleCardAppearanceCounts ?? {},
      },
      onPrerequisiteTreasureShopAppeared: (treasureId) => {
        recordPrerequisiteTreasureShopAppeared?.(treasureId, { singleCardShelf: true });
      },
    };
  }

  function buildPackPrerequisiteRollOpts() {
    return {
      onPrerequisiteTreasureShopAppeared: (treasureId) => {
        recordPrerequisiteTreasureShopAppeared?.(treasureId);
      },
    };
  }

  /** @param {import('../../treasures/treasureTypes.js').TreasureDef[]} defs */
  function toShopOfferRows(defs, rng = Math.random) {
    const hone = getShopAccessoryChanceMultiplier(ownedVoucherIds.value);
    return defs.map((def) => {
      const treasureAccessoryId = rollShopTreasureAccessoryId(rng, hone);
      const priceAdd = getShopTreasureAccessoryPriceAdd(treasureAccessoryId);
      return {
        kind: "offer",
        offerInstanceId: nextOfferInstanceId.value++,
        offerType: "treasure",
        treasureId: def.treasureId,
        price: def.price + priceAdd,
        rarity: def.rarity,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
        treasureAccessoryId: treasureAccessoryId ?? null,
      };
    });
  }

  function getOwnedUpgradeLevelByGroup(groupKey) {
    const key = String(groupKey ?? "");
    const count = ownedUpgrades.value.reduce((acc, item) => {
      if (item?.upgradeKind === "rarity") return acc;
      return item?.lengthGroupKey === key ? acc + 1 : acc;
    }, 0);
    return Math.max(1, count + 1);
  }

  function getLengthUpgradeAnimBeforeLevel(len) {
    const L = Math.max(3, Math.min(16, Math.round(Number(len)) || 3));
    return Math.max(1, Math.round(Number(lengthLevelsByLength.value?.[L])) || 1);
  }

  function snapshotLengthUpgradeAnimBeforeLevels(offer) {
    const lenMin = Math.max(3, Math.min(16, Math.round(Number(offer?.lengthMin)) || 3));
    const lenMax = Math.max(lenMin, Math.min(16, Math.round(Number(offer?.lengthMax)) || lenMin));
    /** @type {Record<number, number>} */
    const map = {};
    for (let len = lenMin; len <= lenMax; len++) {
      map[len] = getLengthUpgradeAnimBeforeLevel(len);
    }
    return map;
  }

  function getOwnedRarityUpgradeDisplayLevel(rarityKey) {
    const k = String(rarityKey ?? "");
    const count = ownedUpgrades.value.reduce(
      (acc, item) => (item?.upgradeKind === "rarity" && item?.rarityKey === k ? acc + 1 : acc),
      0,
    );
    return Math.max(1, count + 1);
  }

  function buildUpgradeAnimPayloadFromOffer(t) {
    const isRarity = t.upgradeKind === "rarity";
    if (isRarity) {
      return {
        upgradeKind: "rarity",
        rarityKey: t.rarityKey,
        beforeLevel: getOwnedRarityUpgradeDisplayLevel(t.rarityKey),
      };
    }
    const beforeLevelsByLen = snapshotLengthUpgradeAnimBeforeLevels(t);
    const lenMin = Math.max(3, Math.min(16, Math.round(Number(t.lengthMin)) || 3));
    return {
      upgradeKind: "length",
      lengthLabel: t.lengthLabel,
      lengthMin: t.lengthMin,
      lengthMax: t.lengthMax,
      beforeLevel: beforeLevelsByLen[lenMin] ?? 1,
      beforeLevelsByLen,
      isLengthObservatoryBoosted: (len) =>
        isLengthObservatoryBoosted(ownedVoucherIds.value, len, spellCountsByLength.value),
    };
  }

  function applyUpgradeFromOffer(t, { price = 0 } = {}) {
    noteTreasureRunUpgradeUsed(treasureRunState.value);
    noteCollectionUpgradeUsed(t?.treasureId);
    const isRarity = t.upgradeKind === "rarity";
    if (isRarity) {
      const rk = String(t.rarityKey ?? "");
      ownedUpgrades.value.push({
        upgradeId: t.treasureId,
        upgradeKind: "rarity",
        rarityKey: rk,
        price,
      });
      const curLv = Math.max(1, Math.round(Number(rarityLevelsByRarity.value?.[rk])) || 1);
      setRarityLevelWithTreasurePairs(rk, curLv + 1);
      refreshGridTileBaseScoresFromLevels();
      return;
    }
    ownedUpgrades.value.push({
      upgradeId: t.treasureId,
      upgradeKind: "length",
      lengthGroupKey: t.lengthGroupKey,
      lengthMin: t.lengthMin,
      lengthMax: t.lengthMax,
      lengthLabel: t.lengthLabel,
      lengthBadgeLabel: t.lengthBadgeLabel,
      price,
    });
    for (let len = t.lengthMin; len <= t.lengthMax; len++) {
      bumpWordLengthLevel(len, {
        observatoryBoost: isLengthObservatoryBoosted(
          ownedVoucherIds.value,
          len,
          spellCountsByLength.value,
        ),
      });
    }
  }

  function buildShopRandomCardRollCtx(sessionExcludeTreasureIds = null) {
    const ownedIds = ownedSlotTreasureIdList();
    const honeBase = getShopAccessoryChanceMultiplier(ownedVoucherIds.value);
    const honeMult = honeBase * sumTreasureShopAccessoryChanceMult(ownedIds);
    return {
      rng: runRandom,
      nextOfferInstanceId: () => nextOfferInstanceId.value++,
      nextShopEmptySlotId: () => nextShopEmptySlotId.value++,
      ownedTreasureIdSet: ownedTreasureIdSet.value,
      sessionExcludeTreasureIds: sessionExcludeTreasureIds ?? undefined,
      lastReplayableSpellId: lastReplayableSpellId.value,
      spellCastHistory: spellCastHistory.value,
      shopTreasurePool: shopTreasurePool.value,
      ownedVoucherIds: ownedVoucherIds.value,
      honeAccessoryMult: honeMult,
      allowOwnedTreasuresInShop: shopAllowsOwnedTreasureDuplicates(ownedIds),
      guaranteeShopTreasureGainAccessory: shopGuaranteesTreasureGainAccessory(ownedIds),
      runDifficultyIndex: runDifficultyIndex.value,
      excludeSpellIds: spellPoolExcludeIdsWhenBonusVoucherActive(),
      spellPoolEligibilityCounts: buildSpellPoolEligibilityCountsForRun(),
      ...buildShopRandomCardPrerequisiteRollOpts(),
    };
  }

  function buildPackRollHoneMult() {
    return (
      getShopAccessoryChanceMultiplier(ownedVoucherIds.value) *
      sumTreasureShopAccessoryChanceMult(ownedSlotTreasureIdList())
    );
  }

  function rollShopStock(rng = Math.random, sessionExcludeTreasureIds = null, opts = {}) {
    const rows = rollShopRandomCardOffers({
      ...buildShopRandomCardRollCtx(sessionExcludeTreasureIds),
      rng,
      guaranteeFirstShopTreasureSlot: opts.guaranteeFirstShopTreasureSlot === true,
    });
    applyRandomSaleToShopStockRows(rows, rng);
    return rows;
  }

  function rollPackStock(rng = Math.random, sessionExcludeTreasureIds = null) {
    const guarantee = balatroFirstShopPackConsumed.value === false;
    const rows = rollPackOfferStock({
      rng,
      nextPackOfferInstanceId: () => nextOfferInstanceId.value++,
      nextPackEmptySlotId: () => nextPackEmptySlotId.value++,
      ownedTreasureIdSet: ownedTreasureIdSet.value,
      sessionExcludeTreasureIds: sessionExcludeTreasureIds ?? undefined,
      emptyTreasureSlots: ownedTreasures.value.filter((s) => s == null).length,
      spellPoolEligibilityCounts: buildSpellPoolEligibilityCountsForRun(),
      lastReplayableSpellId: lastReplayableSpellId.value,
      spellCastHistory: spellCastHistory.value,
      shopTreasurePool: shopTreasurePool.value,
      guaranteeBalatroFirstShopBuffoonSlot: guarantee,
      ownedVoucherIds: ownedVoucherIds.value,
      spellCountsByLength: spellCountsByLength.value,
      honeAccessoryMult: buildPackRollHoneMult(),
      allowOwnedTreasuresInShop: shopAllowsOwnedTreasureDuplicates(ownedSlotTreasureIdList()),
      guaranteeShopTreasureGainAccessory: shopGuaranteesTreasureGainAccessory(
        ownedSlotTreasureIdList(),
      ),
      runDifficultyIndex: runDifficultyIndex.value,
      ...buildPackPrerequisiteRollOpts(),
    });
    if (guarantee) balatroFirstShopPackConsumed.value = true;
    return rows;
  }

  function rollShopVisitStock(rng = Math.random) {
    const sessionExcludeTreasureIds = new Set();
    const guaranteeTreasure = firstShopTreasureConsumed.value === false;
    const shop = rollShopStock(rng, sessionExcludeTreasureIds, {
      guaranteeFirstShopTreasureSlot: guaranteeTreasure,
    });
    if (guaranteeTreasure) firstShopTreasureConsumed.value = true;
    const pack = rollPackStock(rng, sessionExcludeTreasureIds);
    return { shop, pack };
  }

  function shopVisitStockMissingFromSave() {
    return shopOffers.value.length === 0 && packOffers.value.length === 0;
  }

  function refreshShopVoucherShelfForCurrentVisit() {
    const levelId = getCurrentLevelId() ?? "1-1";
    const nextAfterShop = getNextLevelDefAfterShop();
    if (parseLevelSubFromId(nextAfterShop?.id) === 3) {
      clearShopVoucherBonusShelf();
    }
    const shelfGen = getVoucherShelfGeneration(levelId);
    if (shopVoucherShelfGeneration.value !== shelfGen) {
      shopVoucherShelfGeneration.value = shelfGen;
      const d = rollShopVoucherOfferDef(ownedVoucherIds.value, runRandom);
      shopVoucherShelf.value = d
        ? applyRandomSaleToOfferRow(
            buildVoucherShopOfferRow(d, allocateNextVoucherOfferInstanceId(), ownedVoucherIds.value),
            runRandom,
          )
        : makeEmptyVoucherSlot();
    }
  }

  function applyShopVisitStockRoll() {
    const visitStock = rollShopVisitStock(runRandom);
    applyRandomSaleToShopStockRows(visitStock.pack, runRandom);
    shopOffers.value = visitStock.shop;
    packOffers.value = visitStock.pack;
    return visitStock;
  }

  function appendShopRandomCardSlotsAfterPurchase(extraCount) {
    const n = Math.max(0, Math.floor(Number(extraCount) || 0));
    if (n <= 0 || !showShop.value) return;
    const sessionExclude = new Set();
    addShopShelfTreasureIdsToExclude(sessionExclude, shopOffers.value);
    addShopShelfTreasureIdsToExclude(sessionExclude, packOffers.value);
    const extra = rollExtraShopRandomCardOffers(n, buildShopRandomCardRollCtx(sessionExclude));
    applyRandomSaleToShopStockRows(extra, runRandom);
    if (extra.length) shopOffers.value = [...shopOffers.value, ...extra];
  }

  function clearOfferSlotAfterPurchase(t) {
    const pid = Number(t?.offerInstanceId);
    if (!Number.isFinite(pid)) return;
    const isOfferPid = (o) => o.kind === "offer" && Number(o.offerInstanceId) === pid;
    if (t?.offerType === "voucher") {
      const target = resolveVoucherShelfClearTarget(t);
      if (target === "bonus") {
        if (shouldClearVoucherShelfSlot(shopVoucherBonusShelf.value, pid)) {
          clearShopVoucherBonusShelf();
        }
      } else if (target === "main" && shouldClearVoucherShelfSlot(shopVoucherShelf.value, pid)) {
        shopVoucherShelf.value = makeEmptyVoucherSlot();
      }
      return;
    }
    if (t?.offerType === "bundlePack") {
      packOffers.value = packOffers.value.map((o) => (isOfferPid(o) ? makeEmptyPackSlot() : o));
      return;
    }
    if (shopOffers.value.some(isOfferPid)) {
      shopOffers.value = shopOffers.value.map((o) => (isOfferPid(o) ? makeEmptyShopSlot() : o));
      return;
    }
    if (packOffers.value.some(isOfferPid)) {
      packOffers.value = packOffers.value.map((o) => (isOfferPid(o) ? makeEmptyPackSlot() : o));
    }
  }

  function runOwnedTreasuresOnShopEnterFx() {
    void notifyOwnedTreasuresOnShopEnter(ownedSlotTreasureIdList(), {
      treasureRun: treasureRunState.value,
      ownedSlotTreasureIds: ownedSlotTreasureIdList(),
      ...ownedTreasureHookFxBridge(),
    });
  }

  function buildRollBundleOptionsCtx() {
    const sessionExclude = new Set();
    addShopShelfTreasureIdsToExclude(sessionExclude, shopOffers.value);
    addShopShelfTreasureIdsToExclude(sessionExclude, packOffers.value);
    return {
      rng: runRandom,
      nextPackOfferInstanceId: () => nextOfferInstanceId.value++,
      nextPackEmptySlotId: () => nextPackEmptySlotId.value++,
      ownedTreasureIdSet: ownedTreasureIdSet.value,
      sessionExcludeTreasureIds: sessionExclude,
      emptyTreasureSlots: ownedTreasures.value.filter((s) => s == null).length,
      spellPoolEligibilityCounts: buildSpellPoolEligibilityCountsForRun(),
      lastReplayableSpellId: lastReplayableSpellId.value,
      spellCastHistory: spellCastHistory.value,
      shopTreasurePool: shopTreasurePool.value,
      guaranteeBalatroFirstShopBuffoonSlot: false,
      ownedVoucherIds: ownedVoucherIds.value,
      spellCountsByLength: spellCountsByLength.value,
      honeAccessoryMult: buildPackRollHoneMult(),
      runDifficultyIndex: runDifficultyIndex.value,
      excludeSpellIds: spellPoolExcludeIdsWhenBonusVoucherActive(),
      ...buildPackPrerequisiteRollOpts(),
    };
  }

  function buildRollInRunBundlePackCtx() {
    return {
      rng: runRandom,
      nextPackOfferInstanceId: () => nextOfferInstanceId.value++,
      nextPackEmptySlotId: () => nextPackEmptySlotId.value++,
      ownedTreasureIdSet: ownedTreasureIdSet.value,
      emptyTreasureSlots: ownedTreasures.value.filter((s) => s == null).length,
      lastReplayableSpellId: lastReplayableSpellId.value,
      spellCastHistory: spellCastHistory.value,
      shopTreasurePool: shopTreasurePool.value,
      guaranteeBalatroFirstShopBuffoonSlot: false,
      ownedVoucherIds: ownedVoucherIds.value,
      spellCountsByLength: spellCountsByLength.value,
      honeAccessoryMult: buildPackRollHoneMult(),
      runDifficultyIndex: runDifficultyIndex.value,
      excludeSpellIds: spellPoolExcludeIdsWhenBonusVoucherActive(),
      spellPoolEligibilityCounts: buildSpellPoolEligibilityCountsForRun(),
      ...buildPackPrerequisiteRollOpts(),
    };
  }

  function onShopVisitEnter({ hydrateSkip = false } = {}) {
    if (hydrateSkip) {
      suppressShopEnterVisitInit.value = false;
      syncNextVoucherOfferInstanceIdFromShelves();
      syncShopUpgradesFreeFromOwnedTreasures(ownedSlotTreasureIdList(), treasureRunState.value);
      return;
    }
    shopRerollsThisVisit.value = 0;
    refreshShopVoucherShelfForCurrentVisit();
    applyShopVisitStockRoll();
    runOwnedTreasuresOnShopEnterFx();
  }

  async function rerollShop({ onAfterStockReroll } = {}) {
    if (gates.transitionBusy.value) return;
    if (!shopCanReroll.value) return;
    const cost = shopNextRerollCostDisplay.value;
    const rs = treasureRunState.value;
    if (cost > 0) {
      money.value -= cost;
      noteRunMoneySpent(cost);
    } else if ((rs.shopFreeRerollsRemaining ?? 0) > 0) {
      rs.shopFreeRerollsRemaining -= 1;
    }
    recordReroll(runMatchStats.value);
    shopRerollsThisVisit.value += 1;
    const sessionExclude = new Set();
    addShopShelfTreasureIdsToExclude(sessionExclude, shopOffers.value);
    addShopShelfTreasureIdsToExclude(sessionExclude, packOffers.value);
    shopOffers.value = rollShopStock(runRandom, sessionExclude);
    await onAfterStockReroll?.();
    void notifyOwnedTreasuresOnShopReroll(ownedSlotTreasureIdList(), {
      treasureRun: treasureRunState.value,
      playOwnedTreasureMultDeltaFx,
    });
    scheduleRunAutoSave();
  }

  async function enterShop() {
    showShop.value = true;
  }

  async function leaveShopToNextLevel() {
    showShop.value = false;
  }

  const upgradePlayback = createShopUpgradePlayback({
    showShop,
    shopUpgradeAnimating,
    shopOverlayLayersSuppressed: gates.shopOverlayLayersSuppressed,
    getShopPanel,
    waitNextTick,
    runRandom,
    levelRefs: { rarityLevelsByRarity, lengthLevelsByLength },
    ownedVoucherIds,
    spellCountsByLength,
    getBuildSpellRuntimeContext: () => upgradeCallbacks.getBuildSpellRuntimeContext(),
    noteCollectionUpgradeFromRandomPick: (pick) =>
      upgradeCallbacks.noteCollectionUpgradeFromRandomPick(pick),
    refreshGridTileBaseScoresFromLevels,
    noteTreasureRunUpgradeUsed,
    treasureRunState,
    noteCollectionAllLengthUpgrades: () => upgradeCallbacks.noteCollectionAllLengthUpgrades(),
    noteCollectionAllRarityUpgrades: () => upgradeCallbacks.noteCollectionAllRarityUpgrades(),
    setRarityLevelWithTreasurePairs,
    bumpWordLengthLevel,
  });

  const {
    runShopUpgradePlaybackSteps,
    onShopUpgradeInteractionUnlock,
    playArrowUpShopUpgradeSequence,
    playEclipseLengthUpgradeSequence,
    playEclipseRarityUpgradeSequence,
    buildEclipseLengthUpgradeSteps,
    buildEclipseRarityUpgradeSteps,
  } = upgradePlayback;

  const walletGainAnim =
    walletHeaderDisplayOverride && getDefaultWalletEl
      ? createShopWalletGainAnim({
          money,
          walletHeaderDisplayOverride,
          getDefaultWalletEl,
          autoAnimateWhileInShop: {
            showShop,
            transitionBusy: gates.transitionBusy,
          },
        })
      : null;

  const playWalletHeaderGainAnim = walletGainAnim
    ? walletGainAnim.playWalletHeaderGainAnim
    : async () => {};
  const disposeShopWalletGainAnim = walletGainAnim
    ? walletGainAnim.disposeShopWalletGainAnim
    : () => {};

  const {
    onShopSelectOffer,
    onShopSelectVoucher,
    onShopSelectPackOffer,
    onShopSelectOwned,
    onShopReroll,
    onShopReorderOwned,
  } = createShopSelectionHandlers({
    shopOffers,
    packOffers,
    ownedTreasures,
    presentTreasureDetail: selection.presentTreasureDetail,
    buildShopOwnedPreviewNavItems: selection.buildShopOwnedPreviewNavItems,
    buildShopVoucherPreviewNavItems: () => {
      /** @type {object[]} */
      const items = [];
      const main = shopVoucherShelf.value ?? shopVoucherShelfEmpty;
      if (main.kind === "offer") items.push(main);
      if (shopVoucherBonusShelf.value?.kind === "offer") items.push(shopVoucherBonusShelf.value);
      return items;
    },
    isShopTutorialBlockedShopInteraction: selection.isShopTutorialBlockedShopInteraction,
    maybeEndShopTutorialOnOfferOpen: selection.maybeEndShopTutorialOnOfferOpen,
    getFirstWordTutorialPhase: selection.getFirstWordTutorialPhase,
    getTreasureDetail: selection.getTreasureDetail,
    clearTreasureDetail: selection.clearTreasureDetail,
    getTreasureDetailLayer: selection.getTreasureDetailLayer,
    rerollShop,
    scheduleRunAutoSave,
  });

  /** @type {Record<string, unknown> | null} */
  let shopViewDeps = null;

  /** @param {Record<string, unknown>} deps */
  function initViewContext(deps) {
    shopViewDeps = deps;
  }

  function buildViewContext() {
    if (!shopViewDeps) {
      throw new Error("useShopPhaseController: initViewContext must be called before buildViewContext");
    }
    return createShopViewContext(assembleShopViewContext(shopViewDeps));
  }

  return {
    initViewContext,
    buildViewContext,
    showShop,
    shopOffers,
    packOffers,
    shopRerollsThisVisit,
    shopUpgradeAnimating,
    suppressShopEnterVisitInit,
    balatroFirstShopPackConsumed,
    firstShopTreasureConsumed,
    shopVoucherShelfGeneration,
    shopVoucherShelf,
    shopVoucherShelfResolved,
    shopVoucherBonusShelf,
    shopNextRerollCostDisplay,
    shopCanReroll,
    ownedTreasureIdSet,
    shopTreasurePool,
    shopPriceForOffer,
    buildUpgradeAnimPayloadFromOffer,
    applyUpgradeFromOffer,
    clearOfferSlotAfterPurchase,
    appendShopRandomCardSlotsAfterPurchase,
    refreshShopVoucherShelfForCurrentVisit,
    applyShopVisitStockRoll,
    shopVisitStockMissingFromSave,
    onShopVisitEnter,
    rerollShop,
    enterShop,
    leaveShopToNextLevel,
    grantSpellBonusShopVoucher,
    hasSpellBonusShopVoucher,
    isCouponDropSpellBlockedByBonusVoucher,
    spellPoolEligibilityForShop,
    buildShopRandomCardRollCtx,
    buildRollBundleOptionsCtx,
    buildRollInRunBundlePackCtx,
    buildSpellPoolEligibilityCountsForRun,
    spellPoolExcludeIdsWhenBonusVoucherActive,
    toShopOfferRows,
    makeEmptyShopSlot,
    makeEmptyPackSlot,
    makeEmptyVoucherSlot,
    clearShopVoucherBonusShelf,
    runOwnedTreasuresOnShopEnterFx,
    getOwnedUpgradeLevelByGroup,
    nextOfferInstanceId,
    runWalletFloor,
    runShopUpgradePlaybackSteps,
    onShopUpgradeInteractionUnlock,
    playArrowUpShopUpgradeSequence,
    playEclipseLengthUpgradeSequence,
    playEclipseRarityUpgradeSequence,
    buildEclipseLengthUpgradeSteps,
    buildEclipseRarityUpgradeSteps,
    playWalletHeaderGainAnim,
    disposeShopWalletGainAnim,
    onShopSelectOffer,
    onShopSelectVoucher,
    onShopSelectPackOffer,
    onShopSelectOwned,
    onShopReroll,
    onShopReorderOwned,
  };
}
