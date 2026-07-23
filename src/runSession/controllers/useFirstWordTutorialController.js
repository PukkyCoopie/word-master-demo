import { computed, nextTick, ref, watch } from "vue";
import { useFirstWordTutorial } from "../../composables/useFirstWordTutorial.js";
import {
  applyTutorialPlayLetters,
  shouldRunFirstWordTutorialInGame,
  TUTORIAL_SELECT_ORDER,
  resolveGuaranteedFirstShopTreasureOffer,
} from "../../tutorial/firstWordTutorial.js";
import {
  inflateRectForTutorialHole,
  measureElementRectInFrame,
  measureKeyedTutorialHoles,
} from "../../game/tutorialSpotlight.js";
import { resetFirstWordTutorialCompleted } from "../../profile/playerProfile.js";

/**
 * @typedef {Object} FirstWordTutorialDomGetters
 * @property {() => Element | null | undefined} getPortalFrameEl
 * @property {() => Element | null | undefined} getDeckBtn
 * @property {(index: number) => Element | null | undefined} getGridTileElByIndex
 * @property {() => Element | null | undefined} getLetterGridWrap
 * @property {() => Element | null | undefined} getWordSlotsWrap
 * @property {() => Element | null | undefined} getSubmitBtn
 * @property {() => Element | null | undefined} getSubmitBookmark
 * @property {() => Element | null | undefined} getHintBtn
 * @property {() => Element | null | undefined} getRunHeaderScoresRef
 * @property {() => Element | null | undefined} getShopTreasureOfferEl
 */

/**
 * @param {object} options
 * @param {() => number} options.getSaveSlotIndex
 * @param {() => string | null | undefined} [options.getRunPresetId]
 * @param {() => boolean} options.getFirstWordTutorialEnabled
 * @param {() => number} options.getRunDifficultyIndex
 * @param {() => number} options.getLevelIndex
 * @param {number} options.cols
 * @param {() => unknown[][]} options.getGrid
 * @param {(row: number, col: number) => void} options.touchGrid
 * @param {() => void} options.cancelAllFlyingIn
 * @param {(slotIndex: number) => void} options.removeFromSlot
 * @param {() => number} options.getSelectedOrderLength
 * @param {(immediate?: boolean) => void} options.updateSlotPositions
 * @param {import('vue').Ref<boolean>} options.scoringAnimating
 * @param {import('vue').Ref<boolean>} options.gridRefillAnimating
 * @param {import('vue').ComputedRef<unknown>} options.resolvedWordForSubmit
 * @param {import('vue').ComputedRef<string>} options.effectiveWordForSubmit
 * @param {import('vue').ComputedRef<boolean>} options.canSubmit
 * @param {import('vue').Ref<boolean>} options.showShop
 * @param {import('vue').Ref<number>} options.shopPortalZ
 * @param {() => unknown[]} options.getShopOffers
 * @param {() => number} options.bumpOverlayZ
 * @param {() => { flyingLetters: unknown[] }} options.getPlayfieldFlySnapshot
 * @param {FirstWordTutorialDomGetters} options.dom
 * @param {() => import('vue').ComponentPublicInstance | null | undefined} options.getLayerHost
 * @param {() => boolean} [options.getHintWordAlreadyActive]
 * @param {() => void} [options.ensureTutorialGameLettersOnBoard] casual retryHint：进入阶段时确保棋盘为 GAME
 * @param {ReturnType<typeof useFirstWordTutorial>} [options.tutorial] 已创建的 composable（供 playfield 提前接线）
 */
