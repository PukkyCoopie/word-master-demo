import { computed, ref } from "vue";
import gsap from "gsap";
import { getRunLevelAtIndex } from "../../levelDefinitions.js";
import { getDifficultyStageRewardDelta } from "../../game/runDifficultyRuntime.js";
import { createShopWalletGainAnim } from "../../game/shopWalletGainAnim.js";

function dollarMarks(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  return "$".repeat(v);
}

/**
 * 顶栏关卡标题、关卡奖励 $ 标记、钱包展示与分数框覆盖（R7）。
 *
 * @param {{
 *   levelIndex: import('vue').Ref<number>,
 *   runDifficultyIndex: import('vue').Ref<number>,
 *   showShop: import('vue').Ref<boolean>,
 *   getNextLevelDefAfterShop: () => { id?: string } | null | undefined,
 *   targetScore: import('vue').Ref<number> | import('vue').ComputedRef<number>,
 *   currentScore: import('vue').Ref<number> | import('vue').ComputedRef<number>,
 *   money: import('vue').Ref<number>,
 * }} deps
 */
export function useRunHeaderPresentation(deps) {
  const { levelIndex, runDifficultyIndex, showShop, getNextLevelDefAfterShop, targetScore, currentScore, money } =
    deps;

  const currentLevel = computed(() => getRunLevelAtIndex(levelIndex.value));

  const infoModalNextLevelId = computed(() => {
    if (!showShop.value) return "";
    return getNextLevelDefAfterShop()?.id ?? "";
  });

  const levelTitleLabel = computed(() => {
    const id = currentLevel.value?.id ?? "1-1";
    return `关卡 ${id}`;
  });

  const stageRewardYuan = computed(() => {
    const base = currentLevel.value?.rewardYuan ?? 3;
    const delta = getDifficultyStageRewardDelta(runDifficultyIndex.value);
    return Math.max(0, base + delta);
  });

  const rewardDollarMarks = computed(() => dollarMarks(stageRewardYuan.value));

  const levelTitleBoxRef = ref(null);
  const headerWalletMarksRef = ref(null);
  const walletHeaderDisplayOverride = ref(/** @type {number | null} */ (null));

  const walletHeaderShown = computed(() => {
    const o = walletHeaderDisplayOverride.value;
    if (o === null) return money.value;
    return Math.min(o, money.value);
  });

  const settlementWalletGainAnim = createShopWalletGainAnim({
    money,
    walletHeaderDisplayOverride,
    getDefaultWalletEl: () => headerWalletMarksRef.value,
  });

  const { playWalletHeaderGainAnim, disposeShopWalletGainAnim: disposeSettlementWalletGainAnim } =
    settlementWalletGainAnim;

  const roundScoreOverride = ref(null);
  const debugScoreCardTargetOverride = ref(null);
  const debugScoreCardRoundOverride = ref(null);

  const headerTargetScoreValue = computed(
    () => debugScoreCardTargetOverride.value ?? targetScore.value,
  );

  const headerRoundScoreValue = computed(
    () =>
      debugScoreCardRoundOverride.value ??
      roundScoreOverride.value ??
      currentScore.value,
  );

  function disposeHeaderDomFx() {
    const levelEl = levelTitleBoxRef.value;
    if (levelEl) {
      gsap.killTweensOf(levelEl);
      gsap.set(levelEl, { clearProps: "boxShadow,scale,rotation" });
    }
    const wEl = headerWalletMarksRef.value;
    if (wEl) gsap.killTweensOf(wEl);
  }

  return {
    currentLevel,
    infoModalNextLevelId,
    levelTitleLabel,
    stageRewardYuan,
    rewardDollarMarks,
    levelTitleBoxRef,
    headerWalletMarksRef,
    walletHeaderDisplayOverride,
    walletHeaderShown,
    playWalletHeaderGainAnim,
    disposeSettlementWalletGainAnim,
    roundScoreOverride,
    debugScoreCardTargetOverride,
    debugScoreCardRoundOverride,
    headerTargetScoreValue,
    headerRoundScoreValue,
    disposeHeaderDomFx,
  };
}
