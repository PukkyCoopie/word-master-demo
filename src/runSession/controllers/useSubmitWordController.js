import { ref, nextTick } from "vue";
import gsap from "gsap";
import { EASE_TRANSFORM } from "../../constants.js";
import { applyBossTileDebuffState } from "../../game/bossTileDebuff.js";
import {
  evaluateBossSoftWordViolation,
  getEndingLetterRarityForResolvedWord,
  nextMouthLockedLengthAfterSubmit,
} from "../../game/bossWordViolation.js";
import { getTreasureAccessoryExpiredSlotIndices } from "../../game/treasureHourglassRuntime.js";
import { isStandardRunFinalLevelIndex } from "../../levelDefinitions.js";
import {
  buildGridPresencePostLetterSteps,
  gridSelectedPositionKeySet,
} from "../../game/gridOnlyMaterialScoring.js";
import { resolveGridEffectTriggerCount } from "../../game/gridEffectTriggerCount.js";
import { buildPagerQuizOptions } from "../../game/pagerQuizOptions.js";
import { resolveSubmitWordInput } from "../../game/submitWordPipeline.js";
import { createSubmitScoringAnimController } from "../../game/submitScoringAnim.js";
import { shouldSkipSettlementAnim } from "../../settings/settlementAnimSkip.js";
import { resolveJudgedLengthTableLen, resolveWordLengthJudgmentBonus } from "../../game/wordLengthJudgmentBonus.js";
import { compareScore, scoreGte, scoreLt } from "../../utils/scoreInteger.js";
import { reportClientError } from "../../platform/clientErrorReporter.js";
import {
  getBaseScoreForRarity,
  getWordLetterCount,
  withWildcardsResolvedForScoring,
} from "../../composables/useScoring.js";
import { resolveScoringLetterRarity } from "../../game/treasureRarityTierMerge.js";
import {
  parseLevelSubFromId,
} from "../../vouchers/voucherRuntime.js";
import { readTreasureAccessoryIds } from "../../accessories/accessoryState.js";
import { collectGridLetterTiles } from "../../treasures/treasureLogicShared.js";
import { computeWordScoreDetailedForSubmit } from "../../treasures/treasureScoring.js";
import {
  recordTreasureChapterWordPos,
  recordTreasureLevelVowelLetters,
} from "../../treasures/treasureRunTracking.js";
import { TREASURE_118_ID } from "../../treasures/items/treasure_118.js";
import { releaseAllGamePause, isGamePaused } from "../../game/gamePause.js";

/** @typedef {import('../runSessionTypes.js').SubmitController} SubmitController */

/** 次数 -1 动效后再进入记分 */
const ACTION_COUNT_DELTA_BEAT_MS = 400;

/**
 * 供 GamePanel 在 computed / playfield gates 之前创建 busy ref（与 controller 共用同一对象）。
 * @returns {{ submitWordBusy: import('vue').Ref<boolean>, scoringAnimating: import('vue').Ref<boolean> }}
 */
export function createSubmitWordBusyRefs() {
  return {
    submitWordBusy: ref(false),
    scoringAnimating: ref(false),
    submitSettlementChunking: ref(false),
  };
}

