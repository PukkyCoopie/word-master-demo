import { computed, ref } from "vue";
import { getBossDef } from "../../game/bossBlindDefinitions.js";
import { applyBossTileDebuffState } from "../../game/bossTileDebuff.js";
import { getEndingLetterRarityForResolvedWord } from "../../game/bossWordViolation.js";
import {
  buildBossWildcardResolveContext as buildBossWildcardResolveContextFromPipeline,
} from "../../game/submitWordPipeline.js";
import {
  isBossEffectsSuppressedByTreasures,
  resolveBossSlugForMechanics,
} from "../../game/treasureBossSuppress.js";
import { runBossKeySoldEffects } from "../../game/bossKeySoldFx.js";
import {
  applyHookBossDebuffTargets,
  clearVerdantDebuffsOnGrid,
  evaluateBossSoftWordViolationPreview,
  evaluateOxBossHit,
  evaluateOxBossViolationPreview,
  isAmberBossMaskActive,
  isCrimsonBossMechanicsActive,
  isFlintBossActive,
  isManacleBossGrid,
  pickCrimsonDisabledTreasureSlotIndex as pickCrimsonDisabledSlotIndex,
  pickHookBossDebuffTargets,
} from "../../game/bossMechanicsContext.js";
import { useBossTapeCue } from "../../composables/useBossTapeCue.js";

/**
 * `useGameState` 之前需要的 Boss 持久 ref（须在根组件尽早创建）。
 *
 * @param {() => readonly string[]} getOwnedSlotTreasureIds
 * @param {() => import('../../treasures/treasureRunState.js').TreasureRunState | null | undefined} [getTreasureRunState]
 */
export function createBossMechanicsEarlyState(getOwnedSlotTreasureIds, getTreasureRunState = () => null) {
  const pillarUsedDeckUids = ref(/** @type {Set<number>} */ (new Set()));
  const verdantTreasureSold = ref(false);
  const suppressed = computed(() =>
    isBossEffectsSuppressedByTreasures(getOwnedSlotTreasureIds(), getTreasureRunState()),
  );
  return { pillarUsedDeckUids, verdantTreasureSold, suppressed };
}

/**
 * Boss 规则与 playfield presentation 编排（不含关卡进退与 blind reroll）。
 *
 * @param {Object} options
 * @param {import('vue').Ref<Set<number>>} options.pillarUsedDeckUids
 * @param {import('vue').Ref<boolean>} options.verdantTreasureSold
 * @param {import('vue').ComputedRef<boolean>} options.suppressed
 * @param {import('vue').Ref<string>} options.activeBossSlug
 * @param {() => readonly (object | null)[]} options.getOwnedTreasures
 * @param {() => readonly string[]} options.getOwnedSlotTreasureIds
 * @param {() => import('../../treasures/treasureRunState.js').TreasureRunState | null | undefined} [options.getTreasureRunState]
 * @param {import('vue').Ref<object[][]>} options.grid
 * @param {number} options.ROWS
 * @param {number} options.COLS
 * @param {() => void} options.touchGrid
 * @param {() => number} options.runRandom
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} options.scoringAnimating
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} options.dictionaryReady
 * @param {import('vue').ComputedRef<string | null>} options.resolvedWordForSubmit
 * @param {import('vue').ComputedRef<string>} options.effectiveWordForSubmit
 * @param {import('vue').ComputedRef<readonly unknown[]>} options.effectiveFormulaTiles
 * @param {import('vue').Ref<Set<number>>} options.usedWordLengthsThisBoss
 * @param {import('vue').Ref<number | null>} options.mouthLockedLengthBoss
 * @param {import('vue').Ref<string | null>} options.clubRequiredKeyBoss
 * @param {(tiles: readonly unknown[], word: string | null) => number} options.getWordLetterCount
 * @param {(n: number) => number} options.judgedLengthTableLenForRun
 * @param {(word: string) => unknown} options.getWordDefinition
 * @param {() => readonly unknown[]} options.listEffectiveTilesForSubmit
 * @param {import('vue').Ref<number | null>} options.crimsonTreasureDisabledSlotIndex
 * @param {import('vue').Ref<Record<number, number>> | import('vue').ComputedRef<Record<number, number>>} options.spellCountsByLength
 * @param {() => { playTriggerCue?: () => void } | null} [options.getBossTapeStrip]
 */
