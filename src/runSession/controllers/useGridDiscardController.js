import { computed, nextTick, ref } from "vue";
import gsap from "gsap";
import { EASE_TRANSFORM } from "../../constants.js";
import { MAX_LETTERS_PER_REMOVAL } from "../../composables/useGameState.js";
import { SCORING_GAP_SCALE } from "../../game/submitScoringAnim.js";
import { addMultMulBank, addScoreAddBank } from "../../treasures/treasureBankHelpers.js";
import {
  DISCARD_SCORE_AWARD,
  rollPotteryDiscardProcIndices,
  TREASURE_65_ID,
} from "../../treasures/items/treasure_65.js";
import { TREASURE_99_E_MULT_GAIN_BUBBLE, TREASURE_99_ID } from "../../treasures/items/treasure_99.js";
import { resolvePistolDiscardBatchPlan, TREASURE_120_ID } from "../../treasures/items/treasure_120.js";
import { recordAchievementRunDiscardUse } from "../../achievements/achievementRunState.js";
import { recordLettersDiscarded } from "../../game/runMatchStats.js";
import {
  addTreasureRunLettersDiscarded,
  recordTreasureDiscardWord,
  recordTreasureLevelVowelLetters,
} from "../../treasures/treasureRunTracking.js";
import { notifyOwnedTreasuresOnDiscardBatch } from "../../treasures/treasureRegistry.js";
import { pauseAwareDelay } from "../../game/gamePause.js";
import { animSleep, getEffectiveAnimSpeed } from "../../settings/animationSpeed.js";

/** @typedef {import('../runSessionTypes.js').GridDiscardController} GridDiscardController */

const REMOVE_SLOT_FADE_DURATION = 0.18;
const REMOVE_SLOT_STAGGER = 0.055;
const DISCARD_PROC_FX_HOLD_MS = Math.round(200 * SCORING_GAP_SCALE);
const GRID_CELL_PLACEHOLDER_OPACITY = 0.26;
/** @param {HTMLElement | null | undefined} slotWrapper */
function resolveWordSlotLeaveInnerEl(slotWrapper) {
  if (!(slotWrapper instanceof HTMLElement)) return null;
  const inner = slotWrapper.querySelector(".word-slot-content");
  return inner instanceof HTMLElement ? inner : null;
}
const ACTION_COUNT_DELTA_BEAT_MS = 400;
const ACTION_COUNT_DELTA_ANIM_MS = 920;