/**
 * @typedef {Object} SubmitWordControllerOptions
 * @property {{ submitWordBusy: import('vue').Ref<boolean>, scoringAnimating: import('vue').Ref<boolean>, submitSettlementChunking: import('vue').Ref<boolean> }} busy
 * @property {object} scoringRefs 计分 UI ref（animScoreSum 等）
 * @property {ReturnType<import('../../game/scoreBubbleFx.js').createScoreBubbleFx>} scoringFx
 * @property {object} scoringAnimCallbacks submitScoringAnim 回调（仍由 GamePanel 提供 DOM/流程钩子）
 * @property {ReturnType<import('../../game/gridDropAnim.js').createGridDropAnim>} gridDropAnim
 * @property {ReturnType<import('../../game/submitTreasureSlotFx.js').createSubmitTreasureSlotFx> & ReturnType<import('../../game/submitTileLeaveAnim.js').createSubmitTileLeaveAnim>} submitFx
 * @property {object} scoringAnimConstants
 * @property {{ transitionBusy: import('vue').Ref<boolean>, showShop: import('vue').Ref<boolean>, isRunFlowOverlayOpen: () => boolean }} phase
 * @property {{ dictFatalError: import('vue').Ref<boolean>, dictionaryReady: import('vue').Ref<boolean> }} dict
 * @property {object} grid
 * @property {object} run
 * @property {object} boss
 * @property {object} pager
 * @property {object} ui
 * @property {object} dom
 * @property {object} callbacks
 * @property {(ms: number) => Promise<void>} sleep
 * @property {object} [gsapLib]
 * @property {object} firstWordTutorial
 * @property {() => void} scheduleTutorialSpotlightUpdate
 * @property {() => void} flashSubmitCountDelta
 */

/**
 * 拼词提交流程编排（任务 3.3）：busy 锁、算分、记分动画、Boss/成就/关卡收尾。
 *
 * @param {SubmitWordControllerOptions} options
 * @returns {SubmitController & { seedAnimFormulaFromSubmitDetailed: (detailed: object) => void }}
 */