export function useFirstWordTutorialController(options) {
  const {
    getSaveSlotIndex,
    getRunPresetId,
    getFirstWordTutorialEnabled,
    getRunDifficultyIndex,
    getLevelIndex,
    cols: COLS,
    getGrid,
    touchGrid,
    cancelAllFlyingIn,
    removeFromSlot,
    getSelectedOrderLength,
    updateSlotPositions,
    scoringAnimating,
    gridRefillAnimating,
    resolvedWordForSubmit,
    effectiveWordForSubmit,
    canSubmit,
    showShop,
    shopPortalZ,
    getShopOffers,
    bumpOverlayZ,
    getPlayfieldFlySnapshot,
    dom,
    getHintWordAlreadyActive,
    ensureTutorialGameLettersOnBoard,
    tutorial: tutorialOverride,
  } = options;

  const tutorial = tutorialOverride ?? useFirstWordTutorial(getSaveSlotIndex, getRunPresetId);

  const layerOpen = tutorial.layerOpen;
  const phase = tutorial.phase;
  const active = tutorial.tutorialActive;
  const showHint = tutorial.showHint;
  const showContinueButton = tutorial.showContinueButton;
  const hintText = tutorial.hintText;
  const selectStep = tutorial.selectStep;
  const blocking = tutorial.tutorialBlocking;
  const shopTargetTreasureId = tutorial.shopTargetTreasureId;

  /** @type {import('vue').Ref<{ key: string, x: number, y: number, width: number, height: number, rx: number }[]>} */
  const holes = ref([]);
  /** @type {import('vue').Ref<DOMRect | null>} */
  const skipButtonRect = ref(null);
  /** @type {import('vue').Ref<{ x: number, y: number, width: number, height: number, rx: number } | null>} */
  const arrowTarget = ref(null);
  const baseStackZ = ref(0);
  let spotlightRaf = 0;

  const gridGlow = computed(
    () =>
      (phase.value === "retry" || phase.value === "retryHint") &&
      !scoringAnimating.value &&
      !gridRefillAnimating.value,
  );

  /** retry 阶段：拼出有效词即可点亮提交区（不必等 canSubmit 其它门禁） */
  const retrySubmitReady = computed(
    () =>
      phase.value === "retry" &&
      !scoringAnimating.value &&
      !gridRefillAnimating.value &&
      resolvedWordForSubmit.value != null,
  );

  /** retryHint 阶段：提示已填入且拼出有效词后可提交 */
  const retryHintSubmitReady = computed(
    () =>
      phase.value === "retryHint" &&
      !scoringAnimating.value &&
      !gridRefillAnimating.value &&
      getHintWordAlreadyActive?.() === true &&
      resolvedWordForSubmit.value != null,
  );

  const submitHighlightReady = computed(
    () => phase.value === "submit" || retrySubmitReady.value || retryHintSubmitReady.value,
  );

  const stackZ = computed(() => {
    const p = phase.value;
    const open = layerOpen.value;
    if (!open && p !== "fading") return 0;
    if (showShop.value && (p === "shopIntro" || p === "shopComplete" || p === "fading")) {
      return shopPortalZ.value + 10;
    }
    return baseStackZ.value;
  });

  const treasureDetailStackZFloor = computed(() => {
    if (!showShop.value || !layerOpen.value) return 0;
    const p = phase.value;
    if (p !== "shopIntro" && p !== "shopComplete") return 0;
    return stackZ.value + 1;
  });

  function eligible() {
    return (
      getFirstWordTutorialEnabled() &&
      getRunDifficultyIndex() === 0 &&
      shouldRunFirstWordTutorialInGame(getLevelIndex(), getSaveSlotIndex())
    );
  }

  function isBlockingInput() {
    return blocking.value;
  }

  function clearWordSelectionForTutorial() {
    cancelAllFlyingIn();
    if (getSelectedOrderLength() > 0) {
      removeFromSlot(0);
    }
  }

  function updateSpotlight() {
    if (!layerOpen.value) return;
    const frame = dom.getPortalFrameEl();
    if (!frame) return;
    const deckRect = measureElementRectInFrame(dom.getDeckBtn(), frame);
    const p = phase.value;
    if (p === "retryHint") {
      skipButtonRect.value = null;
    } else {
      skipButtonRect.value =
        deckRect && deckRect.width > 0 && deckRect.height > 0 ? deckRect : null;
    }
    if (p === "fading") {
      holes.value = [];
      arrowTarget.value = null;
      return;
    }
    if (p === "select") {
      const step = selectStep.value;
      const target = TUTORIAL_SELECT_ORDER[step];
      if (!target) return;
      const idx = target.row * COLS + target.col;
      const el = dom.getGridTileElByIndex(idx);
      const measured = measureKeyedTutorialHoles([{ key: "select-tile", el }], frame);
      holes.value = measured;
      arrowTarget.value = measured[0] ?? null;
      return;
    }
    if (p === "submit") {
      const measured = measureKeyedTutorialHoles(
        [
          { key: "word-slots", el: dom.getWordSlotsWrap() },
          { key: "submit", el: dom.getSubmitBookmark() },
        ],
        frame,
      );
      holes.value = measured;
      const submitRect = measureElementRectInFrame(dom.getSubmitBookmark(), frame);
      arrowTarget.value = submitRect
        ? inflateRectForTutorialHole(submitRect)
        : measured.find((h) => h.key === "submit") ?? measured[measured.length - 1] ?? null;
      return;
    }
    if (p === "scoreIntro") {
      const measured = measureKeyedTutorialHoles(
        [{ key: "score-header", el: dom.getRunHeaderScoresRef() }],
        frame,
      );
      holes.value = measured;
      arrowTarget.value = measured[0] ?? null;
      return;
    }
    if (p === "retry") {
      if (scoringAnimating.value || gridRefillAnimating.value) {
        // 与 retryHint 一致：动画中保留已有镂空，避免闪没
        return;
      }
      const submitReady = retrySubmitReady.value;
      const submitEl = dom.getSubmitBtn() ?? dom.getSubmitBookmark();
      /** @type {{ key: string, el: Element | null | undefined }[]} */
      const items = [
        { key: "letter-grid", el: dom.getLetterGridWrap() },
        { key: "word-slots", el: dom.getWordSlotsWrap() },
      ];
      if (submitReady) {
        items.push({ key: "submit", el: submitEl });
      }
      const measured = measureKeyedTutorialHoles(items, frame);
      holes.value = measured;
      if (submitReady) {
        const submitRect = measureElementRectInFrame(submitEl, frame);
        arrowTarget.value = submitRect
          ? inflateRectForTutorialHole(submitRect)
          : measured.find((h) => h.key === "submit") ?? null;
      } else {
        arrowTarget.value = null;
      }
      return;
    }
    if (p === "retryHint") {
      if (scoringAnimating.value || gridRefillAnimating.value) {
        // 勿清空已有镂空，否则会出现「闪一帧再缩回」
        return;
      }
      const hintActive = getHintWordAlreadyActive?.() === true;
      const submitReady = retryHintSubmitReady.value;
      const submitEl = dom.getSubmitBtn() ?? dom.getSubmitBookmark();
      if (!hintActive) {
        const measured = measureKeyedTutorialHoles(
          [{ key: "hint-btn", el: dom.getHintBtn?.() }],
          frame,
        );
        holes.value = measured;
        arrowTarget.value = measured[0] ?? null;
        return;
      }
      /** @type {{ key: string, el: Element | null | undefined }[]} */
      const items = [{ key: "word-slots", el: dom.getWordSlotsWrap() }];
      if (submitReady) {
        items.push({ key: "submit", el: submitEl });
      }
      const measured = measureKeyedTutorialHoles(items, frame);
      holes.value = measured;
      if (submitReady) {
        const submitRect = measureElementRectInFrame(submitEl, frame);
        arrowTarget.value = submitRect
          ? inflateRectForTutorialHole(submitRect)
          : measured.find((h) => h.key === "submit") ?? null;
      } else {
        arrowTarget.value = null;
      }
      return;
    }
    if (p === "shopIntro") {
      const offerEl = dom.getShopTreasureOfferEl();
      const measured = measureKeyedTutorialHoles([{ key: "shop-offer", el: offerEl }], frame);
      holes.value = measured;
      arrowTarget.value = measured[0] ?? null;
      return;
    }
    if (p === "shopComplete") {
      holes.value = [];
      arrowTarget.value = null;
    }
  }

  function scheduleSpotlightUpdate() {
    cancelAnimationFrame(spotlightRaf);
    spotlightRaf = requestAnimationFrame(() => {
      spotlightRaf = requestAnimationFrame(() => {
        spotlightRaf = 0;
        updateSpotlight();
      });
    });
  }

  async function clearSpotlightAfterFade() {
    holes.value = [];
    arrowTarget.value = null;
    skipButtonRect.value = null;
  }

  async function fadeOutLayerAndComplete() {
    await options.getLayerHost()?.fadeOutAndWait?.();
    tutorial.onFadeComplete();
    await clearSpotlightAfterFade();
  }

  /**
   * @param {{ force?: boolean }} [opts]
   */
  async function beginAfterGridSettled(opts = {}) {
    const force = opts.force === true;
    if (!force && !eligible()) return;
    clearWordSelectionForTutorial();
    applyTutorialPlayLetters(getGrid(), touchGrid);
    await nextTick();
    updateSlotPositions(true);
    tutorial.startTutorial();
    await nextTick();
    scheduleSpotlightUpdate();
    requestAnimationFrame(() => scheduleSpotlightUpdate());
  }

  async function finishFlow() {
    tutorial.onShopTutorialEnd();
    await fadeOutLayerAndComplete();
  }

  async function abortFlow() {
    tutorial.skipTutorial();
    await fadeOutLayerAndComplete();
  }

  async function onSkip() {
    await abortFlow();
  }

  function onContinue() {
    if (phase.value === "shopComplete") {
      void finishFlow();
      return;
    }
    tutorial.onScoreIntroContinue();
    if (phase.value === "retryHint") {
      ensureTutorialGameLettersOnBoard?.();
    }
    // 提示钮 v-if 挂载后再量镂空；多帧兜底避免 ref/布局未就绪
    void nextTick().then(() => {
      scheduleSpotlightUpdate();
      requestAnimationFrame(() => {
        scheduleSpotlightUpdate();
        requestAnimationFrame(() => scheduleSpotlightUpdate());
      });
    });
  }

  function maybeEndShopTutorialOnOfferOpen(treasure) {
    if (phase.value !== "shopIntro") return;
    if (
      treasure?.offerType === "treasure" &&
      tutorial.isShopTutorialTargetOffer(treasure.treasureId)
    ) {
      return;
    }
    void abortFlow();
  }

  function maybeEndShopTutorialOnTreasurePurchase(offer) {
    if (phase.value !== "shopIntro") return;
    if (offer?.offerType !== "treasure") return;
    if (!tutorial.isShopTutorialTargetOffer(offer.treasureId)) return;
    tutorial.onShopTreasurePurchased();
    scheduleSpotlightUpdate();
  }

  function isShopTutorialBlockedShopInteraction(offer) {
    if (phase.value !== "shopIntro") return false;
    if (
      offer?.offerType === "treasure" &&
      tutorial.isShopTutorialTargetOffer(offer.treasureId)
    ) {
      return false;
    }
    return true;
  }

  async function onShopOpenedAfterEnter() {
    if (phase.value !== "awaitShop") return;
    tutorial.onShopOpened(resolveGuaranteedFirstShopTreasureOffer(getShopOffers()));
    await nextTick();
    scheduleSpotlightUpdate();
    requestAnimationFrame(() => scheduleSpotlightUpdate());
  }

  function startDevTest() {
    resetFirstWordTutorialCompleted(getSaveSlotIndex());
    void beginAfterGridSettled({ force: true }).then(() => {
      console.log(
        "[DEV] 首词新手引导已启动：棋盘已覆写 PLAY，蒙层应已显示（任意关卡均可调试）。",
      );
    });
  }

  function dispose() {
    cancelAnimationFrame(spotlightRaf);
    spotlightRaf = 0;
  }

  watch(layerOpen, (open) => {
    if (open) {
      if (baseStackZ.value === 0) {
        baseStackZ.value = bumpOverlayZ();
      }
      return;
    }
    baseStackZ.value = 0;
  });

  function shouldRefreshRetrySpotlight() {
    const p = phase.value;
    return (p === "retry" || p === "retryHint") && layerOpen.value;
  }

  watch(resolvedWordForSubmit, () => {
    if (shouldRefreshRetrySpotlight()) {
      scheduleSpotlightUpdate();
    }
  }, { flush: "post" });

  watch(
    () => getSelectedOrderLength(),
    () => {
      if (shouldRefreshRetrySpotlight()) {
        scheduleSpotlightUpdate();
      }
    },
    { flush: "post" },
  );

  watch(
    () => [
      phase.value,
      effectiveWordForSubmit.value,
      resolvedWordForSubmit.value,
      getSelectedOrderLength(),
      getPlayfieldFlySnapshot().flyingLetters.length,
      scoringAnimating.value,
      gridRefillAnimating.value,
      getHintWordAlreadyActive?.(),
    ],
    () => {
      if (shouldRefreshRetrySpotlight()) {
        scheduleSpotlightUpdate();
      }
    },
  );

  // 必须等计分/补牌动画真正结束后再进 scoreIntro。
  // 若在 onFirstWordSubmitted（phase=scoring）时 scoringAnimating 尚未置 true，
  // 旧逻辑会立刻误判为 settled → 补牌时 phase 已是 scoreIntro，GAME 落字与镂空都会乱。
  watch(
    () => [scoringAnimating.value, gridRefillAnimating.value],
    ([scoring, refill], prev) => {
      if (phase.value !== "scoring") return;
      const wasBusy = Array.isArray(prev) && (prev[0] === true || prev[1] === true);
      const busy = scoring === true || refill === true;
      if (!wasBusy || busy) return;
      tutorial.onFirstWordScoringSettled();
      scheduleSpotlightUpdate();
    },
  );

  watch(
    () => [
      layerOpen.value,
      phase.value,
      selectStep.value,
      scoringAnimating.value,
      gridRefillAnimating.value,
      showShop.value,
      retrySubmitReady.value,
      retryHintSubmitReady.value,
      canSubmit.value,
    ],
    () => {
      if (layerOpen.value) scheduleSpotlightUpdate();
    },
    { flush: "post" },
  );

  return {
    tutorial,
    phase,
    layerOpen,
    active,
    showHint,
    showContinueButton,
    hintText,
    selectStep,
    blocking,
    shopTargetTreasureId,
    holes,
    skipButtonRect,
    arrowTarget,
    gridGlow,
    retrySubmitReady,
    retryHintSubmitReady,
    submitHighlightReady,
    stackZ,
    treasureDetailStackZFloor,
    eligible,
    isBlockingInput,
    scheduleSpotlightUpdate: scheduleSpotlightUpdate,
    beginAfterGridSettled: beginAfterGridSettled,
    onSkip,
    onContinue,
    onFadeComplete: tutorial.onFadeComplete,
    maybeEndShopTutorialOnOfferOpen,
    maybeEndShopTutorialOnTreasurePurchase,
    isShopTutorialBlockedShopInteraction,
    onShopOpenedAfterEnter,
    startDevTest,
    dispose,
  };
}
