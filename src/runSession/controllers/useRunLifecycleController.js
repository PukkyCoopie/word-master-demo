import { computed, nextTick, ref } from "vue";
import gsap from "gsap";
import { EASE_TRANSFORM } from "../../constants.js";
import { getRunLevelAtIndex, LEVELS } from "../../levelDefinitions.js";
import { pickBossSlugForLevel } from "../../game/bossRoll.js";
import { applyBossTileDebuffToGrid } from "../../game/bossTileDebuff.js";
import { isBossLevelEnterRestrictionSlug } from "../../game/bossRestrictionCue.js";
import {
  applyTreasureLevelStartActionAdjustments,
} from "../../treasures/treasureRegistry.js";
import {
  isBossEffectsSuppressedByTreasures,
  resolveBossSlugForMechanics,
} from "../../game/treasureBossSuppress.js";
import { BOSS_CLUB_POS_OPTIONS } from "../../game/bossWordViolation.js";
import {
  BOSS_BLIND_REROLL_COST_DOLLARS,
  canPayBossBlindReroll,
  getBaseHandsPerLevel,
  getBaseRemovalsPerLevel,
  getGlyphPurchaseTargetLevelIndex,
  getRemovalsForWaterBoss,
  getSubmitHandsForNeedleBoss,
  hasBossBlindRerollVoucher,
  parseLevelSubFromId,
} from "../../vouchers/voucherRuntime.js";
import {
  getPresetHandsPerLevelDelta,
  getPresetRemovalsPerLevelDelta,
} from "../../game/runPresetRuntime.js";
import { getDifficultyRemovalsDelta, resolveLevelTargetScoreForDifficulty } from "../../game/runDifficultyRuntime.js";
import {
  sumTreasureHandsPerLevelDelta,
  sumTreasureRemovalsPerLevelDelta,
} from "../../treasures/treasureRegistry.js";
import {
  getChapterFromLevelId,
  reportEndlessChapterLeaderboard,
} from "../../taptap/tapTapLeaderboardSync.js";
import { shouldSkipDecorativeMotion } from "../../settings/animationSpeed.js";
import { TREASURE_118_ID } from "../../treasures/items/treasure_118.js";
import { requestCloudSync } from "../../save/cloudSave/cloudSaveSync.js";

/** @typedef {import('../runSessionTypes.js').RunLifecycleController} RunLifecycleController */

/**
 * @typedef {Object} RunLifecycleControllerOptions
 * @property {{ transitionBusy: import('vue').Ref<boolean> }} phase
 * @property {{
 *   levelIndex: import('vue').Ref<number>,
 *   money: import('vue').Ref<number>,
 *   runPresetId: import('vue').Ref<string>,
 *   runDifficultyIndex: import('vue').Ref<number>,
 *   runSeedNumeric: number,
 *   isEndlessRun: import('vue').Ref<boolean>,
 *   ownedTreasures: import('vue').Ref<(object | null)[]>,
 *   ownedVoucherIds: import('vue').Ref<string[]>,
 *   runRandom: () => number,
 * }} run
 * @property {{
 *   grid: import('vue').Ref<object[][]>,
 *   deck: import('vue').Ref<object[]>,
 *   initialDeckSnapshot: import('vue').Ref<object[]>,
 *   activeBossSlug: import('vue').Ref<string>,
 *   targetScore: import('vue').Ref<number>,
 *   resetLevel: (levelDef: object, opts: object) => void,
 *   ROWS: number,
 *   COLS: number,
 * }} grid
 * @property {{ runGridDropAnimation: (tiles: object | null, opts?: object) => Promise<void>, measureGridTileStepY: () => number }} [gridDropAnim]
 * @property {{
 *   showShop?: import('vue').Ref<boolean>,
 *   showRunEnd?: import('vue').Ref<boolean>,
 *   runWalletFloor?: import('vue').ComputedRef<number>,
 * }} [shop]
 * @property {{
 *   pillarUsedDeckUids: import('vue').Ref<Set<number>>,
 *   verdantTreasureSold: import('vue').Ref<boolean>,
 * }} bossPersist
 * @property {{
 *   bossMechanicsSuppressed: import('vue').ComputedRef<boolean>,
 *   bossSlugForMechanics: () => string,
 *   getBossTileDebuffContext: () => object,
 * }} bossApi
 * @property {{
 *   maskBubbleDevScenarioActive: import('vue').Ref<boolean>,
 *   allIceDevScenarioActive: import('vue').Ref<boolean>,
 *   promoScreenshotDevPresetActive: import('vue').Ref<number>,
 *   applyRandomBLettersToGrid: (g: object[], rows: number, cols: number, rng: () => number, n: number) => void,
 *   applyIceMaterialToAllGridTiles: (g: object[], rows: number, cols: number) => void,
 *   applyIceMaterialToAllDeckCards: (deck: object[]) => void,
 *   applyPromoGameplayGridMaterials: (g: object[], rows: number, cols: number, rng: () => number) => void,
 *   applyPromoGameplayTileBonuses: (g: object[], rows: number, cols: number, rng: () => number) => void,
 * }} dev
 * @property {{
 *   getBossBlindRerollLayer: () => { playClose?: () => Promise<void> } | null,
 *   getIrisTransition: () => { play?: (opts: object) => Promise<void> } | null,
 *   wobbleGameTreasureSlot: (slotIndex: number) => Promise<void>,
 * }} dom
 * @property {{
 *   isShopNextLevelBlockedByTutorial?: () => boolean,
 *   scheduleRunAutoSave: () => void,
 *   showToast: (msg: string) => void,
 *   noteRunMoneySpent: (amount: number) => void,
 *   flushAchievementUnlocks: () => void,
 *   recordPointerClientFromEvent: (event: Event | undefined) => void,
 * }} callbacks
 */

