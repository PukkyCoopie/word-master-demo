import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { addMultMulBank, treasureBankHookCtxFromSubmitSlot } from "../treasures/treasureBankHelpers.js";
import {
  TREASURE_78_ICE_SHATTER_MULT_BUBBLE,
  TREASURE_78_ICE_SHATTER_MULT_INCREMENT,
  TREASURE_78_ID,
} from "../treasures/items/treasure_78.js";
import {
  SCORING_BUBBLE_POP_DELAY_MS,
  SCORING_STEP_BEAT_MS,
  PLUS_BUBBLE_OUTRO_SCALE,
  PLUS_BUBBLE_ENTER_DURATION_S,
} from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";
import {
  shouldSkipSettlementAnim,
  shouldSkipSettlementTreasureFx,
  shouldSkipSubmitTailTreasureFx,
} from "../settings/settlementAnimSkip.js";
import { schedulePopupBubbleDismiss } from "./popupBubbleFx.js";
import {
  ICE_MATERIAL_SHATTER_PROB_DEN,
  ICE_MATERIAL_SHATTER_PROB_NUM,
} from "./iceMaterialScoring.js";
import { rollProbabilitySuccess } from "../treasures/treasureProbability.js";
import { resolveWordSlotShrinkPopEl } from "./gridTileIgniteFx.js";

const TOOLBOX_REMOVE_BUBBLE_HOLD_MS = 200;
const TOOLBOX_REMOVE_SHRINK_S = 0.14;
const TOOLBOX_REMOVE_LETTER_GAP_MS = 48;
const TOOLBOX_REMOVE_BEFORE_MONEY_MS = 0;
const TOOLBOX_REMOVE_BUBBLE_OUTRO_DELAY_S = 0.2;
const TOOLBOX_REMOVE_BUBBLE_OUTRO_DURATION_S = 0.24;

/** 海绵擦除：总时长略长于记分气泡入场（0.14s），对齐 wobble+bubble 体感 */
const SPONGE_ERASE_SHRINK_S = PLUS_BUBBLE_ENTER_DURATION_S * 0.55;
const SPONGE_ERASE_YIELD_S = 0.02;
const SPONGE_ERASE_POP_IN_S = PLUS_BUBBLE_ENTER_DURATION_S * 0.62;
const SPONGE_ERASE_POP_SETTLE_S = PLUS_BUBBLE_ENTER_DURATION_S * 0.45;
const SPONGE_ERASE_POP_PEAK = 1.06;
const SPONGE_ERASE_LETTER_STAGGER_S = 0.04;
const SPONGE_ERASE_LETTER_GAP_MS = 44;

/** @param {HTMLElement | null | undefined} gridEl `.grid-tile` 或外包 `.letter-grid-cell` */
function resolveGridTileLeaveAnimEl(gridEl) {
  if (!(gridEl instanceof HTMLElement)) return null;
  if (gridEl.classList.contains("grid-tile")) return gridEl;
  const tile = gridEl.querySelector(".grid-tile");
  return tile instanceof HTMLElement ? tile : gridEl;
}

/**
 * @typedef {Object} SubmitTileLeaveAnimDeps
 * @property {{ treasureRunState: import('vue').Ref<object>, ownedTreasures: import('vue').Ref<(object | null)[]> }} refs
 * @property {() => HTMLElement[]} getSelectedGridTileElsInOrder
 * @property {() => (HTMLElement | undefined)[]} getWordSlotRefs
 * @property {(treasureId: string) => number} findOwnedTreasureSlotIndex
 * @property {(treasureId: string) => number[]} findAllOwnedTreasureSlotIndices
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
 * 提交/弃牌路径：冰碎、菜刀移除离场、海绵擦除（S.4）。
 *
 * @param {SubmitTileLeaveAnimDeps} deps
 */
