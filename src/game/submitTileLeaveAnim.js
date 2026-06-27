import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { addMultMulBank } from "../treasures/treasureBankHelpers.js";
import {
  TREASURE_78_ICE_SHATTER_MULT_BUBBLE,
  TREASURE_78_ICE_SHATTER_MULT_INCREMENT,
  TREASURE_78_ID,
} from "../treasures/items/treasure_78.js";
import {
  SCORING_BUBBLE_POP_DELAY_MS,
  SCORING_STEP_BEAT_MS,
  PLUS_BUBBLE_OUTRO_SCALE,
} from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";
import { schedulePopupBubbleDismiss } from "./popupBubbleFx.js";

const TOOLBOX_REMOVE_BUBBLE_HOLD_MS = 200;
const TOOLBOX_REMOVE_SHRINK_S = 0.14;
const TOOLBOX_REMOVE_LETTER_GAP_MS = 48;
const TOOLBOX_REMOVE_BEFORE_MONEY_MS = 0;
const TOOLBOX_REMOVE_BUBBLE_OUTRO_DELAY_S = 0.2;
const TOOLBOX_REMOVE_BUBBLE_OUTRO_DURATION_S = 0.24;
const ICE_MATERIAL_SELF_DESTRUCT_CHANCE = 0.25;

/**
 * @typedef {Object} SubmitTileLeaveAnimDeps
 * @property {{ treasureRunState: import('vue').Ref<object> }} refs
 * @property {() => HTMLElement[]} getSelectedGridTileElsInOrder
 * @property {HTMLElement[]} wordSlotRefs
 * @property {(treasureId: string) => number} findOwnedTreasureSlotIndex
 * @property {() => number} runRandom
 * @property {(tile: object) => boolean} isBossTileDebuffed
 * @property {(uid: number, options?: object) => void} removeDeckCardByUidAndNotify
 * @property {(ctx: object) => Promise<void>} notifyIceBreak
 * @property {ReturnType<import('./submitTreasureSlotFx.js').createSubmitTreasureSlotFx>['playTreasureSlotBubbleBurstAtPeak']} playTreasureSlotBubbleBurstAtPeak
 * @property {(slotIndex: number, amount: number, opts?: object) => Promise<void>} playTreasureSlotMoneyBurstAtPeak
 * @property {(treasureId: string, amount: number, opts?: object) => Promise<void>} playOwnedTreasureMoneyFx
 * @property {(slotIndex: number) => Promise<void>} wobbleGameTreasureSlot
 * @property {(kind: string) => void} triggerHaptic
 * @property {() => void} touchGrid
 * @property {(el: HTMLElement, label: string, kind: string, speed?: number) => HTMLElement | null} showScoreBubble
 * @property {(el: HTMLElement | null | undefined) => import('gsap').core.Timeline | null} createWobbleScoreSlotTimeline
 * @property {(el: HTMLElement | null | undefined, sp?: number) => Promise<void>} awaitTreasureSlotWobbleEl
 * @property {(opts: object) => Promise<void>} runDetachedTileShrinkReplacePop
 * @property {(bubble: HTMLElement | null | undefined, speed?: number) => void} scheduleSmallPlusBubbleOutro
 * @property {(ms: number) => Promise<void>} sleep
 * @property {typeof import('vue').nextTick} nextTick
 * @property {typeof gsap} [gsapLib]
 */

/**
 * 提交/弃牌路径：冰碎、工具箱移除离场、海绵擦除（S.4）。
 *
 * @param {SubmitTileLeaveAnimDeps} deps
 */