/**
 * 关卡进退：reset 选项、商店离店进关、Boss blind reroll、寻呼机测验、进关 intro（任务 7.1）。
 *
 * @param {RunLifecycleControllerOptions} options
 * @returns {RunLifecycleController}
 */
export function useRunLifecycleController(options) {
  const { phase, run, grid, bossPersist, bossApi, dev, dom, callbacks } = options;
  const gridDropAnim = options.gridDropAnim ?? null;
  const shopOpts = options.shop ?? null;
  if (shopOpts?.showShop) showShopRef = shopOpts.showShop;
  if (shopOpts?.showRunEnd) showRunEndRef = shopOpts.showRunEnd;
  if (shopOpts?.runWalletFloor) runWalletFloorComputed = shopOpts.runWalletFloor;
  if (gridDropAnim) {
    runGridDropAnimationImpl = gridDropAnim.runGridDropAnimation;
    measureGridTileStepYImpl = gridDropAnim.measureGridTileStepY;
  }
  const { transitionBusy } = phase;
  const {
    levelIndex,
    money,
    runPresetId,
    runDifficultyIndex,
    runSeedNumeric,
    isEndlessRun,
    ownedTreasures,
    ownedVoucherIds,
    runRandom,
    treasureRunState,
  } = run;
  const {
    grid: gridState,
    deck,
    initialDeckSnapshot,
    activeBossSlug,
    targetScore,
    resetLevel,
    ROWS,
    COLS,
  } = grid;
  const { pillarUsedDeckUids, verdantTreasureSold } = bossPersist;
  const { bossMechanicsSuppressed, bossSlugForMechanics, getBossTileDebuffContext } = bossApi;
  const glyphShopSkipLevelAdvance = ref(false);
  const usedWordLengthsThisBoss = ref(/** @type {Set<number>} */ (new Set()));
  const mouthLockedLengthBoss = ref(/** @type {number | null} */ (null));
  const clubRequiredKeyBoss = ref(/** @type {string | null} */ (null));
  const bossRerollSession = ref(
    /** @type {{ levelId: string, slug: string, rerollsUsed: number, rerollNonce: number } | null} */ (null),
  );
  const pagerQuizSession = ref(/** @type {object | null} */ (null));
  const pendingPagerQuizSession = ref(/** @type {object | null} */ (null));
  const pendingBossSlugOverride = ref("");
  /** @type {((value: { correct?: boolean, skipped?: boolean }) => void) | null} */
  let pagerQuizPendingResolve = null;
  const pendingAfterGridTilesSettled = [];
  /** @type {gsap.core.Timeline | null} */
  let levelAdvanceFxTl = null;

  let resetLevelAfterTreasurePrepImpl = async (_levelDef, _opts) => {};
  /** @type {(opts?: object) => Promise<void>} */
  let notifyShopLeaveImpl = async () => {};
  /** @type {(slug?: string) => Promise<void>} */
  let notifyBossRestrictionTreasuresImpl = async () => {};
  /** @type {(treasureId: string) => number} */
  let findOwnedTreasureSlotIndexImpl = () => -1;
  /** @type {(spellId: string) => Promise<void>} */
  let replayLastSpellInRunImpl = async () => {};
  let gridIntroDoneRef = /** @type {import('vue').Ref<boolean> | null} */ (null);
  let gridRefillAnimatingRef = /** @type {import('vue').Ref<boolean> | null} */ (null);
  let gridTileRefsRef = /** @type {import('vue').Ref<(HTMLElement | null)[]> | null} */ (null);
  let updateSlotPositionsImpl = (_force) => {};
  let syncPlayerMarkBatchCounterFromGridImpl = () => {};
  let ensureSlotRafRunningImpl = () => {};
  let tryCeruleanBellFlyInAfterGridStableImpl = async () => {};
  let beginFirstWordTutorialAfterGridSettledImpl = async (_opts) => {};
  let runHeaderBarRefComputed = /** @type {import('vue').ComputedRef<{ levelTitleBoxRef?: HTMLElement | null } | null> | null} */ (
    null
  );
  /** @type {import('vue').Ref<boolean> | null} */
  let showShopRef = null;
  /** @type {import('vue').Ref<boolean> | null} */
  let showRunEndRef = null;
  /** @type {import('vue').ComputedRef<number> | null} */
  let runWalletFloorComputed = null;

  let runGridDropAnimationImpl = async (_tiles, _opts) => {};
  let measureGridTileStepYImpl = () => 48;

  function ownedSlotTreasureIdListEarly() {
    return ownedTreasures.value.map((s) => s?.treasureId ?? null);
  }

  function pickClubRequiredKey() {
    const opts = [...BOSS_CLUB_POS_OPTIONS];
    return opts[Math.floor(runRandom() * opts.length)]?.key ?? "n";
  }

  const endlessReportedLeaderboardChapter = ref(0);

  function getNextLevelDefAfterShop() {
    if (glyphShopSkipLevelAdvance.value) {
      return getRunLevelAtIndex(levelIndex.value);
    }
    return getRunLevelAtIndex(levelIndex.value + 1);
  }

  function shouldOfferBossBlindRerollBeforeShopLeave() {
    const next = getNextLevelDefAfterShop();
    if (parseLevelSubFromId(next?.id) !== 3) return false;
    return hasBossBlindRerollVoucher(ownedVoucherIds.value);
  }

  function openBossBlindRerollSession() {
    const next = getNextLevelDefAfterShop();
    const levelId = next?.id ?? "1-3";
    bossRerollSession.value = {
      levelId,
      slug: pickBossSlugForLevel(levelId, runSeedNumeric, 0),
      rerollsUsed: 0,
      rerollNonce: 0,
    };
  }

  function applyBossPostGridBuild(g, slug) {
    applyBossTileDebuffToGrid(g, slug, getBossTileDebuffContext(), ROWS, COLS);
  }

  function buildLevelResetRunOpts(levelDef) {
    const id = levelDef?.id ?? "1-1";
    const override = String(pendingBossSlugOverride.value ?? "").trim();
    const slug =
      override && parseLevelSubFromId(id) === 3
        ? override
        : pickBossSlugForLevel(id, runSeedNumeric);
    const mechSlug = resolveBossSlugForMechanics(
      slug,
      ownedSlotTreasureIdListEarly(),
      treasureRunState?.value,
    );
    const ts = resolveLevelTargetScoreForDifficulty(id, mechSlug, runDifficultyIndex.value);
    let rem =
      getBaseRemovalsPerLevel(ownedVoucherIds.value) +
      getPresetRemovalsPerLevelDelta(runPresetId.value) +
      getDifficultyRemovalsDelta(runDifficultyIndex.value) +
      sumTreasureRemovalsPerLevelDelta(ownedSlotTreasureIdListEarly());
    if (mechSlug === "the_water") rem = getRemovalsForWaterBoss(rem);
    let hands =
      getBaseHandsPerLevel(ownedVoucherIds.value) +
      getPresetHandsPerLevelDelta(runPresetId.value) +
      sumTreasureHandsPerLevelDelta(ownedSlotTreasureIdListEarly());
    hands = Math.max(0, hands);
    if (mechSlug === "the_needle") hands = getSubmitHandsForNeedleBoss(hands);
    const actionAdjusted = applyTreasureLevelStartActionAdjustments(ownedSlotTreasureIdListEarly(), {
      hands,
      removals: rem,
      treasureRun: treasureRunState?.value,
    });
    hands = actionAdjusted.hands;
    rem = actionAdjusted.removals;
    if (parseLevelSubFromId(id) === 3) {
      usedWordLengthsThisBoss.value = new Set();
      mouthLockedLengthBoss.value = null;
      if (mechSlug === "the_club") clubRequiredKeyBoss.value = pickClubRequiredKey();
      else clubRequiredKeyBoss.value = null;
      if (mechSlug === "verdant_leaf") verdantTreasureSold.value = false;
    } else {
      clubRequiredKeyBoss.value = null;
    }
    return {
      remainingWords: hands,
      remainingRemovals: rem,
      targetScore: ts,
      bossSlug: slug,
      postGridBuild: (g) => {
        applyBossPostGridBuild(g, mechSlug);
        if (dev.maskBubbleDevScenarioActive.value) {
          dev.applyRandomBLettersToGrid(g, ROWS, COLS, runRandom, 2);
        }
        if (dev.allIceDevScenarioActive.value) {
          dev.applyIceMaterialToAllGridTiles(g, ROWS, COLS);
          dev.applyIceMaterialToAllDeckCards(initialDeckSnapshot.value);
          dev.applyIceMaterialToAllDeckCards(deck.value);
        }
        if (dev.promoScreenshotDevPresetActive.value === 1) {
          dev.applyPromoGameplayGridMaterials(g, ROWS, COLS, runRandom);
          dev.applyPromoGameplayTileBonuses(g, ROWS, COLS, runRandom);
        }
      },
    };
  }

  function scheduleAfterGridTilesSettled(fn) {
    if (typeof fn !== "function") return;
    pendingAfterGridTilesSettled.push(fn);
  }

  async function runPendingAfterGridTilesSettled() {
    const batch = pendingAfterGridTilesSettled.splice(0);
    for (const fn of batch) {
      await fn();
    }
  }

  function clearPendingAfterGridTilesSettled() {
    pendingAfterGridTilesSettled.length = 0;
  }

  function syncEndlessLeaderboardChapterBaseline(levelId) {
    if (!isEndlessRun.value || runDifficultyIndex.value <= 0) return;
    const chapter = getChapterFromLevelId(levelId);
    if (chapter > endlessReportedLeaderboardChapter.value) {
      endlessReportedLeaderboardChapter.value = chapter;
    }
  }

  function maybeReportEndlessChapterLeaderboard(levelId) {
    if (!isEndlessRun.value || runDifficultyIndex.value <= 0) return;
    const chapter = getChapterFromLevelId(levelId);
    if (chapter <= 0 || chapter <= endlessReportedLeaderboardChapter.value) return;
    endlessReportedLeaderboardChapter.value = chapter;
    reportEndlessChapterLeaderboard(chapter);
  }

  function resetTapTapLeaderboardRunTracking() {
    endlessReportedLeaderboardChapter.value = 0;
  }

  function clearPagerQuizPendingResolve() {
    pagerQuizPendingResolve = null;
  }

  /**
   * @param {{ session?: object }} [opts]
   */
  async function runPagerQuizRequest(opts = {}) {
    const session = opts.session ?? pendingPagerQuizSession.value;
    if (!session?.options?.length) return { skipped: true };

    const slotIx = findOwnedTreasureSlotIndexImpl(TREASURE_118_ID);
    if (slotIx >= 0) {
      await dom.wobbleGameTreasureSlot(slotIx);
    }

    return new Promise((resolve) => {
      pagerQuizPendingResolve = resolve;
      pagerQuizSession.value = session;
    });
  }

  /**
   * @param {{ correct?: boolean, atHalfClose?: boolean }} payload
   */
  function onPagerQuizResolved(payload) {
    if (!payload?.atHalfClose) return;
    pagerQuizPendingResolve?.({
      correct: payload.correct === true,
      skipped: false,
    });
    pagerQuizPendingResolve = null;
  }

  function onPagerQuizClosed() {
    pagerQuizSession.value = null;
    pendingPagerQuizSession.value = null;
  }

  async function runGridIntroAfterReset() {
    await nextTick();
    const stepY = measureGridTileStepYImpl();
    const tileRefs = gridTileRefsRef?.value ?? [];
    for (let i = 0; i < ROWS * COLS; i++) {
      const el = tileRefs[i];
      if (!el) continue;
      const row = Math.floor(i / COLS);
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: -(row + 2.2) * stepY, opacity: 0.55 });
    }
    if (gridIntroDoneRef) gridIntroDoneRef.value = true;
    await new Promise((r) => requestAnimationFrame(r));
    if (gridRefillAnimatingRef) gridRefillAnimatingRef.value = true;
    await runGridDropAnimationImpl(null, { initial: true });
    if (gridRefillAnimatingRef) gridRefillAnimatingRef.value = false;
    await runPendingAfterGridTilesSettled();
    updateSlotPositionsImpl(true);
    await nextTick();
    await tryCeruleanBellFlyInAfterGridStableImpl();
    await beginFirstWordTutorialAfterGridSettledImpl();
    nextTick(() => updateSlotPositionsImpl(true));
  }

  function playLevelAdvanceHeaderFx() {
    return new Promise((resolve) => {
      const el = runHeaderBarRefComputed?.value?.levelTitleBoxRef ?? null;
      if (!el) {
        resolve();
        return;
      }
      if (shouldSkipDecorativeMotion()) {
        resolve();
        return;
      }
      if (levelAdvanceFxTl) {
        levelAdvanceFxTl.kill();
        levelAdvanceFxTl = null;
      }
      gsap.killTweensOf(el, "scale,rotation,boxShadow");
      const shadowDefault = "0 2px 8px rgba(0, 0, 0, 0.08)";
      const shadowGlow =
        "0 0 0 3px rgba(237, 194, 46, 0.55), 0 4px 18px rgba(237, 194, 46, 0.3)";
      gsap.set(el, {
        transformOrigin: "50% 50%",
        scale: 1,
        rotation: 0,
        boxShadow: shadowDefault,
      });

      levelAdvanceFxTl = gsap.timeline({
        onComplete: () => {
          levelAdvanceFxTl = null;
          gsap.set(el, { clearProps: "boxShadow" });
          gsap.set(el, { scale: 1, rotation: 0 });
          resolve();
        },
      });

      levelAdvanceFxTl.fromTo(
        el,
        { scale: 1, rotation: 0 },
        {
          scale: 1.14,
          rotation: -2.5,
          boxShadow: shadowGlow,
          duration: 0.34,
          ease: EASE_TRANSFORM,
        },
        0,
      );
      levelAdvanceFxTl.to(
        el,
        {
          scale: 1,
          rotation: 0,
          boxShadow: shadowDefault,
          duration: 0.58,
          ease: EASE_TRANSFORM,
        },
        0.2,
      );
    });
  }

  async function executeShopLeaveToNextLevel(event) {
    if (transitionBusy.value) return;
    callbacks.recordPointerClientFromEvent(event);
    transitionBusy.value = true;

    try {
      await notifyShopLeaveImpl({
        replayLastSpellInRun: replayLastSpellInRunImpl,
      });

      const nextLevel = async () => {
        if (gridIntroDoneRef) gridIntroDoneRef.value = false;
        if (glyphShopSkipLevelAdvance.value) {
          glyphShopSkipLevelAdvance.value = false;
          const cur = getRunLevelAtIndex(levelIndex.value);
          await resetLevelAfterTreasurePrepImpl(cur);
        } else {
          levelIndex.value += 1;
          const next = getRunLevelAtIndex(levelIndex.value);
          await resetLevelAfterTreasurePrepImpl(next);
          maybeReportEndlessChapterLeaderboard(next.id);
        }
        pendingBossSlugOverride.value = "";
        if (showShopRef) showShopRef.value = false;
      };

      const playFx = dom.getIrisTransition()?.play;
      if (typeof playFx === "function") {
        await playFx({ onCovered: nextLevel });
      } else {
        await nextLevel();
      }

      await nextTick();
      if (!showRunEndRef?.value) {
        await Promise.all([runGridIntroAfterReset(), playLevelAdvanceHeaderFx()]);
      }
      callbacks.flushAchievementUnlocks();
      callbacks.scheduleRunAutoSave();
      requestCloudSync({ priority: "high" });
    } catch (e) {
      console.error(e);
      callbacks.showToast("进关出错");
    } finally {
      transitionBusy.value = false;
      if (gridRefillAnimatingRef) gridRefillAnimatingRef.value = false;
      if (showShopRef && !showShopRef.value && gridIntroDoneRef && !gridIntroDoneRef.value) {
        gridIntroDoneRef.value = true;
      }
      ensureSlotRafRunningImpl();
    }
  }

  async function onShopNextLevel(event) {
    if (callbacks.isShopNextLevelBlockedByTutorial?.()) return;
    if (transitionBusy.value) return;
    if (shouldOfferBossBlindRerollBeforeShopLeave() && !bossRerollSession.value) {
      openBossBlindRerollSession();
      return;
    }
    await executeShopLeaveToNextLevel(event);
  }

  function onBossBlindRerollPaid() {
    const s = bossRerollSession.value;
    if (!s) return;
    if (
      !canPayBossBlindReroll(
        ownedVoucherIds.value,
        s.rerollsUsed,
        money.value,
        runWalletFloorComputed?.value ?? 0,
      )
    ) {
      return;
    }
    money.value -= BOSS_BLIND_REROLL_COST_DOLLARS;
    callbacks.noteRunMoneySpent(BOSS_BLIND_REROLL_COST_DOLLARS);
    const rerollNonce = s.rerollNonce + 1;
    const rerollsUsed = s.rerollsUsed + 1;
    const slug = pickBossSlugForLevel(s.levelId, runSeedNumeric, rerollNonce);
    bossRerollSession.value = { ...s, slug, rerollNonce, rerollsUsed };
    callbacks.scheduleRunAutoSave();
  }

  async function onBossBlindRerollContinue(event) {
    const s = bossRerollSession.value;
    if (!s) return;
    pendingBossSlugOverride.value = s.slug;
    await dom.getBossBlindRerollLayer()?.playClose?.();
    bossRerollSession.value = null;
    await executeShopLeaveToNextLevel(event);
  }

  async function dismissBossRerollOnBack() {
    if (!bossRerollSession.value) return;
    const layer = dom.getBossBlindRerollLayer();
    if (layer?.playClose) {
      await layer.playClose();
    }
    bossRerollSession.value = null;
  }

  /**
   * 卷轴券购入后跳关：不推进 levelIndex，离店时 reset 当前关。
   * @param {string} voucherId
   */
  function applyGlyphVoucherLevelSkip(voucherId) {
    const vid = String(voucherId ?? "");
    if (vid !== "v_glyph_1" && vid !== "v_glyph_2") return false;
    const tix = getGlyphPurchaseTargetLevelIndex(levelIndex.value);
    if (tix == null) return false;
    levelIndex.value = tix;
    glyphShopSkipLevelAdvance.value = true;
    const L = LEVELS[tix];
    if (L) {
      targetScore.value = resolveLevelTargetScoreForDifficulty(L.id, "", runDifficultyIndex.value);
      activeBossSlug.value = "";
    }
    return true;
  }

  function getTreasureResetHooks() {
    return {
      scheduleAfterGridTilesSettled,
      clearPendingAfterGridTilesSettled,
      buildLevelResetRunOpts,
      resetLevel,
      syncPlayerMarkBatchCounterFromGrid: () => syncPlayerMarkBatchCounterFromGridImpl(),
      resolveBossSlugForMechanics,
      bossMechanicsSuppressed,
      isBossLevelEnterRestrictionSlug,
      getBossSlugForMechanics: bossSlugForMechanics,
      notifyBossRestrictionTreasures: (slug) => notifyBossRestrictionTreasuresImpl(slug),
    };
  }

  /**
   * @param {{
   *   resetLevelAfterTreasurePrep: (levelDef: object, opts?: object) => Promise<void>,
   *   notifyShopLeave: (opts?: object) => Promise<void>,
   *   notifyBossRestrictionTreasures: (slug?: string) => Promise<void>,
   *   findOwnedTreasureSlotIndex: (treasureId: string) => number,
   * }} treasures
   */
  function bindTreasures(treasures) {
    resetLevelAfterTreasurePrepImpl = treasures.resetLevelAfterTreasurePrep;
    notifyShopLeaveImpl = treasures.notifyShopLeave;
    notifyBossRestrictionTreasuresImpl = treasures.notifyBossRestrictionTreasures;
    findOwnedTreasureSlotIndexImpl = treasures.findOwnedTreasureSlotIndex;
  }

  /**
   * @param {{ runInRunSpellGrant: (spellId: string) => Promise<unknown> }} spellController
   */
  function bindSpell(spellController) {
    replayLastSpellInRunImpl = async (spellId) => {
      const sid = String(spellId ?? "").trim();
      if (!sid) return;
      await spellController.runInRunSpellGrant(sid);
    };
  }

  /**
   * @param {{
   *   gridIntroDone: import('vue').Ref<boolean>,
   *   gridRefillAnimating: import('vue').Ref<boolean>,
   *   gridTileRefs: import('vue').Ref<(HTMLElement | null)[]>,
   *   updateSlotPositions: (force?: boolean) => void,
   *   syncPlayerMarkBatchCounterFromGrid: () => void,
   *   ensureSlotRafRunning: () => void,
   *   tryCeruleanBellFlyInAfterGridStable: () => Promise<void>,
   *   beginFirstWordTutorialAfterGridSettled: (opts?: object) => Promise<void>,
   *   runHeaderBarRef: import('vue').ComputedRef<{ levelTitleBoxRef?: HTMLElement | null } | null>,
   * }} playfield
   */
  function bindPlayfield(playfield) {
    gridIntroDoneRef = playfield.gridIntroDone;
    gridRefillAnimatingRef = playfield.gridRefillAnimating;
    gridTileRefsRef = playfield.gridTileRefs;
    updateSlotPositionsImpl = playfield.updateSlotPositions;
    syncPlayerMarkBatchCounterFromGridImpl = playfield.syncPlayerMarkBatchCounterFromGrid;
    ensureSlotRafRunningImpl = playfield.ensureSlotRafRunning;
    tryCeruleanBellFlyInAfterGridStableImpl = playfield.tryCeruleanBellFlyInAfterGridStable;
    beginFirstWordTutorialAfterGridSettledImpl = playfield.beginFirstWordTutorialAfterGridSettled;
    runHeaderBarRefComputed = playfield.runHeaderBarRef;
  }

  /**
   * @param {{ runGridDropAnimation: (tiles: object | null, opts?: object) => Promise<void>, measureGridTileStepY: () => number }} gda
   */
  function bindGridDropAnim(gda) {
    runGridDropAnimationImpl = gda.runGridDropAnimation;
    measureGridTileStepYImpl = gda.measureGridTileStepY;
  }

  /**
   * @param {{
   *   showShop: import('vue').Ref<boolean>,
   *   showRunEnd: import('vue').Ref<boolean>,
   *   runWalletFloor: import('vue').ComputedRef<number>,
   * }} shopRefs
   */
  function bindShop(shopRefs) {
    showShopRef = shopRefs.showShop;
    showRunEndRef = shopRefs.showRunEnd;
    runWalletFloorComputed = shopRefs.runWalletFloor;
  }

  return {
    endlessReportedLeaderboardChapter,
    glyphShopSkipLevelAdvance,
    usedWordLengthsThisBoss,
    mouthLockedLengthBoss,
    clubRequiredKeyBoss,
    bossRerollSession,
    pagerQuizSession,
    pendingPagerQuizSession,
    pendingBossSlugOverride,
    bossMechanicsSuppressed,
    bossSlugForMechanics,
    getBossTileDebuffContext,
    getNextLevelDefAfterShop,
    shouldOfferBossBlindRerollBeforeShopLeave,
    openBossBlindRerollSession,
    buildLevelResetRunOpts,
    scheduleAfterGridTilesSettled,
    runPendingAfterGridTilesSettled,
    clearPendingAfterGridTilesSettled,
    syncEndlessLeaderboardChapterBaseline,
    maybeReportEndlessChapterLeaderboard,
    resetTapTapLeaderboardRunTracking,
    runPagerQuizRequest,
    onPagerQuizResolved,
    onPagerQuizClosed,
    clearPagerQuizPendingResolve,
    runGridIntroAfterReset,
    playLevelAdvanceHeaderFx,
    onShopNextLevel,
    onBossBlindRerollPaid,
    onBossBlindRerollContinue,
    executeShopLeaveToNextLevel,
    dismissBossRerollOnBack,
    applyGlyphVoucherLevelSkip,
    getTreasureResetHooks,
    bindTreasures,
    bindSpell,
    bindPlayfield,
    bindGridDropAnim,
    bindShop,
  };
}
