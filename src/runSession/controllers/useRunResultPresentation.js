import { computed, ref, watch } from "vue";
import gsap from "gsap";
import { EASE_TRANSFORM } from "../../constants.js";
import { getLengthUpgradeLookupKey } from "../../game/wordLengthBalance.js";
import { scoreIsPositive } from "../../utils/scoreInteger.js";
import {
  formatResultNum,
  formatMultDisplay,
  computeResultAreaJudgedWordLength,
  isResultFormulaBasePreviewActive,
  computePreviewFormulaScore,
  computePreviewFormulaMult,
} from "../../game/runResultPresentation.js";

/**
 * 创建顶栏词长/等级升级动效用 presentation model（wordlen + level + score + mult）。
 */
function createLengthUpgradeFxBundle() {
  const wordlenText = ref("");
  const levelShown = ref(1);
  const scoreValue = ref(0);
  const multValue = ref(0);
  const active = ref(false);
  const model = {
    wordlenText,
    levelShown,
    scoreValue,
    multValue,
  };
  return { active, model, wordlenText, levelShown, scoreValue, multValue };
}

/**
 * 提交计分结果区 presentation（不含 submit 计分流程本身）。
 *
 * @param {Object} options
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} options.scoringAnimating
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} options.dictionaryReady
 * @param {import('vue').ComputedRef<string | null>} options.resolvedWordForSubmit
 * @param {import('vue').ComputedRef<string>} options.effectiveWordForSubmit
 * @param {import('vue').ComputedRef<readonly unknown[]>} options.effectiveFormulaTiles
 * @param {import('vue').ComputedRef<boolean>} options.bossSoftWordViolationPreview
 * @param {import('vue').Ref<Record<number, number>> | import('vue').ComputedRef<Record<number, number>>} options.lengthLevelsByLength
 * @param {import('vue').Ref<number> | import('vue').ComputedRef<number>} options.lengthUpgradeObservatoryExtra
 * @param {import('vue').ComputedRef<boolean>} options.isFlintBossActive
 * @param {(tiles: readonly unknown[], word: string | null) => number} options.getWordLetterCount
 * @param {(n: number) => number} options.judgedLengthTableLenForRun
 * @param {(len: number, levels: Record<number, number>, extra: number) => number} options.getWordLengthScoreForTableLen
 * @param {(len: number, levels: Record<number, number>, extra: number) => number} options.getLengthMultiplier
 * @param {(value: number, flint: boolean) => number} options.scaleLengthContributionForBoss
 */