export function useSubmitWordController(options) {
  const {
    busy,
    scoringRefs,
    scoringFx,
    scoringAnimCallbacks,
    gridDropAnim,
    submitFx,
    scoringAnimConstants,
    phase,
    dict,
    grid: gridApi,
    run,
    boss,
    pager,
    ui,
    dom,
    callbacks,
    sleep,
    gsapLib = gsap,
    firstWordTutorial,
    scheduleTutorialSpotlightUpdate,
    flashSubmitCountDelta,
  } = options;

  const { submitWordBusy, scoringAnimating, submitSettlementChunking } = busy;

  /** @type {ReturnType<typeof createSubmitScoringAnimController> | null} */
  let submitScoringAnimControllerInstance = null;

  function getSubmitScoringAnimController() {
    if (submitScoringAnimControllerInstance) return submitScoringAnimControllerInstance;
    submitScoringAnimControllerInstance = createSubmitScoringAnimController({
      refs: {
        ...scoringRefs,
        scoringAnimating,
        submitWordBusy,
        submitSettlementChunking,
      },
      getDom: dom,
      fx: scoringFx,
      callbacks: scoringAnimCallbacks,
      gridDropAnim,
      submitFx,
      constants: scoringAnimConstants,
      nextTick,
      sleep,
      gsap: gsapLib,
    });
    return submitScoringAnimControllerInstance;
  }

  function seedAnimFormulaFromSubmitDetailed(detailed) {
    getSubmitScoringAnimController().seedAnimFormulaFromSubmitDetailed(detailed);
  }

  async function runSubmitScoringSequence(tiles, detailed, resolvedWord = null, isLastSubmitChance = false) {
    return getSubmitScoringAnimController().runSubmitScoringSequence(
      tiles,
      detailed,
      resolvedWord,
      isLastSubmitChance,
    );
  }

  async function submitWord() {
    if (dict.dictFatalError.value) return;
    if (phase.transitionBusy.value || phase.showShop.value || phase.isRunFlowOverlayOpen()) return;
    if (scoringAnimating.value || submitWordBusy.value) return;
    if (!dict.dictionaryReady.value) return;

    const submitInput = resolveSubmitWordInput({
      buildParts: callbacks.buildEffectiveWordPartsForSubmit,
      resolveWord: callbacks.resolveWordFromEffectiveParts,
    });
    if (submitInput.error === "empty") return;
    if (submitInput.error === "invalid") {
      callbacks.showToast("不是有效单词");
      callbacks.triggerHaptic("reject");
      return;
    }

    if (ui.firstWordTutorialPhase.value === "retry" || ui.firstWordTutorialPhase.value === "retryHint") {
      firstWordTutorial.onSecondWordSubmitted();
    } else if (ui.firstWordTutorialPhase.value === "submit") {
      firstWordTutorial.onFirstWordSubmitted();
      scheduleTutorialSpotlightUpdate();
    }

    callbacks.triggerHaptic("confirm");
    ui.wordDefinitionHiddenForWordLeave.value = true;
    const skipSettlementBatch = shouldSkipSettlementAnim(run.isEndlessRun.value === true);
    submitWordBusy.value = true;
    if (skipSettlementBatch) {
      submitSettlementChunking.value = true;
      await nextTick();
    }
    let submitChanceConsumed = false;
    let scoreBeforeHand = 0;
    /** @type {"prepare"|"score"|"scoringAnim"|"postSubmit"|"settlement"} */
    let submitPhase = "prepare";
    let submitResolvedWord = "";

    try {
      const { wordPattern: wordPattern0, resolvedWord } = submitInput;
      submitResolvedWord = resolvedWord;
      const ownedSlotTreasureIds = run.ownedTreasures.value.map((s) => s?.treasureId ?? null);
      const tiles = withWildcardsResolvedForScoring(
        callbacks.listEffectiveTilesForSubmit().map((tile) => {
          const pres = callbacks.tilePresentationInResolvedWord(tile, resolvedWord, wordPattern0);
          const scoringRarity = resolveScoringLetterRarity(pres.rarity, ownedSlotTreasureIds);
          return {
            ...tile,
            letter: pres.letter,
            rarity: pres.rarity,
            baseScore: getBaseScoreForRarity(scoringRarity, gridApi.rarityLevelsByRarity.value),
          };
        }),
        resolvedWord,
        gridApi.rarityLevelsByRarity.value,
        ownedSlotTreasureIds,
      );

      const debuffCtx = callbacks.getBossTileDebuffContext();
      const bossSlugSubmit = callbacks.bossSlugForMechanics();
      for (const t of tiles) {
        if (t?.letter) applyBossTileDebuffState(t, bossSlugSubmit, debuffCtx);
      }

      const ownedSlotTreasureAccessoryIds = run.ownedTreasures.value.map((s) =>
        readTreasureAccessoryIds(s),
      );
      const expiredSlotIndices = getTreasureAccessoryExpiredSlotIndices(run.ownedTreasures.value);
      const isLastSubmitChance = gridApi.remainingWords.value === 1;
      const gSubmit = gridApi.grid.value;
      const submitExcludedGridKeys = gridSelectedPositionKeySet(gridApi.selectedTiles.value);
      const gridTilesForTreasures = collectGridLetterTiles(
        gSubmit,
        gridApi.ROWS,
        gridApi.COLS,
        null,
        { excludeBossDebuffed: true },
      );
      const remainingGridTilesForTreasures = collectGridLetterTiles(
        gSubmit,
        gridApi.ROWS,
        gridApi.COLS,
        submitExcludedGridKeys,
      );
      const gridPresencePostLetterSteps = buildGridPresencePostLetterSteps(
        gSubmit,
        gridApi.ROWS,
        gridApi.COLS,
        submitExcludedGridKeys,
        (tile) => resolveGridEffectTriggerCount(tile, ownedSlotTreasureIds),
      );

      const actualWordLen = Math.max(0, getWordLetterCount(tiles, resolvedWord));
      const lengthJb = resolveWordLengthJudgmentBonus({
        ownedVoucherIds: run.ownedVoucherIds.value,
        ownedSlotTreasureIds,
        presetId: run.runPresetId.value,
        runWordLengthJudgmentPenalty: gridApi.runWordLengthJudgmentPenalty.value,
        treasureRun: run.treasureRunState.value,
        ownedTreasureInstances: run.ownedTreasures.value,
      });
      const judgedLenTable = resolveJudgedLengthTableLen({
        wordLetterCount: actualWordLen,
        ownedVoucherIds: run.ownedVoucherIds.value,
        ownedSlotTreasureIds,
        presetId: run.runPresetId.value,
        runWordLengthJudgmentPenalty: gridApi.runWordLengthJudgmentPenalty.value,
        treasureRun: run.treasureRunState.value,
        ownedTreasureInstances: run.ownedTreasures.value,
        tiles,
        resolvedWord,
        getWordDefinition: callbacks.getWordDefinition,
        rarityLevelsByRarity: gridApi.rarityLevelsByRarity.value,
      });
      const soft = evaluateBossSoftWordViolation({
        slug: callbacks.bossSlugForMechanics(),
        wordLen: judgedLenTable,
        resolvedWord,
        endingLetterRarity: getEndingLetterRarityForResolvedWord(tiles, resolvedWord),
        getWordDefinition: callbacks.getWordDefinition,
        usedLengthsThisLevel: boss.usedWordLengthsThisBoss.value,
        mouthLockedLength: boss.mouthLockedLengthBoss.value,
        clubRequiredKey: boss.clubRequiredKeyBoss.value || "",
        ownedSlotTreasureIds,
      });
      const submitViolated = soft.violated;

      if (submitViolated) {
        dom.getBossTapeStrip()?.playAttentionPulse?.();
      }

      boss.crimsonTreasureDisabledSlotIndex.value = null;
      let crimsonSet = /** @type {Set<number> | null} */ (null);
      if (callbacks.bossSlugForMechanics() === "crimson_heart") {
        const ix = callbacks.pickCrimsonDisabledTreasureSlotIndex();
        if (ix != null) {
          crimsonSet = new Set([ix]);
          boss.crimsonTreasureDisabledSlotIndex.value = ix;
        }
      }
      if (expiredSlotIndices.length) {
        crimsonSet = crimsonSet
          ? new Set([...crimsonSet, ...expiredSlotIndices])
          : new Set(expiredSlotIndices);
      }

      submitPhase = "score";
      let detailed = computeWordScoreDetailedForSubmit(
        tiles,
        ownedSlotTreasureIds,
        gridApi.basketballWordsSubmitted.value,
        gridApi.remainingRemovals.value,
        gridApi.spellCountsByLength.value,
        gridApi.deckCount.value,
        isLastSubmitChance,
        gridApi.lengthLevelsByLength.value,
        gridApi.rarityLevelsByRarity.value,
        gridPresencePostLetterSteps,
        ownedSlotTreasureAccessoryIds,
        1,
        lengthJb,
        {
          disabledTreasureSlotIndices: crimsonSet,
          bossFlintQuarter: boss.isFlintBossActive.value,
          skipPrepareSubmitScoringBank: submitViolated,
          skipFinalScoreTreasureSteps: submitViolated,
          lengthUpgradeObservatoryExtra: gridApi.lengthUpgradeObservatoryExtra.value,
          rng: run.runRandom,
          resolvedWord,
          treasureRun: run.treasureRunState.value,
          money: run.money.value,
          ownedTreasureInstances: run.ownedTreasures.value,
          getWordDefinition: callbacks.getWordDefinition,
          gridTiles: gridTilesForTreasures,
          remainingGridTiles: remainingGridTilesForTreasures,
          submitExcludedGridPositionKeys: submitExcludedGridKeys,
          grid: gSubmit,
          gridRows: gridApi.ROWS,
          gridCols: gridApi.COLS,
          fullDeck: gridApi.initialDeckSnapshot.value,
        },
      );

      if (submitViolated) {
        await callbacks.notifyBossRestrictionTreasures();
        dom.getBossTapeStrip()?.playViolationWobble?.();
        const lp = (detailed.letterParts || []).map((p) => ({
          ...p,
          baseScore: 0,
          rarityBonus: 0,
          tileScoreBonus: 0,
          materialScoreBonus: 0,
          letterMultBonus: 0,
        }));
        detailed = {
          ...detailed,
          letterParts: lp,
          scoreSum: 0,
          finalScore: 0,
          postLetterTreasureSteps: [],
          finalScoreTreasureSteps: [],
          bossSoftViolation: true,
        };
      }

      scoreBeforeHand = gridApi.currentScore.value;
      const deferWordSubmitForPager =
        !submitViolated &&
        ownedSlotTreasureIds.some((id) => String(id ?? "").trim() === TREASURE_118_ID);
      pager.pendingPagerQuizSession.value = deferWordSubmitForPager
        ? buildPagerQuizOptions(resolvedWord, run.runRandom)
        : null;
      const shouldDeferWordSubmit = deferWordSubmitForPager && !!pager.pendingPagerQuizSession.value;

      if (!shouldDeferWordSubmit) {
        callbacks.recordWordSubmit(run.runMatchStats.value, {
          word: resolvedWord,
          score: detailed.finalScore,
          length: actualWordLen,
        });
        callbacks.maybeReportTapTapBestSingleWordScore(detailed.finalScore);
        if (!submitViolated) {
          callbacks.tryConsumeHintOnSuccessfulSubmit?.(resolvedWord);
          callbacks.noteCollectionWordSubmitted({
            word: resolvedWord,
            score: detailed.finalScore,
            length: actualWordLen,
            tiles,
          });
        }
      } else {
        callbacks.setDeferredWordSubmitPayload({
          word: resolvedWord,
          length: actualWordLen,
          tiles,
          detailedRef: detailed,
        });
      }

      recordTreasureChapterWordPos(run.treasureRunState.value, resolvedWord, callbacks.getWordDefinition);
      recordTreasureLevelVowelLetters(
        run.treasureRunState.value,
        tiles.map((t) => ({ letter: t?.letter ?? "" })),
        ownedSlotTreasureIds,
      );

      flashSubmitCountDelta();
      gridApi.remainingWords.value = Math.max(0, gridApi.remainingWords.value - 1);
      submitChanceConsumed = true;
      callbacks.notifyWordSubmitStarted?.();
      seedAnimFormulaFromSubmitDetailed(detailed);
      scoringAnimating.value = true;
      ui.wordDefinitionHiddenForWordLeave.value = true;
      await nextTick();
      if (skipSettlementBatch) {
        await nextTick();
      } else {
        await sleep(ACTION_COUNT_DELTA_BEAT_MS);
      }
      ui.scoringLetterIndex.value = -1;

      submitPhase = "scoringAnim";
      const iceShatterCount = await runSubmitScoringSequence(
        detailed.submitScoringTiles ?? tiles,
        detailed,
        resolvedWord,
        isLastSubmitChance,
      );

      if (!submitViolated) {
        submitPhase = "postSubmit";
        callbacks.flushSubmitAchievements(tiles, detailed, iceShatterCount);
      }

      if (!submitViolated) {
        if (
          parseLevelSubFromId(boss.currentLevel.value?.id ?? "1-1") === 3 &&
          tiles.length > 0 &&
          tiles.every((t) => String(t?.rarity ?? "common") === "common")
        ) {
          run.treasureRunState.value.allCommonBossClearRecorded = true;
        }
        const allGold =
          !submitViolated && tiles.length > 0 && tiles.every((t) => t?.materialId === "gold");
        if (allGold) run.treasureRunState.value.playedAllGoldWord = true;

        gridApi.recordSpellWordLength(judgedLenTable);
        const sub = parseLevelSubFromId(boss.currentLevel.value?.id ?? "1-1");
        if (sub <= 2) {
          for (const t of tiles) {
            const c = t?._deckCard;
            const uid =
              c && typeof c === "object"
                ? Number(/** @type {{ _dcUid?: number }} */ (c)._dcUid)
                : NaN;
            if (Number.isFinite(uid)) boss.pillarUsedDeckUids.value.add(uid);
          }
        }
        if (callbacks.bossSlugForMechanics() === "the_eye") {
          boss.usedWordLengthsThisBoss.value.add(judgedLenTable);
        }
        boss.mouthLockedLengthBoss.value = nextMouthLockedLengthAfterSubmit(
          boss.mouthLockedLengthBoss.value,
          judgedLenTable,
          false,
        );
        const oxHit =
          callbacks.bossSlugForMechanics() === "the_ox" &&
          callbacks.evaluateOxBossHit(judgedLenTable, gridApi.spellCountsByLength.value);
        if (oxHit) {
          const lostMoney = Math.max(0, Math.round(Number(run.money.value) || 0));
          dom.getBossTapeStrip()?.playOxMoneyLossCue?.(lostMoney);
          run.money.value = 0;
          await callbacks.notifyBossRestrictionTreasures("the_ox");
        }
      } else {
        boss.mouthLockedLengthBoss.value = nextMouthLockedLengthAfterSubmit(
          boss.mouthLockedLengthBoss.value,
          judgedLenTable,
          true,
        );
      }

      if (scoreGte(gridApi.currentScore.value, gridApi.targetScore.value)) {
        submitPhase = "settlement";
        const isFinalStandardWin =
          !run.isEndlessRun.value && isStandardRunFinalLevelIndex(run.levelIndex.value);
        if (isFinalStandardWin) {
          await callbacks.runLevelEndPreSettlementFx();
          callbacks.setSettlementSnapshot(callbacks.buildSettlementSnapshot());
          await callbacks.openRunEnd("win", { preserveSettlement: true });
        } else {
          await callbacks.openStageSettlement();
        }
      } else if (gridApi.remainingWords.value <= 0 && scoreLt(gridApi.currentScore.value, gridApi.targetScore.value)) {
        await callbacks.openRunEnd("fail");
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e ?? "");
      console.error("[submitWord]", {
        phase: submitPhase,
        word: submitResolvedWord,
        message: errMsg,
        error: e,
      });
      void reportClientError({
        source: "submitWord",
        phase: submitPhase,
        message: errMsg,
        stack: e instanceof Error ? e.stack : undefined,
        extra: {
          wordLen: String(submitResolvedWord?.length ?? 0),
        },
      });
      pager.pagerQuizSession.value = null;
      pager.pendingPagerQuizSession.value = null;
      callbacks.clearDeferredWordSubmitPayload();
      callbacks.clearPagerQuizPendingResolve?.();
      if (isGamePaused()) releaseAllGamePause();
      if (submitChanceConsumed) {
        gridApi.remainingWords.value += 1;
        if (compareScore(gridApi.currentScore.value, scoreBeforeHand) !== 0) {
          gridApi.currentScore.value = scoreBeforeHand;
        }
      }
      scoringAnimating.value = false;
      submitSettlementChunking.value = false;
      ui.wordDefinitionHiddenForWordLeave.value = false;
      ui.scoringLetterIndex.value = -1;
      ui.roundScoreOverride.value = null;
      ui.submitTranslationLines.value = [];
      callbacks.setSubmitScoringAppendPresentation?.(null);
    callbacks.setSubmitScoringAppendPresentations?.([]);
      const tw = dom.getWordTranslationWrap?.();
      if (tw) {
        gsapLib.killTweensOf(tw);
        tw.style.height = "";
        tw.style.overflow = "";
      }
      const submitErrorMessage = (() => {
        const detail = errMsg.trim();
        if (!detail) return "提交出错";
        if (/hasOwn is not a function|\.at is not a function|replaceAll is not a function/i.test(detail)) {
          return "提交出错：系统版本过低，请更新应用";
        }
        if (import.meta.env.DEV) return `提交出错: ${detail}`;
        if (/^treasureId=\d+/i.test(detail)) return "提交出错（宝藏效果异常）";
        if (detail.length <= 48) return `提交出错: ${detail}`;
        return "提交出错";
      })();
      callbacks.showToast(submitErrorMessage);
    } finally {
      submitWordBusy.value = false;
      submitSettlementChunking.value = false;
    }
  }

  return {
    submitWordBusy,
    scoringAnimating,
    submitSettlementChunking,
    submitWord,
    seedAnimFormulaFromSubmitDetailed,
  };
}
