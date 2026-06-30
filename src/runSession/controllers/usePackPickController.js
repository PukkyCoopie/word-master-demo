import { nextTick, ref } from "vue";
import {
  buildPackPickSessionFromBundle,
  packPickOptionKeyOf,
  packPickRequiredPicks,
} from "../../game/inRunGrantFlow.js";
import { rollOneRandomBundlePackOffer } from "../../shop/rollInRunBundlePack.js";
import { notifyOwnedTreasuresOnPackSkipped, notifyOwnedTreasuresOnPackClaimed } from "../../treasures/treasureRegistry.js";
import { syncShopUpgradesFreeFromOwnedTreasures, initTreasureBankOnAcquire } from "../../treasures/treasureAcquireInit.js";
import { readTreasureAccessoryIds } from "../../accessories/accessoryState.js";
import { animatePackDeckOfferFlyToDeck } from "../../game/shopOfferFlyAnim.js";
import { packDeckOfferFlyOriginRectFromEl } from "../../game/offerFlyOrigin.js";
import { createPreviewNavGroupFromItems } from "../../preview/previewGroupNav.js";
import { triggerHaptic } from "../../platform/haptics.js";

/** @typedef {import('../runSessionTypes.js').PackPickController} PackPickController */

/** 组件 ref 取根 DOM（LetterTile 等），原生元素原样返回 */
function refToDom(el) {
  if (!el) return undefined;
  if (typeof el.getEl === "function") return el.getEl() ?? undefined;
  return el.$el != null ? el.$el : el;
}

/**
 * @typedef {Object} PackPickControllerOptions
 * @property {{ shopOverlayLayersSuppressed: import('vue').Ref<boolean> }} gates
 * @property {() => { playClose?: (opts?: object) => Promise<void> } | null | undefined} getPackPickLayer
 * @property {() => { getFlyFrameEl?: () => unknown, playClose?: (opts?: object) => Promise<void>, beginDeckFlyParallelClose?: () => void } | null | undefined} getTreasureDetailLayer
 * @property {import('vue').Ref<object | null>} treasureDetail
 * @property {{
 *   buildRollBundleOptionsCtx: () => object,
 *   buildRollInRunBundlePackCtx: () => object,
 *   buildUpgradeAnimPayloadFromOffer: (offer: object) => object,
 *   applyUpgradeFromOffer: (offer: object, options?: object) => void,
 *   runShopUpgradePlaybackSteps: (steps: object[], opts?: object) => Promise<void>,
 *   getShopDeckViewBtnEl: () => HTMLElement | null,
 * }} shop
 * @property {{
 *   runSpellPreviewChain: (...args: unknown[]) => Promise<unknown>,
 *   runInRunSpellGrant: (...args: unknown[]) => Promise<unknown>,
 *   runInRunUpgradePlaybackSteps: (steps: object[]) => Promise<void>,
 *   appendShopDeckEntriesAndNotify: (entries: object[]) => void,
 * }} grant
 * @property {{
 *   ownedTreasures: import('vue').Ref<(object | null)[]>,
 *   treasureRunState: import('vue').Ref<object>,
 *   runRandom: () => number,
 * }} run
 * @property {{
 *   ownedSlotTreasureIdList: () => (string | null)[],
 *   dismissTreasureDetailOnBack: () => Promise<void>,
 *   scheduleRunAutoSave: () => void,
 *   showToast: (msg: string) => void,
 *   canPlaceTreasureOffer: (offer: object) => boolean,
 *   findTreasurePlacementIndex: (offer: object) => number,
 *   grantOwnedTreasureAt: (ix: number, input: object) => void,
 *   applyTreasureAcquireImmediateEffectsForRun: (treasureId: string) => void,
 *   waitForOwnedTreasureSlotEl: (slotIndex: number, opts?: object) => Promise<HTMLElement | null>,
 *   animateTreasureFrameFly: (fromEl: HTMLElement, toEl: HTMLElement, opts?: object) => Promise<void>,
 *   playTreasureGrantPopAtSlotIndex: (ix: number) => Promise<void>,
 *   getOwnedTreasureSlotEl: (slotIndex: number) => HTMLElement | null,
 *   getInRunDeckFlyTargetEl: () => HTMLElement | null,
 *   playOwnedTreasureMultDeltaFx: (...args: unknown[]) => unknown,
 *   treasureOriginRectFromEl: (el: unknown) => object | null,
 *   runTreasurePackOpenPrecursor: (slotIndex: number, bundleKind?: string) => Promise<void>,
 * }} callbacks
 */