/**
 * @typedef {Object} GridDiscardControllerOptions
 * @property {Pick<
 *   import('../runSessionTypes.js').GridStore,
 *   'selectedOrder' | 'selectedTiles' | 'removeSelectedLetters'
 * > & { remainingRemovals: import('vue').Ref<number> }} grid
 * @property {{
 *   flyingLetters: import('vue').Ref<unknown[]>,
 *   flyingBackBatches: import('vue').Ref<unknown[]>,
 *   cancelAllFlyingIn: () => void,
 *   wordSlotRefs: HTMLElement[],
 *   getSelectedGridCellElsInOrder: () => HTMLElement[],
 *   clearGridTileGsapAfterDrop: (el: HTMLElement | null | undefined) => void,
 *   updateSlotPositions: (deltaMs?: number | boolean) => void,
 *   snapshotGridCellsByTileId: () => Map<string, { row: number, col: number }>,
 * }} playfield
 * @property {ReturnType<import('../../game/gridDropAnim.js').createGridDropAnim>} gridDropAnim
 * @property {{
 *   transitionBusy: import('vue').Ref<boolean>,
 *   showShop: import('vue').Ref<boolean>,
 *   scoringAnimating: import('vue').Ref<boolean>,
 *   gridRefillAnimating: import('vue').Ref<boolean>,
 *   dictFatalError: import('vue').Ref<boolean>,
 * }} gates
 * @property {{
 *   treasureRunState: import('vue').Ref<object>,
 *   runMatchStats: import('vue').Ref<object>,
 *   achievementRunState: import('vue').Ref<object>,
 *   money: import('vue').Ref<number>,
 *   ownedVoucherIds: import('vue').Ref<string[]>,
 *   spellCountsByLength: import('vue').Ref<Record<number, number>>,
 *   runRandom: () => number,
 * }} run
 * @property {{
 *   wordDefinitionHiddenForWordLeave: import('vue').Ref<boolean>,
 * }} wordLeave
 * @property {{
 *   isRunFlowOverlayOpen: () => boolean,
 *   isFirstWordTutorialBlockingInput: () => boolean,
 *   triggerHaptic: (kind: string) => void,
 *   showToast: (msg: string) => void,
 *   scheduleStaggeredTileRemoveHaptics: (count: number, staggerSec: number) => void,
 * }} ui
 * @property {{
 *   scheduleRunAutoSave: () => void,
 *   noteDiscardExhaustedForChapterUnlock: () => void,
 *   tryCeruleanBellFlyInAfterGridStable: () => Promise<void>,
 *   getWordDefinition: (word: string) => unknown,
 *   judgedLengthTableLenForRun: (wordLetterCount: number) => number,
 *   ownedSlotTreasureIdList: () => (string | null)[],
 *   findOwnedTreasureSlotIndex: (treasureId: string) => number,
 *   removeDeckCardByUidAndNotify: (uid: number, options?: object) => void,
 *   flushAchievementUnlocks: () => void,
 *   noteTreasureRunUpgradeUsed: (rs: object) => void,
 *   noteCollectionUpgradeForWordLen: (len: number) => void,
 *   bumpWordLengthLevel: (len: number, options?: object) => void,
 *   isLengthObservatoryBoosted: (owned: string[], len: number, spells: Record<number, number>) => boolean,
 *   playOwnedTreasureMoneyFx: (...args: unknown[]) => unknown,
 *   ownedTreasureHookFxBridge: () => object,
 *   playOwnedTreasureWobbleOnlyFx: (...args: unknown[]) => unknown,
 *   buildInRunLengthUpgradeStep: (len: number) => object,
 *   runInRunUpgradePlaybackSteps: (steps: object[]) => Promise<void>,
 *   runInRunUpgradeStaircasePlayback: (steps: object[]) => Promise<void>,
 *   ownedSlotTreasureIdList: () => (string | null | undefined)[],
 * }} callbacks
 * @property {ReturnType<import('../../game/submitTreasureSlotFx.js').createSubmitTreasureSlotFx> & ReturnType<import('../../game/submitTileLeaveAnim.js').createSubmitTileLeaveAnim>} submitFx
 * @property {(ms: number) => Promise<void>} sleep
 */

/**
 * 弃牌 / remove 按钮、离场动画、补牌下落编排（任务 4.3）。
 *
 * @param {GridDiscardControllerOptions} options
 * @returns {GridDiscardController}
 */