export function useBossMechanicsController(options) {
  const crimsonTreasureDisabledSlotIndex = options.crimsonTreasureDisabledSlotIndex;

  const tape = useBossTapeCue();

  /** @type {((slug?: string) => Promise<void>) | null} */
  let notifyBossRestrictionTreasuresImpl = null;

  /** @type {object | null} */
  let bossKeySoldDeps = null;

  function bindBossKeySoldDeps(deps) {
    bossKeySoldDeps = deps;
  }

  function slug() {
    return resolveBossSlugForMechanics(
      options.activeBossSlug.value,
      options.getOwnedSlotTreasureIds(),
      options.getTreasureRunState?.(),
    );
  }

  const isManacleBossGridFlag = computed(() => isManacleBossGrid(slug()));
  const isAmberBossMaskActiveFlag = computed(() => isAmberBossMaskActive(slug()));
  const isCrimsonBossMechanicsActiveFlag = computed(() => isCrimsonBossMechanicsActive(slug()));
  const isFlintBossActiveFlag = computed(() => isFlintBossActive(slug()));

  function getBossTileDebuffContext() {
    return {
      pillarUsedDeckUids: options.pillarUsedDeckUids.value,
      verdantTreasureSold: options.verdantTreasureSold.value,
      ownedSlotTreasureIds: options.getOwnedSlotTreasureIds(),
      treasureRun: options.getTreasureRunState?.() ?? null,
    };
  }

  function refreshBossTileDebuffOnTile(tile) {
    applyBossTileDebuffState(tile, slug(), getBossTileDebuffContext());
  }

  function playBossTapeTriggerCue() {
    const strip = options.getBossTapeStrip?.();
    if (strip?.playTriggerCue) {
      strip.playTriggerCue();
      return;
    }
    tape.playTriggerCue();
  }

  function onBossTapeTriggerCue() {
    playBossTapeTriggerCue();
  }

  function onBossRestrictionTreasureCue() {
    void notifyBossRestrictionTreasuresImpl?.();
  }

  function bindNotifyBossRestrictionTreasures(fn) {
    notifyBossRestrictionTreasuresImpl = fn;
  }

  const bossStripDef = computed(() => {
    const s = options.activeBossSlug.value;
    return s ? getBossDef(s) : null;
  });

  function judgedLenPartialCtx() {
    return {
      tiles: options.effectiveFormulaTiles.value,
      resolvedWord: options.resolvedWordForSubmit.value,
      getWordDefinition: options.getWordDefinition,
    };
  }

  const resultAreaJudgedWordLength = computed(() => {
    const n = options.getWordLetterCount(
      options.effectiveFormulaTiles.value,
      options.resolvedWordForSubmit.value,
    );
    if (n < 1) return 0;
    return options.judgedLengthTableLenForRun(n, judgedLenPartialCtx());
  });

  const resultAreaJudgedWordLengthBase = computed(() => {
    const n = options.getWordLetterCount(
      options.effectiveFormulaTiles.value,
      options.resolvedWordForSubmit.value,
    );
    if (n < 1) return 0;
    return options.judgedLengthTableLenForRun(n, {
      ...judgedLenPartialCtx(),
      excludeAppendPairedContentBonus: true,
    });
  });

  const softWordViolationPreview = computed(() =>
    evaluateBossSoftWordViolationPreview({
      dictionaryReady: options.dictionaryReady.value,
      slug: slug(),
      resolvedWord: options.resolvedWordForSubmit.value,
      effectiveWord: options.effectiveWordForSubmit.value,
      tiles: options.effectiveFormulaTiles.value,
      judgedLen: resultAreaJudgedWordLength.value,
      baseJudgedLen: resultAreaJudgedWordLengthBase.value,
      getEndingLetterRarity: getEndingLetterRarityForResolvedWord,
      getWordDefinition: options.getWordDefinition,
      usedLengthsThisLevel: options.usedWordLengthsThisBoss.value,
      mouthLockedLength: options.mouthLockedLengthBoss.value,
      clubRequiredKey: options.clubRequiredKeyBoss.value || "",
      ownedSlotTreasureIds: options.getOwnedSlotTreasureIds(),
    }),
  );

  const oxBossViolationPreview = computed(() => {
    if (options.suppressed.value) return false;
    return evaluateOxBossViolationPreview({
      dictionaryReady: options.dictionaryReady.value,
      slug: slug(),
      resolvedWord: options.resolvedWordForSubmit.value,
      effectiveWord: options.effectiveWordForSubmit.value,
      judgedLen: resultAreaJudgedWordLength.value,
      baseJudgedLen: resultAreaJudgedWordLengthBase.value,
      spellCountsByLength: options.spellCountsByLength.value,
    });
  });

  const bossSubmitDangerPreview = computed(
    () => softWordViolationPreview.value || oxBossViolationPreview.value,
  );

  const bossTapeSoftPreview = computed(
    () =>
      !options.scoringAnimating.value &&
      (softWordViolationPreview.value || oxBossViolationPreview.value),
  );

  function pickCrimsonDisabledTreasureSlotIndex() {
    return pickCrimsonDisabledSlotIndex(options.getOwnedTreasures(), options.runRandom);
  }

  function clearVerdantDebuffsOnGridLocal() {
    clearVerdantDebuffsOnGrid(options.grid.value, options.ROWS, options.COLS);
    options.touchGrid();
  }

  async function applyHookBossAfterSubmit() {
    if (slug() !== "the_hook") return;
    const targets = pickHookBossDebuffTargets(
      options.grid.value,
      options.ROWS,
      options.COLS,
      4,
      options.runRandom,
    );
    if (!targets.length) return;
    playBossTapeTriggerCue();
    applyHookBossDebuffTargets(options.grid.value, targets);
    options.touchGrid();
    await notifyBossRestrictionTreasuresImpl?.("the_hook");
  }

  /** 苍翠 Boss：出售宝藏后清理格 debuff 并播条带动效 */
  function onVerdantTreasureSold() {
    if (slug() !== "verdant_leaf") return false;
    options.verdantTreasureSold.value = true;
    clearVerdantDebuffsOnGridLocal();
    playBossTapeTriggerCue();
    return true;
  }

  /** @returns {import('../../game/bossWordViolation.js').BossWildcardResolveContext | null} */
  function buildBossWildcardResolveContext() {
    return buildBossWildcardResolveContextFromPipeline({
      bossSlug: slug(),
      ownedSlotTreasureIds: options.getOwnedSlotTreasureIds(),
      tiles: options.listEffectiveTilesForSubmit(),
      usedWordLengthsThisLevel: options.usedWordLengthsThisBoss.value,
      mouthLockedLength: options.mouthLockedLengthBoss.value,
      clubRequiredKey: options.clubRequiredKeyBoss.value || "",
      getWordDefinition: options.getWordDefinition,
      getJudgedLengthTableLen: options.judgedLengthTableLenForRun,
    });
  }

  function isCrimsonTreasureSlotDisabled(slotIndex) {
    return (
      isCrimsonBossMechanicsActiveFlag.value &&
      options.scoringAnimating.value &&
      crimsonTreasureDisabledSlotIndex.value === slotIndex
    );
  }

  /** 钥匙（136）卖出：解除本关 Boss 限制的棋盘/分数/条带动效 */
  async function onBossKeySold() {
    const activeBoss = String(options.activeBossSlug.value ?? "").trim();
    if (!activeBoss || !bossKeySoldDeps) return;
    await runBossKeySoldEffects({
      activeBossSlug: activeBoss,
      levelId: bossKeySoldDeps.getLevelId?.() ?? "1-1",
      difficultyIndex: bossKeySoldDeps.runDifficultyIndex?.value ?? 0,
      targetScore: bossKeySoldDeps.targetScore,
      grid: options.grid.value,
      rows: options.ROWS,
      cols: options.COLS,
      bossTileDebuffContext: getBossTileDebuffContext(),
      touchGrid: options.touchGrid,
      releaseManacleBossTopRow: bossKeySoldDeps.releaseManacleBossTopRow,
      gridDropAnim: bossKeySoldDeps.gridDropAnim,
      snapshotGridCellsByTileId: bossKeySoldDeps.snapshotGridCellsByTileId,
      getTargetScoreCardEl: bossKeySoldDeps.getTargetScoreCardEl,
      getBossTapeStrip: options.getBossTapeStrip,
    });
  }

  return {
    crimsonTreasureDisabledSlotIndex,
    suppressed: options.suppressed,
    slug,
    bossSlugForMechanics: slug,
    bossMechanicsSuppressed: options.suppressed,
    isManacleBossGrid: isManacleBossGridFlag,
    isAmberBossMaskActive: isAmberBossMaskActiveFlag,
    isCrimsonBossMechanicsActive: isCrimsonBossMechanicsActiveFlag,
    isFlintBossActive: isFlintBossActiveFlag,
    tape,
    bossStripDef,
    softWordViolationPreview,
    bossSoftWordViolationPreview: softWordViolationPreview,
    oxBossViolationPreview,
    bossSubmitDangerPreview,
    bossTapeSoftPreview,
    getBossTileDebuffContext,
    refreshBossTileDebuffOnTile,
    playBossTapeTriggerCue,
    onBossTapeTriggerCue,
    onBossRestrictionTreasureCue,
    bindNotifyBossRestrictionTreasures,
    pickCrimsonDisabledTreasureSlotIndex,
    evaluateOxBossHit,
    clearVerdantDebuffsOnGrid: clearVerdantDebuffsOnGridLocal,
    applyHookBossAfterSubmit,
    onVerdantTreasureSold,
    onBossKeySold,
    bindBossKeySoldDeps,
    buildBossWildcardResolveContext,
    isCrimsonTreasureSlotDisabled,
  };
}