/**
 * 开包 session、skip、包内 grant 编排（任务 5.4）。
 *
 * @param {PackPickControllerOptions} options
 * @returns {PackPickController & {
 *   packPickSession: import('vue').Ref<object | null>,
 *   packPickBusy: import('vue').Ref<boolean>,
 *   packPickSkipBusy: import('vue').Ref<boolean>,
 *   packPickOverlaySuppressed: import('vue').Ref<boolean>,
 *   buildPackPickSessionFromBundle: typeof buildPackPickSessionFromBundle,
 *   openShopPackSession: (bundle: object) => void,
 *   clearSession: () => void,
 *   runInRunPackPickFlow: (bundleRow: object | null | undefined, opts?: { treasureSlotIndex?: number }) => Promise<void>,
 *   onPackPickOpenItem: (payload: object) => void,
 *   onPackPickSkip: () => Promise<void>,
 *   onPackInnerClaim: () => Promise<void>,
 *   ensurePackPickOverlayVisible: () => void,
 *   shouldRestorePackPickOverlayAfterSpellConfirm: () => boolean,
 *   getPackPickGrantContext: () => 'shop' | 'inRun',
 *   fulfillPackInnerPurchase: (t: object, flyEl: unknown, opts?: object) => Promise<void>,
 * }}
 */