export function useGridDiscardController(options) {
  const { grid, playfield, gates, run, wordLeave, ui, callbacks, gridDropAnim, submitFx, sleep } = options;
  const { selectedOrder, selectedTiles, removeSelectedLetters, remainingRemovals } = grid;
  const {
    flyingLetters,
    flyingBackBatches,
    cancelAllFlyingIn,
    wordSlotRefs,
    getSelectedGridCellElsInOrder,
    clearGridTileGsapAfterDrop,
    updateSlotPositions,
    snapshotGridCellsByTileId,
  } = playfield;
  const { wordDefinitionHiddenForWordLeave } = wordLeave;
  const {
    treasureRunState,
    runMatchStats,
    achievementRunState,
    money,
    ownedVoucherIds,
    spellCountsByLength,
    runRandom,
  } = run;

  const removalDeltaKey = ref(0);
  let removalDeltaClearTimer = null;

  function flashRemovalCountDelta() {
    removalDeltaKey.value += 1;
    const cur = removalDeltaKey.value;
    if (removalDeltaClearTimer) clearTimeout(removalDeltaClearTimer);
    removalDeltaClearTimer = setTimeout(() => {
      if (removalDeltaKey.value === cur) removalDeltaKey.value = 0;
      removalDeltaClearTimer = null;
    }, ACTION_COUNT_DELTA_ANIM_MS + 120);
  }

  function discardLeaveStagger(letterCount) {
    const n = Math.max(1, Math.min(MAX_LETTERS_PER_REMOVAL, Math.round(Number(letterCount) || 1)));
    const extra = Math.max(0, n - 4);
    const base = REMOVE_SLOT_STAGGER;
    const taper = 0.0022;
    return Math.max(0.034, base - extra * taper);
  }

  function discardLeaveDuration(letterCount) {
    const n = Math.max(1, Math.min(MAX_LETTERS_PER_REMOVAL, Math.round(Number(letterCount) || 1)));
    const extra = Math.max(0, n - 4);
    const base = REMOVE_SLOT_FADE_DURATION;
    const taper = 0.0035;
    return Math.max(0.14, base - extra * taper);
  }

  /**
   * 逐步写入 opacity/transform（不依赖 globalTimeline onComplete；跳过计分动画时离场/弃牌共用）。
   * @param {HTMLElement[]} slotEls
   * @param {HTMLElement[]} gridEls
   * @param {{ duration?: number, stagger?: number, gridTileEls?: HTMLElement[] }} options
   */
  async function runSteppedSlotAndGridLeaveAnimation(slotEls, gridEls, options = {}) {
    const duration = Number.isFinite(options.duration) ? options.duration : 0.28;
    const stagger = Number.isFinite(options.stagger) ? options.stagger : 0.12;
    const gridTileEls = Array.isArray(options.gridTileEls) ? options.gridTileEls : [];
    const maxIdx = Math.max(slotEls.length, gridEls.length, gridTileEls.length, 1);
    if (slotEls.length === 0 && gridEls.length === 0 && gridTileEls.length === 0) {
      return;
    }

    const ease = gsap.parseEase(EASE_TRANSFORM);
    const span = duration + Math.max(0, maxIdx - 1) * stagger;
    const totalMs = Math.ceil((span * 1000) / getEffectiveAnimSpeed(1));
    const steps = Math.max(12, Math.ceil(totalMs / (1000 / 60)));
    const stepMs = totalMs / steps;

    let hapticFired = 0;
    const maxHaptic = Math.min(3, maxIdx);

    for (let s = 0; s <= steps; s += 1) {
      const clock = (s / steps) * span;
      for (let i = 0; i < slotEls.length; i += 1) {
        const el = slotEls[i];
        if (!el?.isConnected) continue;
        const elapsed = Math.max(0, clock - i * stagger);
        const t = ease(Math.min(1, elapsed / duration));
        if (t > 0 && hapticFired < maxHaptic && elapsed > 0 && elapsed <= duration / steps + 0.001) {
          ui.triggerHaptic("tileRemove");
          hapticFired += 1;
        }
        gsap.set(el, {
          opacity: 1 - t,
          scale: 1 - 0.12 * t,
          y: -10 * t,
          transformOrigin: "50% 50%",
          force3D: true,
          overwrite: "auto",
        });
        const inner = resolveWordSlotLeaveInnerEl(el);
        if (inner?.isConnected) {
          gsap.set(inner, { opacity: 1 - t, overwrite: "auto" });
        }
      }
      for (let i = 0; i < gridEls.length; i += 1) {
        const el = gridEls[i];
        if (!el?.isConnected) continue;
        const elapsed = Math.max(0, clock - i * stagger);
        const t = ease(Math.min(1, elapsed / duration));
        gsap.set(el, {
          opacity: GRID_CELL_PLACEHOLDER_OPACITY * (1 - t),
          scale: 1 - 0.18 * t,
          y: 0,
          transformOrigin: "50% 50%",
          force3D: true,
          overwrite: "auto",
        });
      }
      for (let i = 0; i < gridTileEls.length; i += 1) {
        const el = gridTileEls[i];
        if (!el?.isConnected) continue;
        const elapsed = Math.max(0, clock - i * stagger);
        const t = ease(Math.min(1, elapsed / duration));
        gsap.set(el, {
          opacity: 1 - t,
          scale: 1 - 0.18 * t,
          y: 0,
          transformOrigin: "50% 50%",
          force3D: true,
          overwrite: "auto",
        });
      }
      if (s < steps) {
        await animSleep(stepMs);
      }
    }
  }

  function runSlotAndGridLeaveAnimation(slotEls, gridEls, options = {}) {
    if (options.useSteppedLeave === true) {
      return runSteppedSlotAndGridLeaveAnimation(slotEls, gridEls, options);
    }
    const duration = Number.isFinite(options.duration) ? options.duration : 0.28;
    const stagger = Number.isFinite(options.stagger) ? options.stagger : 0.12;
    const gridTileEls = Array.isArray(options.gridTileEls) ? options.gridTileEls : [];
    return new Promise((resolve) => {
      const need =
        (slotEls.length > 0 ? 1 : 0) +
        (gridEls.length > 0 ? 1 : 0) +
        (gridTileEls.length > 0 ? 1 : 0);
      if (need === 0) {
        resolve();
        return;
      }
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      let gsapDone = 0;
      const gsapFinish = () => {
        gsapDone += 1;
        if (gsapDone >= need) settle();
      };
      const maxCount = Math.max(slotEls.length, gridEls.length, gridTileEls.length);
      const waitMs = Math.ceil(
        ((duration + Math.max(0, maxCount - 1) * stagger) * 1000) / getEffectiveAnimSpeed(1),
      );
      void pauseAwareDelay(waitMs).then(settle);
      const removeHapticStagger = { each: stagger, onStart: () => ui.triggerHaptic("tileRemove") };
      const gridStagger = slotEls.length > 0 ? stagger : removeHapticStagger;
      if (slotEls.length > 0) {
        /** @type {HTMLElement[]} */
        const slotInnerEls = [];
        for (const slotEl of slotEls) {
          const inner = resolveWordSlotLeaveInnerEl(slotEl);
          if (inner) slotInnerEls.push(inner);
        }
        gsap.fromTo(
          slotEls,
          { opacity: 1, scale: 1, y: 0 },
          {
            opacity: 0,
            scale: 0.88,
            y: -10,
            duration,
            stagger: removeHapticStagger,
            ease: EASE_TRANSFORM,
            onComplete: gsapFinish,
          },
        );
        if (slotInnerEls.length > 0) {
          gsap.fromTo(
            slotInnerEls,
            { opacity: 1 },
            {
              opacity: 0,
              duration,
              stagger: removeHapticStagger,
              ease: EASE_TRANSFORM,
            },
          );
        }
      }
      if (gridEls.length > 0) {
        gsap.fromTo(
          gridEls,
          {
            opacity: GRID_CELL_PLACEHOLDER_OPACITY,
            scale: 1,
            y: 0,
            transformOrigin: "50% 50%",
          },
          {
            opacity: 0,
            scale: 0.82,
            y: 0,
            duration,
            stagger: gridStagger,
            ease: EASE_TRANSFORM,
            onComplete: gsapFinish,
          },
        );
      }
      if (gridTileEls.length > 0) {
        gsap.fromTo(
          gridTileEls,
          { opacity: 1, scale: 1, y: 0, transformOrigin: "50% 50%" },
          {
            opacity: 0,
            scale: 0.82,
            y: 0,
            duration,
            stagger: gridStagger,
            ease: EASE_TRANSFORM,
            onComplete: gsapFinish,
          },
        );
      }
    });
  }

  /**
   * @param {HTMLElement | null | undefined} slotEl
   * @param {HTMLElement | null | undefined} gridEl
   * @param {number} duration
   */
  function animateOneDiscardTileLeave(slotEl, gridEl, duration) {
    return new Promise((resolve) => {
      let done = 0;
      const need = (slotEl ? 1 : 0) + (gridEl ? 1 : 0);
      if (need === 0) {
        resolve();
        return;
      }
      const finish = () => {
        done += 1;
        if (done >= need) resolve();
      };
      const fireRemoveHaptic = () => ui.triggerHaptic("tileRemove");
      if (slotEl) {
        gsap.killTweensOf(slotEl);
        gsap.fromTo(
          slotEl,
          { opacity: 1, scale: 1, y: 0 },
          {
            opacity: 0,
            scale: 0.88,
            y: -10,
            duration,
            ease: EASE_TRANSFORM,
            onStart: fireRemoveHaptic,
            onComplete: finish,
          },
        );
      }
      if (gridEl) {
        gsap.killTweensOf(gridEl);
        gsap.fromTo(
          gridEl,
          {
            opacity: GRID_CELL_PLACEHOLDER_OPACITY,
            scale: 1,
            y: 0,
            transformOrigin: "50% 50%",
          },
          {
            opacity: 0,
            scale: 0.82,
            y: 0,
            duration,
            ease: EASE_TRANSFORM,
            onStart: slotEl ? undefined : fireRemoveHaptic,
            onComplete: finish,
          },
        );
      }
    });
  }

  /**
   * @param {HTMLElement[]} slotEls
   * @param {HTMLElement[]} gridEls
   * @param {{ letter?: string }[]} discardedLetters
   * @param {{ duration?: number, stagger?: number, potteryProcIndices?: number[], pistolProc?: boolean, pistolDeckUid?: number | null, pistolMoneyAmount?: number, pistolSlotIndex?: number }} [animOptions]
   * @returns {Promise<boolean>}
   */
  async function runDiscardLeaveAnimation(slotEls, gridEls, discardedLetters, animOptions = {}) {
    const duration = Number.isFinite(animOptions.duration) ? animOptions.duration : REMOVE_SLOT_FADE_DURATION;
    const stagger = Number.isFinite(animOptions.stagger) ? animOptions.stagger : REMOVE_SLOT_STAGGER;
    const rs = treasureRunState.value;
    const potterySlotIx = callbacks.findOwnedTreasureSlotIndex(TREASURE_65_ID);
    const trashSlotIx = callbacks.findOwnedTreasureSlotIndex(TREASURE_99_ID);
    const pistolProc = animOptions.pistolProc === true;
    const pistolDeckUid = animOptions.pistolDeckUid ?? null;
    const pistolMoneyAmount = Math.max(0, Math.floor(Number(animOptions.pistolMoneyAmount) || 0));
    const pistolSlotIndex =
      typeof animOptions.pistolSlotIndex === "number" && animOptions.pistolSlotIndex >= 0
        ? animOptions.pistolSlotIndex
        : callbacks.findOwnedTreasureSlotIndex(TREASURE_120_ID);
    /** @type {number[]} */
    const potteryIndices = potterySlotIx >= 0 ? [...(animOptions.potteryProcIndices ?? [])] : [];
    /** @type {number[]} */
    const trashIndices = [];
    if (trashSlotIx >= 0) {
      for (let i = 0; i < discardedLetters.length; i++) {
        if (String(discardedLetters[i]?.letter ?? "").toLowerCase() === "e") trashIndices.push(i);
      }
    }
    if (!potteryIndices.length && !trashIndices.length && !pistolProc) {
      await runSlotAndGridLeaveAnimation(slotEls, gridEls, { duration, stagger });
      return false;
    }

    const scorePerLetter = DISCARD_SCORE_AWARD;
    const trashMultIncrement = 0.25;
    const trashBubble = TREASURE_99_E_MULT_GAIN_BUBBLE;
    const staggerMs = Math.round(stagger * 1000);
    /** @type {Promise<void>[]} */
    const leaveTasks = [];
    for (let i = 0; i < slotEls.length; i++) {
      const slotEl = slotEls[i];
      const gridEl = gridEls[i];
      const triggersPottery = potteryIndices.includes(i);
      const triggersTrash = trashIndices.includes(i);
      const triggersPistol = pistolProc && i === 0;
      leaveTasks.push(
        (async () => {
          if (i > 0) await sleep(i * staggerMs);
          if (triggersPistol) {
            rs.levelFirstDiscardBatchDone = true;
            await submitFx.playSubmitWordLetterRemoveAndRewardLeave({
              treasureId: TREASURE_120_ID,
              ...(pistolSlotIndex >= 0 ? { treasureSlotIndex: pistolSlotIndex } : {}),
              slotEls: slotEl ? [slotEl] : [],
              gridEls: gridEl ? [gridEl] : [],
              moneyAmount: pistolMoneyAmount,
              onRemoveDeck: () => {
                if (pistolDeckUid != null) {
                  callbacks.removeDeckCardByUidAndNotify(pistolDeckUid, { clearGrid: false });
                }
              },
            });
          } else {
            await animateOneDiscardTileLeave(slotEl, gridEl, duration);
          }
          if (triggersPottery) {
            addScoreAddBank(rs, TREASURE_65_ID, scorePerLetter);
            await submitFx.playTreasureSlotScoreBurstAtPeak(potterySlotIx, scorePerLetter);
            await sleep(DISCARD_PROC_FX_HOLD_MS);
          }
          if (triggersTrash) {
            addMultMulBank(rs, TREASURE_99_ID, trashMultIncrement);
            await submitFx.playTreasureSlotBubbleBurstAtPeak(trashSlotIx, trashBubble, "mult");
            await sleep(DISCARD_PROC_FX_HOLD_MS);
          }
        })(),
      );
    }
    await Promise.all(leaveTasks);
    return true;
  }

  const effectiveSelectedCount = computed(() => {
    const nSelRaw = selectedOrder.value.length;
    const batches = flyingBackBatches.value;
    return batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : nSelRaw;
  });

  const selectedTileCountForRemoval = computed(() => {
    const stable = effectiveSelectedCount.value;
    return stable + flyingLetters.value.length;
  });

  const discardBtnOverLimit = computed(
    () => selectedTileCountForRemoval.value > MAX_LETTERS_PER_REMOVAL,
  );

  const canRemove = computed(() => {
    const nTiles = selectedTileCountForRemoval.value;
    const hasFlying = flyingLetters.value.length > 0;
    const cap = MAX_LETTERS_PER_REMOVAL;
    return (
      !gates.showShop.value &&
      !ui.isRunFlowOverlayOpen() &&
      !gates.transitionBusy.value &&
      remainingRemovals.value > 0 &&
      !gates.scoringAnimating.value &&
      !gates.gridRefillAnimating.value &&
      (nTiles > 0 || hasFlying) &&
      nTiles <= cap
    );
  });

  async function onRemoveClick() {
    if (ui.isFirstWordTutorialBlockingInput()) return;
    if (gates.dictFatalError.value) return;
    if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return;
    if (!canRemove.value) return;
    ui.triggerHaptic("warning");
    gates.gridRefillAnimating.value = true;
    try {
      if (flyingLetters.value.length > 0) {
        cancelAllFlyingIn();
      }
      const nSel = selectedOrder.value.length;
      if (nSel === 0) return;

      const discardedLettersForHooks = selectedTiles.value.map(({ tile }) => ({
        letter: tile?.letter ?? "",
      }));
      const discardedDeckCardUids = selectedTiles.value.map(({ tile }) => tile?._deckCard?._dcUid ?? null);

      const slotTileEls = [];
      for (let i = 0; i < nSel; i++) {
        const el = wordSlotRefs[i];
        if (el) slotTileEls.push(el);
      }
      gsap.killTweensOf(slotTileEls);
      gsap.set(slotTileEls, {
        opacity: 1,
        scale: 1,
        y: 0,
        transformOrigin: "50% 50%",
      });
      for (const slotEl of slotTileEls) {
        const ph = slotEl.querySelector(".word-slot-placeholder");
        if (ph) ph.classList.add("word-slot-placeholder--shell");
      }
      const removeGridLeaveEls = getSelectedGridCellElsInOrder();
      gsap.killTweensOf(removeGridLeaveEls);
      gsap.set(removeGridLeaveEls, {
        scale: 1,
        y: 0,
        transformOrigin: "50% 50%",
      });

      flashRemovalCountDelta();
      await nextTick();
      await sleep(ACTION_COUNT_DELTA_BEAT_MS);

      const prevFlip = {
        cells: snapshotGridCellsByTileId(),
      };

      const ownedIds = callbacks.ownedSlotTreasureIdList();
      const potteryProcIndices =
        callbacks.findOwnedTreasureSlotIndex(TREASURE_65_ID) >= 0
          ? rollPotteryDiscardProcIndices(nSel, runRandom, ownedIds)
          : [];
      const pistolDiscardPlan = resolvePistolDiscardBatchPlan({
        treasureRun: treasureRunState.value,
        letterCount: nSel,
        discardedDeckCardUids,
        ownedSlotTreasureIds: ownedIds,
      });

      wordDefinitionHiddenForWordLeave.value = true;
      const discardLeaveFxHandled = await runDiscardLeaveAnimation(
        slotTileEls,
        removeGridLeaveEls,
        discardedLettersForHooks,
        {
          duration: discardLeaveDuration(nSel),
          stagger: discardLeaveStagger(nSel),
          potteryProcIndices,
          pistolProc: pistolDiscardPlan.proc,
          pistolDeckUid: pistolDiscardPlan.proc ? pistolDiscardPlan.deckUid : null,
          pistolMoneyAmount: pistolDiscardPlan.proc ? pistolDiscardPlan.moneyAmount : 0,
          pistolSlotIndex: pistolDiscardPlan.proc ? pistolDiscardPlan.slotIndex : undefined,
        },
      );
      const discardPotteryFxHandled = discardLeaveFxHandled && potteryProcIndices.length > 0;
      const discardPistolFxHandled = discardLeaveFxHandled && pistolDiscardPlan.proc;
      const result = removeSelectedLetters({
        prevCells: prevFlip.cells,
        maxRemovalLetters: MAX_LETTERS_PER_REMOVAL,
      });
      if (!result.success) {
        wordDefinitionHiddenForWordLeave.value = false;
        for (const el of removeGridLeaveEls) clearGridTileGsapAfterDrop(el);
        for (const slotEl of slotTileEls) {
          const ph = slotEl.querySelector(".word-slot-placeholder");
          if (ph) ph.classList.remove("word-slot-placeholder--shell");
        }
        gsap.set(slotTileEls, { opacity: 1, scale: 1, y: 0 });
        gates.gridRefillAnimating.value = false;
        ui.showToast(result.error ?? "无法丢弃");
        return;
      }

      for (const el of removeGridLeaveEls) clearGridTileGsapAfterDrop(el);
      for (const slotEl of slotTileEls) {
        gsap.killTweensOf(slotEl);
        const ph = slotEl.querySelector(".word-slot-placeholder");
        if (ph) ph.classList.remove("word-slot-placeholder--shell");
      }

      recordLettersDiscarded(runMatchStats.value, nSel);
      recordAchievementRunDiscardUse(achievementRunState.value);
      callbacks.flushAchievementUnlocks();

      treasureRunState.value.levelDiscardsUsed = true;
      addTreasureRunLettersDiscarded(treasureRunState.value, nSel);
      recordTreasureLevelVowelLetters(treasureRunState.value, discardedLettersForHooks, ownedIds);
      recordTreasureDiscardWord(treasureRunState.value, discardedLettersForHooks, (w) =>
        callbacks.getWordDefinition(w),
      );

      const discardedWordChars = discardedLettersForHooks
        .map((p) => String(p?.letter ?? "").toLowerCase())
        .join("");
      const judgedWordLengthForDiscard = discardedWordChars
        ? callbacks.judgedLengthTableLenForRun(discardedWordChars.length)
        : 0;

      const dropPromise = (async () => {
        await nextTick();
        try {
          await gridDropAnim.runGridDropAnimation(prevFlip);
        } finally {
          await callbacks.tryCeruleanBellFlyInAfterGridStable();
        }
      })();

      await Promise.all([
        dropPromise,
        notifyOwnedTreasuresOnDiscardBatch(ownedIds, {
          ownedSlotTreasureIds: ownedIds,
          getOwnedSlotTreasureIds: callbacks.ownedSlotTreasureIdList,
          discardedLetters: discardedLettersForHooks,
          discardedDeckCardUids,
          letterCount: nSel,
          treasureRun: treasureRunState.value,
          rng: runRandom,
          discardPotteryFxHandled,
          discardPistolFxHandled,
          potteryDiscardProcIndices: potteryProcIndices,
          resolveDiscardedWord: (w) => callbacks.getWordDefinition(w),
          judgedWordLength: judgedWordLengthForDiscard,
          removeDeckCardByUid: (uid, options) => callbacks.removeDeckCardByUidAndNotify(uid, options),
          bumpWordLengthLevel: (len) => {
            callbacks.noteTreasureRunUpgradeUsed(treasureRunState.value);
            callbacks.noteCollectionUpgradeForWordLen(len);
            callbacks.bumpWordLengthLevel(len, {
              observatoryBoost: callbacks.isLengthObservatoryBoosted(
                ownedVoucherIds.value,
                len,
                spellCountsByLength.value,
              ),
            });
          },
          addMoney: (amount) => {
            money.value += Math.max(0, Math.floor(Number(amount) || 0));
          },
          playOwnedTreasureMoneyFx: callbacks.playOwnedTreasureMoneyFx,
          ...callbacks.ownedTreasureHookFxBridge(),
          playOwnedTreasureWobbleOnlyFx: callbacks.playOwnedTreasureWobbleOnlyFx,
          buildInRunLengthUpgradeStep: callbacks.buildInRunLengthUpgradeStep,
          runInRunUpgradeStaircasePlayback: callbacks.runInRunUpgradeStaircasePlayback,
          runSingleInRunLengthUpgradeFx: async (len) => {
            const step = callbacks.buildInRunLengthUpgradeStep(len);
            await callbacks.runInRunUpgradePlaybackSteps([step]);
          },
          findOwnedTreasureSlotIndex: callbacks.findOwnedTreasureSlotIndex,
        }),
      ]);
      callbacks.noteDiscardExhaustedForChapterUnlock();

      gates.gridRefillAnimating.value = false;
      nextTick(() => updateSlotPositions(true));
      callbacks.scheduleRunAutoSave();
    } finally {
      if (gates.gridRefillAnimating.value) gates.gridRefillAnimating.value = false;
      wordDefinitionHiddenForWordLeave.value = false;
    }
  }

  function onDiscardBtnClick() {
    if (ui.isFirstWordTutorialBlockingInput()) return;
    if (gates.dictFatalError.value) return;
    if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return;
    if (gates.scoringAnimating.value || gates.gridRefillAnimating.value) return;
    if (discardBtnOverLimit.value) {
      ui.showToast(`一次至多丢弃 ${MAX_LETTERS_PER_REMOVAL} 个字母块`);
      return;
    }
    void onRemoveClick();
  }

  function dispose() {
    if (removalDeltaClearTimer) {
      clearTimeout(removalDeltaClearTimer);
      removalDeltaClearTimer = null;
    }
  }

  return {
    removalDeltaKey,
    canRemove,
    discardBtnOverLimit,
    onRemoveClick,
    onDiscardBtnClick,
    runSlotAndGridLeaveAnimation,
    dispose,
  };
}