export function createSubmitTileLeaveAnim(deps) {
  const {
    refs,
    getSelectedGridTileElsInOrder,
    wordSlotRefs,
    findOwnedTreasureSlotIndex,
    runRandom,
    isBossTileDebuffed,
    removeDeckCardByUidAndNotify,
    notifyIceBreak,
    playTreasureSlotBubbleBurstAtPeak,
    playTreasureSlotMoneyBurstAtPeak,
    playOwnedTreasureMoneyFx,
    wobbleGameTreasureSlot,
    triggerHaptic,
    touchGrid,
    showScoreBubble,
    createWobbleScoreSlotTimeline,
    awaitTreasureSlotWobbleEl,
    runDetachedTileShrinkReplacePop,
    scheduleSmallPlusBubbleOutro,
    sleep,
    nextTick,
    gsapLib = gsap,
  } = deps;

  /** @param {HTMLElement | null | undefined} el @param {number} [speed] */
  function scheduleToolboxRemoveBubbleOutro(el, speed = 1) {
    schedulePopupBubbleDismiss(el, {
      delayS: TOOLBOX_REMOVE_BUBBLE_OUTRO_DELAY_S,
      durationS: TOOLBOX_REMOVE_BUBBLE_OUTRO_DURATION_S,
      speed,
      onAnimateOutro: (s) =>
        gsapLib.to(el, {
          opacity: 0,
          y: -10,
          scale: PLUS_BUBBLE_OUTRO_SCALE,
          duration: TOOLBOX_REMOVE_BUBBLE_OUTRO_DURATION_S / s,
          delay: TOOLBOX_REMOVE_BUBBLE_OUTRO_DELAY_S / s,
          ease: EASE_TRANSFORM,
          onComplete: () => el.remove(),
        }),
    });
  }

  /**
   * @param {HTMLElement | null | undefined} slotEl
   * @param {HTMLElement | null | undefined} gridEl
   * @param {number} duration
   */
  function animateToolboxTileShrinkToZero(slotEl, gridEl, duration) {
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
      const fireRemoveHaptic = () => triggerHaptic("tileRemove");
      if (slotEl) {
        gsapLib.killTweensOf(slotEl);
        gsapLib.set(slotEl, { transformOrigin: "50% 55%" });
        gsapLib.to(slotEl, {
          opacity: 0,
          scale: 0,
          duration,
          ease: EASE_TRANSFORM,
          onStart: fireRemoveHaptic,
          onComplete: finish,
        });
      }
      if (gridEl) {
        gsapLib.killTweensOf(gridEl);
        gsapLib.set(gridEl, { transformOrigin: "50% 50%" });
        gsapLib.to(gridEl, {
          opacity: 0,
          scale: 0,
          duration,
          ease: EASE_TRANSFORM,
          onStart: slotEl ? undefined : fireRemoveHaptic,
          onComplete: finish,
        });
      }
    });
  }

  /** @param {HTMLElement | null | undefined} slotEl @param {number} [speed] */
  async function playToolboxRemoveWobbleAndBubble(slotEl, speed = 1) {
    if (!slotEl) return;
    const sp = Math.max(0.01, Number(speed) || 1);
    const tl = createWobbleScoreSlotTimeline(slotEl);
    if (tl) {
      tl.timeScale(sp);
      tl.play(0);
    }
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = showScoreBubble(slotEl, "移除", "destroy", sp);
    scheduleToolboxRemoveBubbleOutro(bubble, sp);
  }

  /** @param {HTMLElement | null | undefined} slotEl @param {HTMLElement | null | undefined} gridEl @param {number} [speed] */
  async function playIceTileShatterWobbleAndBubble(slotEl, gridEl, speed = 1) {
    const anchorEl = slotEl || gridEl;
    if (!anchorEl) return;
    const sp = Math.max(0.01, Number(speed) || 1);
    const wobbleTargets = /** @type {HTMLElement[]} */ ([slotEl, gridEl].filter(Boolean));
    const wobbleP = Promise.all(wobbleTargets.map((el) => awaitTreasureSlotWobbleEl(el, sp)));
    const bubbleP = (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      return showScoreBubble(anchorEl, "碎裂！", "ice-shatter", sp);
    })();
    const [, bubble] = await Promise.all([wobbleP, bubbleP]);
    scheduleSmallPlusBubbleOutro(bubble, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  }

  /** @param {object[]} tiles */
  async function runSubmittedIceShatterEffects(tiles) {
    const list = Array.isArray(tiles) ? tiles : [];
    const gridEls = getSelectedGridTileElsInOrder();
    const snowmanSlotIx = findOwnedTreasureSlotIndex(TREASURE_78_ID);
    const iceShatterTreasureFxHandled = snowmanSlotIx >= 0;
    let shatterCount = 0;
    let iceShatterHapticCount = 0;
    for (let i = 0; i < list.length; i += 1) {
      const t = list[i];
      if (t?.materialId !== "ice" || isBossTileDebuffed(t)) continue;
      if (runRandom() >= ICE_MATERIAL_SELF_DESTRUCT_CHANCE) continue;
      shatterCount += 1;
      if (iceShatterHapticCount < 3) {
        triggerHaptic("land");
        iceShatterHapticCount += 1;
      }
      refs.treasureRunState.value.runIceMaterialShattered = true;
      const deckUid = t?._deckCard?._dcUid;
      if (deckUid != null) {
        removeDeckCardByUidAndNotify(deckUid, { clearGrid: false });
      }
      const slotEl = wordSlotRefs[i];
      const gridEl = gridEls[i];
      await playIceTileShatterWobbleAndBubble(slotEl, gridEl);
      if (iceShatterTreasureFxHandled) {
        addMultMulBank(refs.treasureRunState.value, TREASURE_78_ID, TREASURE_78_ICE_SHATTER_MULT_INCREMENT);
        await playTreasureSlotBubbleBurstAtPeak(
          snowmanSlotIx,
          TREASURE_78_ICE_SHATTER_MULT_BUBBLE,
          "mult",
        );
      }
      await notifyIceBreak({ iceShatterTreasureFxHandled });
    }
    return shatterCount;
  }

  /** @param {import('../treasures/treasureTypes.js').SubmitWordLetterRemoveLeaveOpts} opts */
  async function playSubmitWordLetterRemoveAndRewardLeave(opts) {
    const treasureId = String(opts?.treasureId ?? "");
    const slotEls = Array.isArray(opts?.slotEls) ? opts.slotEls : [];
    const gridEls = Array.isArray(opts?.gridEls) ? opts.gridEls : [];
    const n = Math.min(slotEls.length, gridEls.length);
    if (n <= 0) return;
    const treasureSlotIx = findOwnedTreasureSlotIndex(treasureId);
    const sp = 1;

    for (let i = 0; i < n; i++) {
      const slotEl = slotEls[i];
      const gridEl = gridEls[i];
      if (i === 0 && treasureSlotIx >= 0) {
        void wobbleGameTreasureSlot(treasureSlotIx);
      }
      await playToolboxRemoveWobbleAndBubble(slotEl, sp);
      await sleep(TOOLBOX_REMOVE_BUBBLE_HOLD_MS);
      await animateToolboxTileShrinkToZero(slotEl, gridEl, TOOLBOX_REMOVE_SHRINK_S);
      if (i < n - 1) await sleep(TOOLBOX_REMOVE_LETTER_GAP_MS);
    }

    opts.onRemoveDeck?.();
    if (TOOLBOX_REMOVE_BEFORE_MONEY_MS > 0) await sleep(TOOLBOX_REMOVE_BEFORE_MONEY_MS);
    const amt = Math.max(0, Math.floor(Number(opts?.moneyAmount) || 0));
    if (amt > 0) {
      if (treasureSlotIx >= 0) await playTreasureSlotMoneyBurstAtPeak(treasureSlotIx, amt);
      else await playOwnedTreasureMoneyFx(treasureId, amt);
    }
  }

  /** @param {import('../treasures/treasureTypes.js').SubmitWordEnhancementStripLeaveOpts} opts */
  async function playSubmitTileEnhancementStripLeave(opts) {
    const indices = Array.isArray(opts?.indices) ? opts.indices : [];
    const slotEls = Array.isArray(opts?.slotEls) ? opts.slotEls : [];
    const gridEls = Array.isArray(opts?.gridEls) ? opts.gridEls : [];
    const stripAt = opts?.stripTileAtIndex;
    const sp = 1;
    if (!indices.length) return;

    for (let ki = 0; ki < indices.length; ki += 1) {
      const i = indices[ki];
      const slotEl = slotEls[i];
      const gridEl = gridEls[i];
      const anchor = slotEl || gridEl;
      if (!anchor) {
        stripAt?.(i);
        continue;
      }

      const delay = ki * 0.1;
      await new Promise((r) => requestAnimationFrame(r));
      const bubble = showScoreBubble(anchor, "擦除", "sponge-erase", sp);
      let stripped = false;
      const onMidStrip = () => {
        if (stripped) return;
        stripped = true;
        stripAt?.(i);
        touchGrid();
      };

      await Promise.all([
        runDetachedTileShrinkReplacePop({ el: slotEl, delay, onMidReplace: onMidStrip }),
        runDetachedTileShrinkReplacePop({ el: gridEl, delay: delay + 0.02 }),
      ]);
      await nextTick();
      scheduleSmallPlusBubbleOutro(bubble, sp);
      if (ki < indices.length - 1) await sleep(90);
    }
  }

  return {
    runSubmittedIceShatterEffects,
    playSubmitWordLetterRemoveAndRewardLeave,
    playSubmitTileEnhancementStripLeave,
  };
}