export function usePackPickController(options) {
  const { gates, getPackPickLayer, getTreasureDetailLayer, treasureDetail, shop, grant, run, callbacks } =
    options;
  const { shopOverlayLayersSuppressed } = gates;
  const { ownedTreasures, treasureRunState, runRandom } = run;

  const packPickOverlaySuppressed = ref(false);
  /** @type {null | (() => void)} */
  let packPickFlowResolve = null;
  const packPickSession = ref(/** @type {object | null} */ (null));
  const packPickBusy = ref(false);
  const packPickSkipBusy = ref(false);

  function getRollCtx(kind) {
    return kind === "inRun" ? shop.buildRollInRunBundlePackCtx() : shop.buildRollBundleOptionsCtx();
  }

  function buildSessionFromBundle(bundle, grantContext = "shop") {
    return buildPackPickSessionFromBundle(bundle, grantContext, getRollCtx);
  }

  function resolvePackPickFlow() {
    const r = packPickFlowResolve;
    packPickFlowResolve = null;
    r?.();
  }

  function getPackPickGrantContext() {
    const ctx = packPickSession.value?.grantContext;
    return ctx === "inRun" ? "inRun" : "shop";
  }

  function openShopPackSession(bundle) {
    packPickOverlaySuppressed.value = false;
    packPickSession.value = buildSessionFromBundle(bundle, "shop");
  }

  function clearSession() {
    packPickSession.value = null;
  }

  async function runInRunPackPickFlow(bundleRow, { treasureSlotIndex } = {}) {
    let bundle = bundleRow;
    if (!bundle || bundle.offerType !== "bundlePack") {
      bundle = rollOneRandomBundlePackOffer(shop.buildRollInRunBundlePackCtx());
      if (!bundle) return;
    }
    const bundleKind = String(bundle.bundleKind ?? "");
    if (typeof treasureSlotIndex === "number" && treasureSlotIndex >= 0) {
      await callbacks.runTreasurePackOpenPrecursor(treasureSlotIndex, bundleKind);
    }
    return new Promise((resolve) => {
      packPickFlowResolve = resolve;
      packPickOverlaySuppressed.value = false;
      packPickSession.value = buildSessionFromBundle(bundle, "inRun");
    });
  }

  function ensurePackPickOverlayVisible() {
    packPickOverlaySuppressed.value = false;
    if (packPickSession.value) {
      shopOverlayLayersSuppressed.value = false;
    }
  }

  function shouldRestorePackPickOverlayAfterSpellConfirm() {
    const sess = packPickSession.value;
    if (!sess) return true;
    const claimed = sess.claimedKeys ?? [];
    return claimed.length + 1 < packPickRequiredPicks(sess);
  }

  async function dismissPackPickLayer() {
    if (!packPickSession.value) return;
    const layer = getPackPickLayer();
    if (layer && typeof layer.playClose === "function") {
      await layer.playClose({ forDismiss: true });
    }
    packPickSession.value = null;
  }

  function onPackPickOpenItem(payload) {
    if (packPickBusy.value) return;
    const item = payload?.item;
    if (!item) return;
    const root = payload?.originEl;
    const options = packPickSession.value?.options ?? [];
    const deckOffer = item?.offerType === "deckTile" || item?.offerType === "deckLetter";
    treasureDetail.value = {
      kind: "pack-inner",
      treasure: item,
      packOptionKey: String(payload?.optionKey ?? packPickOptionKeyOf(item)),
      originRect: deckOffer
        ? packDeckOfferFlyOriginRectFromEl(root)
        : callbacks.treasureOriginRectFromEl(root),
      previewNav: createPreviewNavGroupFromItems(options, (o) =>
        packPickOptionKeyOf(o) === packPickOptionKeyOf(item),
      ),
    };
  }

  async function onPackPickSkip() {
    if (packPickBusy.value || packPickSkipBusy.value) return;
    packPickSkipBusy.value = true;
    try {
      const owned = callbacks.ownedSlotTreasureIdList();
      if (treasureDetail.value) {
        await nextTick();
        await callbacks.dismissTreasureDetailOnBack();
      }
      await dismissPackPickLayer();
      packPickOverlaySuppressed.value = false;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      await notifyOwnedTreasuresOnPackSkipped(owned, {
        treasureRun: treasureRunState.value,
        playOwnedTreasureMultDeltaFx: callbacks.playOwnedTreasureMultDeltaFx,
      });
      resolvePackPickFlow();
      callbacks.scheduleRunAutoSave();
    } finally {
      packPickSkipBusy.value = false;
    }
  }

  /** 选满后先关包层再跑宝藏钩子，避免包 session 未清导致商店整页不可点（如 135 再施法）。 */
  async function finalizeCompletedPackPickSession() {
    const sess = packPickSession.value;
    if (!sess) return;
    const claimed = sess.claimedKeys ?? [];
    if (claimed.length < packPickRequiredPicks(sess)) return;

    const owned = callbacks.ownedSlotTreasureIdList();
    await dismissPackPickLayer();
    packPickOverlaySuppressed.value = false;
    resolvePackPickFlow();
    await notifyOwnedTreasuresOnPackClaimed(owned, {
      ownedSlotTreasureIds: owned,
      treasureRun: treasureRunState.value,
      rng: runRandom,
      findOwnedTreasureSlotIndex: callbacks.findOwnedTreasureSlotIndex,
      requestInRunSpellGrant: async (opts = {}) => {
        const spellId =
          opts.spellId ??
          (typeof callbacks.pickRandomInRunSpellId === "function"
            ? callbacks.pickRandomInRunSpellId()
            : null);
        if (!spellId) return;
        const grantCtx = getPackPickGrantContext();
        await grant.runInRunSpellGrant(spellId, {
          cdShopLeaveReplay: grantCtx !== "inRun",
        });
      },
    });
    callbacks.scheduleRunAutoSave();
  }

  async function maybeAutoClosePackPickSession() {
    await finalizeCompletedPackPickSession();
  }

  /** 包内领取流程结束后的 UI 兜底：未选满则恢复包层，已选满则确保关包。 */
  async function recoverPackPickUiAfterInnerClaim() {
    const sess = packPickSession.value;
    if (!sess) {
      packPickOverlaySuppressed.value = false;
      return;
    }
    const claimed = sess.claimedKeys ?? [];
    if (claimed.length >= packPickRequiredPicks(sess)) {
      await finalizeCompletedPackPickSession();
      return;
    }
    ensurePackPickOverlayVisible();
  }

  async function fulfillSpellAfterPackPayment(t, { restoreLayersAfter = false } = {}) {
    const spellId = String(t.spellId ?? "");
    if (!spellId) return;
    const grantCtx = getPackPickGrantContext();
    packPickOverlaySuppressed.value = true;
    await nextTick();
    const context = grantCtx !== "inRun" ? "shop" : "inRun";
    const offerDeckSource = grantCtx !== "inRun" ? "fullDeck" : "remainingDeck";
    // 包内详情已展示过；普通法术直接即时释法或开操作层。
    // 重播/骰子仍走 runSpellPreviewChain 原分支（展示将要释放的法术详情）。
    await grant.runSpellPreviewChain(spellId, context, offerDeckSource, {
      afterDetailUseShopCastLogic: grantCtx !== "inRun",
    });
    if (restoreLayersAfter) {
      ensurePackPickOverlayVisible();
    }
  }

  async function fulfillUpgradeAfterPackPayment(t, { restoreLayersAfter = false } = {}) {
    const payload = shop.buildUpgradeAnimPayloadFromOffer(t);
    const step = {
      payload,
      apply: () => shop.applyUpgradeFromOffer(t, { price: 0 }),
    };
    packPickOverlaySuppressed.value = true;
    await nextTick();
    if (getPackPickGrantContext() === "inRun") {
      await grant.runInRunUpgradePlaybackSteps([step]);
    } else {
      await shop.runShopUpgradePlaybackSteps([step], { restoreLayersAfter });
    }
    if (restoreLayersAfter) {
      ensurePackPickOverlayVisible();
    }
  }

  async function fulfillTreasureAfterPackPayment(t, fromEl) {
    const slotsLenBefore = ownedTreasures.value.length;
    const ix = callbacks.findTreasurePlacementIndex(t);
    if (ix < 0) return;
    initTreasureBankOnAcquire(t.treasureId, treasureRunState.value);
    callbacks.applyTreasureAcquireImmediateEffectsForRun(t.treasureId);
    const slotsExpanded = ownedTreasures.value.length > slotsLenBefore;
    const frameEl = fromEl instanceof HTMLElement ? fromEl : null;
    const toTarget = await callbacks.waitForOwnedTreasureSlotEl(ix, { slotsExpanded });
    let grantedOnFly = false;
    const grantTreasure = () => {
      if (grantedOnFly) return;
      grantedOnFly = true;
      callbacks.grantOwnedTreasureAt(ix, {
        treasureId: t.treasureId,
        price: t.price,
        treasureAccessoryIds: readTreasureAccessoryIds(t),
      });
      syncShopUpgradesFreeFromOwnedTreasures(callbacks.ownedSlotTreasureIdList(), treasureRunState.value);
    };
    if (frameEl && toTarget) {
      await callbacks.animateTreasureFrameFly(frameEl, toTarget, {
        onLanding: grantTreasure,
        keepSourceHidden: true,
      });
    }
    if (!grantedOnFly) {
      grantTreasure();
      await callbacks.playTreasureGrantPopAtSlotIndex(ix);
    }
  }

  async function fulfillPackInnerPurchase(
    t,
    flyEl,
    {
      restoreLayersAfter = false,
      keepSourceHiddenAfterDeckFly = false,
      fromRect = null,
      priceStruck = false,
    } = {},
  ) {
    if (!t) return;
    if (t.offerType === "spell") {
      await fulfillSpellAfterPackPayment(t, { restoreLayersAfter });
      return;
    }
    if (t.offerType === "upgrade") {
      await fulfillUpgradeAfterPackPayment(t, { restoreLayersAfter });
      return;
    }
    if (t.offerType === "treasure") {
      await fulfillTreasureAfterPackPayment(t, flyEl ?? null);
      return;
    }
    if (t.offerType === "deckTile" || t.offerType === "deckLetter") {
      const raw = String(t.deckLetterRaw ?? "e").toLowerCase();
      const mat = t.deckTileMaterialId != null ? String(t.deckTileMaterialId) : null;
      const acc = t.deckTileAccessoryId != null ? String(t.deckTileAccessoryId).trim() : "";
      const tAcc =
        t.deckTileTreasureAccessoryId != null ? String(t.deckTileTreasureAccessoryId).trim() : "";
      const deckBtn =
        getPackPickGrantContext() === "inRun"
          ? callbacks.getInRunDeckFlyTargetEl()
          : shop.getShopDeckViewBtnEl();
      const flyRoot = flyEl ?? null;
      if (flyRoot && deckBtn) {
        await animatePackDeckOfferFlyToDeck(t, flyRoot, deckBtn, {
          keepSourceHidden: keepSourceHiddenAfterDeckFly,
          fromRect,
          priceStruck,
        });
      }
      grant.appendShopDeckEntriesAndNotify([
        {
          raw,
          materialId: mat,
          accessoryId: acc || undefined,
          treasureAccessoryId: tAcc || undefined,
        },
      ]);
    }
  }

  async function onPackInnerClaim() {
    const d = treasureDetail.value;
    const sess = packPickSession.value;
    if (!d || d.kind !== "pack-inner" || !sess || packPickBusy.value) return;
    const t = d.treasure;
    const key = String(d.packOptionKey ?? packPickOptionKeyOf(t));
    const claimed = sess.claimedKeys ?? [];
    if (claimed.includes(key)) return;

    const requiredPicks = packPickRequiredPicks(sess);
    if (claimed.length >= requiredPicks) {
      callbacks.showToast("已达可选上限");
      return;
    }

    if (t.offerType === "treasure" && !callbacks.canPlaceTreasureOffer(t)) {
      callbacks.showToast("宝藏槽位不足");
      return;
    }

    const willNeedMorePicks = claimed.length + 1 < requiredPicks;
    const isDeckOffer = t.offerType === "deckTile" || t.offerType === "deckLetter";
    packPickBusy.value = true;
    try {
      const layer = getTreasureDetailLayer();
      const flyEl = layer?.getFlyFrameEl?.() ?? null;
      const isTreasureOffer = t.offerType === "treasure";
      if (isTreasureOffer) {
        sess.claimedKeys = [...claimed, key];
        const closePromise = layer?.playClose?.() ?? Promise.resolve();
        await Promise.all([
          closePromise,
          fulfillPackInnerPurchase(t, flyEl, { restoreLayersAfter: willNeedMorePicks }),
        ]);
        treasureDetail.value = null;
      } else if (isDeckOffer) {
        /** @type {{ left: number, top: number, width: number, height: number } | null} */
        let fromRect = null;
        const flyNode = refToDom(flyEl) ?? (flyEl instanceof HTMLElement ? flyEl : null);
        if (flyNode && typeof flyNode.getBoundingClientRect === "function") {
          const r = flyNode.getBoundingClientRect();
          if (r.width >= 2 && r.height >= 2) {
            fromRect = { left: r.left, top: r.top, width: r.width, height: r.height };
          }
        }
        layer?.beginDeckFlyParallelClose?.();
        await Promise.all([
          layer?.playClose?.({ deckFlyParallelClose: true }) ?? Promise.resolve(),
          fulfillPackInnerPurchase(t, flyEl, {
            restoreLayersAfter: willNeedMorePicks,
            keepSourceHiddenAfterDeckFly: true,
            fromRect,
            priceStruck: true,
          }),
        ]);
        treasureDetail.value = null;
        sess.claimedKeys = [...claimed, key];
      } else {
        await layer?.playClose?.();
        treasureDetail.value = null;
        await fulfillPackInnerPurchase(t, flyEl, { restoreLayersAfter: willNeedMorePicks });
        sess.claimedKeys = [...claimed, key];
      }
      await maybeAutoClosePackPickSession();
      if (packPickSession.value) {
        ensurePackPickOverlayVisible();
      }
      triggerHaptic("selection");
    } finally {
      packPickBusy.value = false;
      try {
        await recoverPackPickUiAfterInnerClaim();
      } catch {
        packPickOverlaySuppressed.value = false;
      }
      callbacks.scheduleRunAutoSave();
    }
  }

  return {
    packPickSession,
    packPickBusy,
    packPickSkipBusy,
    packPickOverlaySuppressed,
    packPickOptionKeyOf,
    packPickRequiredPicks,
    buildPackPickSessionFromBundle: buildSessionFromBundle,
    openShopPackSession,
    clearSession,
    runInRunPackPickFlow,
    onPackPickOpenItem,
    onPackPickSkip,
    onPackInnerClaim,
    dismissPackPickLayer,
    maybeAutoClosePackPickSession,
    ensurePackPickOverlayVisible,
    shouldRestorePackPickOverlayAfterSpellConfirm,
    getPackPickGrantContext,
    fulfillPackInnerPurchase,
    resolvePackPickFlow,
  };
}
