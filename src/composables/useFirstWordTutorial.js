import { computed, ref } from "vue";
import {
  isTutorialSelectTarget,
  TUTORIAL_SELECT_ORDER,
} from "../tutorial/firstWordTutorial.js";
import {
  isFirstWordTutorialCompleted,
  markFirstWordTutorialCompleted,
  getActiveSaveSlotIndex,
} from "../profile/playerProfile.js";

/**
 * @typedef {'idle' | 'select' | 'submit' | 'scoring' | 'scoreIntro' | 'retry' | 'awaitShop' | 'shopIntro' | 'shopComplete' | 'fading' | 'done'} FirstWordTutorialPhase
 */

/**
 * @param {() => number} [resolveSaveSlotIndex]
 */
export function useFirstWordTutorial(resolveSaveSlotIndex) {
  function resolveSlotIndex() {
    const ix = resolveSaveSlotIndex?.();
    return typeof ix === "number" && Number.isFinite(ix) ? ix : getActiveSaveSlotIndex();
  }
  /** @type {import('vue').Ref<FirstWordTutorialPhase>} */
  const phase = ref("idle");
  const selectStep = ref(0);
  /** @type {import('vue').Ref<string | null>} */
  const shopTargetTreasureId = ref(null);
  /** @type {import('vue').Ref<string>} */
  const shopTargetTreasureLabel = ref("");

  const maskVisible = computed(
    () =>
      phase.value === "select" ||
      phase.value === "submit" ||
      phase.value === "scoreIntro" ||
      phase.value === "retry" ||
      phase.value === "shopIntro" ||
      phase.value === "shopComplete",
  );

  const layerOpen = computed(() => maskVisible.value || phase.value === "fading");

  const tutorialActive = computed(() => phase.value !== "idle" && phase.value !== "done");

  const active = computed(
    () =>
      tutorialActive.value || phase.value === "scoring" || phase.value === "awaitShop",
  );

  const tutorialBlocking = computed(
    () =>
      phase.value === "select" ||
      phase.value === "submit" ||
      phase.value === "scoreIntro",
  );

  const submitHighlightReady = computed(() => phase.value === "submit");

  const showHint = computed(
    () =>
      phase.value === "select" ||
      phase.value === "scoreIntro" ||
      phase.value === "retry" ||
      phase.value === "shopIntro" ||
      phase.value === "shopComplete",
  );

  const showContinueButton = computed(
    () => phase.value === "scoreIntro" || phase.value === "shopComplete",
  );

  const hintText = computed(() => {
    if (phase.value === "select") return "拼写你的第一个单词";
    if (phase.value === "scoreIntro") return "达到分数要求即可过关";
    if (phase.value === "retry") return "试着再拼一个单词";
    if (phase.value === "shopIntro") return "购买一个宝藏";
    if (phase.value === "shopComplete") return "教程结束，开始游戏吧！";
    return "";
  });

  function startTutorial() {
    if (isFirstWordTutorialCompleted(resolveSlotIndex())) {
      phase.value = "done";
      return;
    }
    selectStep.value = 0;
    shopTargetTreasureId.value = null;
    shopTargetTreasureLabel.value = "";
    phase.value = "select";
  }

  function onLetterSelected() {
    if (phase.value !== "select") return;
    const next = selectStep.value + 1;
    if (next >= TUTORIAL_SELECT_ORDER.length) {
      selectStep.value = next;
      phase.value = "submit";
      return;
    }
    selectStep.value = next;
  }

  function skipTutorial() {
    markFirstWordTutorialCompleted(resolveSlotIndex());
    phase.value = "fading";
  }

  function onFirstWordSubmitted() {
    if (phase.value !== "submit") return;
    phase.value = "scoring";
  }

  function onFirstWordScoringSettled() {
    if (phase.value !== "scoring") return;
    phase.value = "scoreIntro";
  }

  function onScoreIntroContinue() {
    if (phase.value !== "scoreIntro") return;
    phase.value = "retry";
  }

  function onSecondWordSubmitted() {
    if (phase.value !== "retry") return;
    phase.value = "awaitShop";
  }

  /**
   * @param {{ treasureId?: string | null, emoji?: string, name?: string }} [target]
   */
  function onShopOpened(target = {}) {
    if (phase.value !== "awaitShop") return;
    const tid = target.treasureId != null ? String(target.treasureId) : "";
    shopTargetTreasureId.value = tid || null;
    const emoji = String(target.emoji ?? "").trim();
    const name = String(target.name ?? "").trim();
    shopTargetTreasureLabel.value = emoji && name ? `${emoji}${name}` : name || emoji;
    phase.value = "shopIntro";
  }

  function onShopTreasurePurchased() {
    if (phase.value !== "shopIntro") return;
    phase.value = "shopComplete";
  }

  function onShopTutorialEnd() {
    if (phase.value !== "shopComplete") return;
    markFirstWordTutorialCompleted(resolveSlotIndex());
    phase.value = "fading";
  }

  function onFadeComplete() {
    phase.value = "done";
  }

  /**
   * @param {string | null | undefined} treasureId
   * @returns {boolean}
   */
  function isShopTutorialTargetOffer(treasureId) {
    if (phase.value !== "shopIntro") return false;
    const target = shopTargetTreasureId.value;
    if (!target) return false;
    return String(treasureId ?? "") === target;
  }

  /**
   * @param {number} row
   * @param {number} col
   */
  function allowsTileClick(row, col) {
    if (phase.value === "select") return isTutorialSelectTarget(row, col, selectStep.value);
    if (phase.value === "retry") return true;
    return false;
  }

  return {
    phase,
    selectStep,
    layerOpen,
    maskVisible,
    tutorialActive,
    showHint,
    showContinueButton,
    hintText,
    shopTargetTreasureId,
    active,
    tutorialBlocking,
    submitHighlightReady,
    startTutorial,
    onLetterSelected,
    onFirstWordSubmitted,
    onFirstWordScoringSettled,
    onScoreIntroContinue,
    onSecondWordSubmitted,
    onShopOpened,
    onShopTreasurePurchased,
    onShopTutorialEnd,
    skipTutorial,
    onFadeComplete,
    isShopTutorialTargetOffer,
    allowsTileClick,
  };
}