export function createSubmitTileLeaveAnim(deps) {
  const {
    refs,
    getSelectedGridTileElsInOrder,
    getWordSlotRefs,
    findOwnedTreasureSlotIndex,
    findAllOwnedTreasureSlotIndices,
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

  /** 词槽离场/缩放回弹：缩放 `.word-slot-tile` 外包层，并清掉内层残留 transform */
  /** @param {HTMLElement | null | undefined} slotWrapper */
  function prepWordSlotLeaveAnimWrapper(slotWrapper) {
    const animEl = resolveWordSlotShrinkPopEl(slotWrapper);
    if (!(animEl instanceof HTMLElement)) return null;
    if (slotWrapper instanceof HTMLElement) {
      const inner = slotWrapper.querySelector(".word-slot-content");
      if (inner instanceof HTMLElement) {
        gsapLib.killTweensOf(inner);
        gsapLib.set(inner, { clearProps: "scale,rotation,x,y,transform" });
      }
    }
    return animEl;
  }

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
    const wordAnimEl = prepWordSlotLeaveAnimWrapper(slotEl);
    const gridAnimEl = resolveGridTileLeaveAnimEl(gridEl);
    return new Promise((resolve) => {
      let done = 0;
      const need = (wordAnimEl ? 1 : 0) + (gridAnimEl ? 1 : 0);
      if (need === 0) {
        resolve();
        return;
      }
      const finish = () => {
        done += 1;
        if (done >= need) resolve();
      };
      const fireRemoveHaptic = () => triggerHaptic("tileRemove");
      if (wordAnimEl) {
        gsapLib.killTweensOf(wordAnimEl);
        gsapLib.set(wordAnimEl, { transformOrigin: "50% 55%" });
        gsapLib.to(wordAnimEl, {
          opacity: 0,
          scale: 0,
          duration,
          ease: EASE_TRANSFORM,
          onStart: fireRemoveHaptic,
          onComplete: () => {
            /* 保持离场终态，勿 clearProps；DOM 清空前否则会瞬间弹回正常大小 */
            gsapLib.set(wordAnimEl, { opacity: 0, scale: 0, transformOrigin: "50% 55%" });
            finish();
          },
        });
      }
      if (gridAnimEl) {
        gsapLib.killTweensOf(gridAnimEl);
        gsapLib.set(gridAnimEl, { transformOrigin: "50% 50%" });
        gsapLib.to(gridAnimEl, {
          opacity: 0,
          scale: 0,
          duration,
          ease: EASE_TRANSFORM,
          onStart: slotEl ? undefined : fireRemoveHaptic,
          onComplete: () => {
            gsapLib.set(gridAnimEl, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
            finish();
          },
        });
      }
    });
  }

  /** @param {HTMLElement | null | undefined} slotEl @param {number} [speed] */
  async function playToolboxRemoveWobbleAndBubble(slotEl, speed = 1) {
    const wordAnimEl = prepWordSlotLeaveAnimWrapper(slotEl);
    if (!wordAnimEl) return;
    const sp = Math.max(0.01, Number(speed) || 1);
    await awaitTreasureSlotWobbleEl(wordAnimEl, sp);
    const bubble = showScoreBubble(wordAnimEl, "移除", "destroy", sp);
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

  /** @param {object} t */
  function applyIceShatterStateForTile(t) {
    refs.treasureRunState.value.runIceMaterialShattered = true;
    const deckUid = t?._deckCard?._dcUid;
    if (deckUid != null) {
      removeDeckCardByUidAndNotify(deckUid, { clearGrid: false });
    }
  }

  /** @param {object[]} tiles */
  async function runSubmittedIceShatterEffects(tiles) {
    const list = Array.isArray(tiles) ? tiles : [];
    const gridEls = getSelectedGridTileElsInOrder();
    const snowmanSlotIndices = findAllOwnedTreasureSlotIndices(TREASURE_78_ID);
    const iceShatterTreasureFxHandled = snowmanSlotIndices.length > 0;
    const ownedInstances = refs.ownedTreasures.value;
    const ownedSlotIds = ownedInstances.map((s) => s?.treasureId ?? null);

    /** @param {boolean} withBubble */
    async function applySnowmanIceShatterTreasureFx(withBubble) {
      if (!iceShatterTreasureFxHandled) return;
      for (const slotIx of snowmanSlotIndices) {
        addMultMulBank(
          refs.treasureRunState.value,
          TREASURE_78_ID,
          TREASURE_78_ICE_SHATTER_MULT_INCREMENT,
          treasureBankHookCtxFromSubmitSlot(ownedInstances, ownedSlotIds, slotIx),
        );
        if (withBubble) {
          await playTreasureSlotBubbleBurstAtPeak(
            slotIx,
            TREASURE_78_ICE_SHATTER_MULT_BUBBLE,
            "mult",
          );
        }
      }
    }

    let shatterCount = 0;
    const skipFx = shouldSkipSettlementTreasureFx();
    let iceShatterHapticCount = 0;
    for (let i = 0; i < list.length; i += 1) {
      const t = list[i];
      if (t?.materialId !== "ice" || isBossTileDebuffed(t)) continue;
      if (
        !rollProbabilitySuccess(
          ICE_MATERIAL_SHATTER_PROB_NUM,
          ICE_MATERIAL_SHATTER_PROB_DEN,
          runRandom,
          ownedSlotIds,
        )
      ) {
        continue;
      }
      shatterCount += 1;
      if (!skipFx && iceShatterHapticCount < 3) {
        triggerHaptic("land");
        iceShatterHapticCount += 1;
      }
      applyIceShatterStateForTile(t);
      if (skipFx) {
        await applySnowmanIceShatterTreasureFx(false);
        await notifyIceBreak({ iceShatterTreasureFxHandled });
        continue;
      }
      const slotEl = getWordSlotRefs()[i];
      const gridEl = gridEls[i];
      await playIceTileShatterWobbleAndBubble(slotEl, gridEl);
      await applySnowmanIceShatterTreasureFx(true);
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
    const treasureSlotIx =
      typeof opts?.treasureSlotIndex === "number" && opts.treasureSlotIndex >= 0
        ? opts.treasureSlotIndex
        : findOwnedTreasureSlotIndex(treasureId);
    const sp = 1;
    const amt = Math.max(0, Math.floor(Number(opts?.moneyAmount) || 0));

    /* 跳过计分动画：离场视觉交给 runSlotAndGridLeaveAnimation，此处只做牌库/金币等副作用 */
    if (shouldSkipSettlementAnim()) {
      opts.onRemoveDeck?.();
      if (amt > 0 && !shouldSkipSubmitTailTreasureFx()) {
        if (treasureSlotIx >= 0) await playTreasureSlotMoneyBurstAtPeak(treasureSlotIx, amt);
        else await playOwnedTreasureMoneyFx(treasureId, amt);
      }
      return;
    }

    for (let i = 0; i < n; i++) {
      const slotEl = slotEls[i];
      const gridEl = gridEls[i];
      if (i === 0 && treasureSlotIx >= 0) {
        await wobbleGameTreasureSlot(treasureSlotIx);
      }
      await playToolboxRemoveWobbleAndBubble(slotEl, sp);
      await sleep(TOOLBOX_REMOVE_BUBBLE_HOLD_MS);
      await animateToolboxTileShrinkToZero(slotEl, gridEl, TOOLBOX_REMOVE_SHRINK_S);
      if (i < n - 1) await sleep(TOOLBOX_REMOVE_LETTER_GAP_MS);
    }

    opts.onRemoveDeck?.();
    if (TOOLBOX_REMOVE_BEFORE_MONEY_MS > 0) await sleep(TOOLBOX_REMOVE_BEFORE_MONEY_MS);
    if (amt > 0) {
      if (treasureSlotIx >= 0) await playTreasureSlotMoneyBurstAtPeak(treasureSlotIx, amt);
      else await playOwnedTreasureMoneyFx(treasureId, amt);
    }
  }

  /** @param {HTMLElement | null | undefined} el @param {number} delay @param {() => void | Promise<void>} [onMidShrink] */
  async function animateSpongeErasePop(el, delay, onMidShrink) {
    if (!(el instanceof HTMLElement)) {
      await onMidShrink?.();
      return;
    }
    gsapLib.killTweensOf(el);
    gsapLib.set(el, { transformOrigin: "50% 50%", rotation: 0 });
    if (delay > 0) {
      await new Promise((resolve) => {
        gsapLib.delayedCall(delay, resolve);
      });
    }
    await new Promise((resolve) => {
      gsapLib.to(el, {
        scale: 0,
        duration: SPONGE_ERASE_SHRINK_S,
        ease: "power3.in",
        onComplete: resolve,
      });
    });
    await Promise.resolve(onMidShrink?.());
    await new Promise((resolve) => {
      const tl = gsapLib.timeline({
        onComplete: () => {
          gsapLib.set(el, { clearProps: "scale,rotation" });
          resolve();
        },
      });
      tl.to({}, { duration: SPONGE_ERASE_YIELD_S });
      tl.to(el, {
        scale: SPONGE_ERASE_POP_PEAK,
        duration: SPONGE_ERASE_POP_IN_S,
        ease: "back.out(1.42)",
      });
      tl.to(el, { scale: 1, duration: SPONGE_ERASE_POP_SETTLE_S, ease: "power3.out" });
    });
  }

  /** @param {import('../treasures/treasureTypes.js').SubmitWordEnhancementStripLeaveOpts} opts */
  async function playSubmitTileEnhancementStripLeave(opts) {
    const indices = Array.isArray(opts?.indices) ? opts.indices : [];
    const slotEls = Array.isArray(opts?.slotEls) ? opts.slotEls : [];
    const gridEls = Array.isArray(opts?.gridEls) ? opts.gridEls : [];
    const stripAt = opts?.stripTileAtIndex;
    const sp = 1;
    if (!indices.length) return;

    if (shouldSkipSettlementTreasureFx()) {
      for (const i of indices) {
        stripAt?.(i);
      }
      touchGrid();
      await nextTick();
      return;
    }

    for (let ki = 0; ki < indices.length; ki += 1) {
      const i = indices[ki];
      const slotEl = slotEls[i];
      const gridEl = gridEls[i];
      const wordAnimEl = prepWordSlotLeaveAnimWrapper(slotEl);
      const gridAnimEl = resolveGridTileLeaveAnimEl(gridEl);
      if (!wordAnimEl && !gridAnimEl) {
        stripAt?.(i);
        continue;
      }

      const delay = ki * SPONGE_ERASE_LETTER_STAGGER_S;
      await new Promise((r) => requestAnimationFrame(r));
      const bubbleAnchor = wordAnimEl ?? slotEl ?? gridAnimEl ?? gridEl;
      const bubble = showScoreBubble(bubbleAnchor, "擦除", "sponge-erase", sp);
      let stripped = false;
      const onMidStrip = async () => {
        if (stripped) return;
        stripped = true;
        stripAt?.(i);
        touchGrid();
        await nextTick();
      };

      await Promise.all([
        animateSpongeErasePop(wordAnimEl, delay, onMidStrip),
        animateSpongeErasePop(gridAnimEl, delay + 0.015),
      ]);
      scheduleSmallPlusBubbleOutro(bubble, sp);
      if (ki < indices.length - 1) await sleep(SPONGE_ERASE_LETTER_GAP_MS);
    }
  }

  return {
    runSubmittedIceShatterEffects,
    playSubmitWordLetterRemoveAndRewardLeave,
    playSubmitTileEnhancementStripLeave,
  };
}