export function useRunResultPresentation(options) {
  const gameResultAreaRef = ref(null);
  const hideResultWordLengthBeforeTotal = ref(false);
  const suppressResultWordLengthUntilScoringEnd = ref(false);

  const animScoreSum = ref(0);
  const animMultTotal = ref(0);
  const animResultTotal = ref(0);

  const clearWin = createLengthUpgradeFxBundle();
  const armBossDowngrade = createLengthUpgradeFxBundle();
  const lastSubmitRarity = createLengthUpgradeFxBundle();
  const inRunGrantUpgrade = createLengthUpgradeFxBundle();

  const clearWinLengthUpgradeFxActive = clearWin.active;
  const clearWinFxModel = clearWin.model;
  const armBossLengthDowngradeFxActive = armBossDowngrade.active;
  const armBossDowngradeFxModel = armBossDowngrade.model;
  const lastSubmitRarityFxActive = lastSubmitRarity.active;
  const lastSubmitRarityFxModel = lastSubmitRarity.model;
  const inRunGrantUpgradeFxActive = inRunGrantUpgrade.active;
  const inRunGrantUpgradeFxModel = inRunGrantUpgrade.model;

  function syncGameResultAreaRef(area) {
    gameResultAreaRef.value = area;
  }

  function getResultTotalEl() {
    return gameResultAreaRef.value?.getTotalEl?.() ?? null;
  }
  function getResultFormulaEl() {
    return gameResultAreaRef.value?.getFormulaEl?.() ?? null;
  }
  function getResultScoreNumEl() {
    return gameResultAreaRef.value?.getScoreNumEl?.() ?? null;
  }
  function getResultMultNumEl() {
    return gameResultAreaRef.value?.getMultNumEl?.() ?? null;
  }

  const formatNum = formatResultNum;

  const showResultTotalBar = computed(
    () => options.scoringAnimating.value && scoreIsPositive(animResultTotal.value),
  );
  const resultTotalShown = computed(() =>
    showResultTotalBar.value ? formatNum(animResultTotal.value) : "",
  );

  watch(showResultTotalBar, (show) => {
    /* 与补牌/棋盘 FLIP 错帧，避免总分归零同帧触发公式区 scale + 全屏 layout */
    requestAnimationFrame(() => {
      const el = getResultFormulaEl();
      if (!el) return;
      gsap.killTweensOf(el);
      gsap.to(el, {
        scale: show ? 0.8 : 1,
        duration: 0.4,
        ease: EASE_TRANSFORM,
        transformOrigin: "50% 100%",
      });
    });
  });

  const resultFormulaBasePreviewActive = computed(() =>
    isResultFormulaBasePreviewActive({
      tiles: options.effectiveFormulaTiles.value,
      bossSoftWordViolation: options.bossSoftWordViolationPreview.value,
      dictionaryReady: options.dictionaryReady.value,
      resolvedWord: options.resolvedWordForSubmit.value,
    }),
  );

  const resultAreaJudgedWordLength = computed(() =>
    computeResultAreaJudgedWordLength({
      tiles: options.effectiveFormulaTiles.value,
      resolvedWord: options.resolvedWordForSubmit.value,
      getWordLetterCount: options.getWordLetterCount,
      judgedLengthTableLenForRun: options.judgedLengthTableLenForRun,
    }),
  );

  const showResultWordLength = computed(() => {
    if (clearWinLengthUpgradeFxActive.value) return true;
    if (lastSubmitRarityFxActive.value) return true;
    if (inRunGrantUpgradeFxActive.value) return true;
    if (armBossLengthDowngradeFxActive.value) return true;
    if (showResultTotalBar.value) return false;
    if (hideResultWordLengthBeforeTotal.value) return false;
    if (suppressResultWordLengthUntilScoringEnd.value) return false;
    return options.dictionaryReady.value && options.resolvedWordForSubmit.value != null;
  });

  const resultWordLengthShown = computed(() => {
    if (clearWinLengthUpgradeFxActive.value) return clearWin.wordlenText.value;
    if (lastSubmitRarityFxActive.value) return lastSubmitRarity.wordlenText.value;
    if (inRunGrantUpgradeFxActive.value) return inRunGrantUpgrade.wordlenText.value;
    if (armBossLengthDowngradeFxActive.value) return armBossDowngrade.wordlenText.value;
    const L = resultAreaJudgedWordLength.value;
    return L > 0 ? `${L}字母` : `${options.effectiveWordForSubmit.value.length}字母`;
  });

  const resultWordLengthLevel = computed(() => {
    if (clearWinLengthUpgradeFxActive.value) return clearWin.levelShown.value;
    if (lastSubmitRarityFxActive.value) return lastSubmitRarity.levelShown.value;
    if (inRunGrantUpgradeFxActive.value) return inRunGrantUpgrade.levelShown.value;
    if (armBossLengthDowngradeFxActive.value) return armBossDowngrade.levelShown.value;
    const len = resultAreaJudgedWordLength.value;
    const lookupLen = getLengthUpgradeLookupKey(len);
    if (lookupLen < 3) return 1;
    return Math.max(1, Math.round(Number(options.lengthLevelsByLength.value?.[lookupLen])) || 1);
  });

  const displayFormulaScore = computed(() => {
    if (clearWinLengthUpgradeFxActive.value) {
      return String(Math.max(0, Math.round(clearWin.scoreValue.value)));
    }
    if (lastSubmitRarityFxActive.value) {
      return String(Math.max(0, Math.round(lastSubmitRarity.scoreValue.value)));
    }
    if (inRunGrantUpgradeFxActive.value) {
      return String(Math.max(0, Math.round(inRunGrantUpgrade.scoreValue.value)));
    }
    if (armBossLengthDowngradeFxActive.value) {
      return String(Math.max(0, Math.round(armBossDowngrade.scoreValue.value)));
    }
    if (options.scoringAnimating.value) return String(Math.max(0, Math.round(animScoreSum.value)));
    const tiles = options.effectiveFormulaTiles.value;
    if (tiles.length && resultFormulaBasePreviewActive.value) {
      return String(
        computePreviewFormulaScore({
          judgedLen: resultAreaJudgedWordLength.value,
          lengthLevelsByLength: options.lengthLevelsByLength.value,
          lengthUpgradeObservatoryExtra: options.lengthUpgradeObservatoryExtra.value,
          isFlintBossActive: options.isFlintBossActive.value,
          getWordLengthScoreForTableLen: options.getWordLengthScoreForTableLen,
          scaleLengthContributionForBoss: options.scaleLengthContributionForBoss,
        }),
      );
    }
    return "0";
  });

  const displayFormulaMult = computed(() => {
    if (clearWinLengthUpgradeFxActive.value) {
      return formatMultDisplay(clearWin.multValue.value);
    }
    if (lastSubmitRarityFxActive.value) {
      return formatMultDisplay(lastSubmitRarity.multValue.value);
    }
    if (inRunGrantUpgradeFxActive.value) {
      return formatMultDisplay(inRunGrantUpgrade.multValue.value);
    }
    if (armBossLengthDowngradeFxActive.value) {
      return formatMultDisplay(armBossDowngrade.multValue.value);
    }
    if (options.scoringAnimating.value) {
      const m = Number(animMultTotal.value);
      return String(Number.isFinite(m) ? Math.max(0, Math.round(m)) : 0);
    }
    const tiles = options.effectiveFormulaTiles.value;
    if (tiles.length && resultFormulaBasePreviewActive.value) {
      return String(
        computePreviewFormulaMult({
          judgedLen: resultAreaJudgedWordLength.value,
          lengthLevelsByLength: options.lengthLevelsByLength.value,
          lengthUpgradeObservatoryExtra: options.lengthUpgradeObservatoryExtra.value,
          isFlintBossActive: options.isFlintBossActive.value,
          getLengthMultiplier: options.getLengthMultiplier,
          scaleLengthContributionForBoss: options.scaleLengthContributionForBoss,
        }),
      );
    }
    return "0";
  });

  return {
    gameResultAreaRef,
    syncGameResultAreaRef,
    hideResultWordLengthBeforeTotal,
    suppressResultWordLengthUntilScoringEnd,
    animScoreSum,
    animMultTotal,
    animResultTotal,
    clearWinLengthUpgradeFxActive,
    clearWinFxModel,
    armBossLengthDowngradeFxActive,
    armBossDowngradeFxModel,
    lastSubmitRarityFxActive,
    lastSubmitRarityFxModel,
    inRunGrantUpgradeFxActive,
    inRunGrantUpgradeFxModel,
    getResultTotalEl,
    getResultFormulaEl,
    getResultScoreNumEl,
    getResultMultNumEl,
    formatNum,
    showResultTotalBar,
    resultTotalShown,
    resultFormulaBasePreviewActive,
    resultAreaJudgedWordLength,
    showResultWordLength,
    resultWordLengthShown,
    resultWordLengthLevel,
    displayFormulaScore,
    displayFormulaMult,
  };
}
