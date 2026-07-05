import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { TREASURE_HOOKS_BY_ID } from "../treasures/treasureRegistry.js";
import { SCORING_BUBBLE_POP_DELAY_MS } from "./scoreBubbleFx.js";
import { getLevelEndAnimSpeed } from "./levelEndAnimSpeed.js";
import { scoringSleep } from "./submitScoringTiming.js";
import {
  resolveBombAdjacentVictimSlotIndices,
  resolveBombBlastDestroySlotIndices,
  resolveBombBlastFeintSlotIndices,
} from "./treasureBombBlast.js";
import {
  applyNoSellFeintBubbleStyle,
  restoreTreasureSlotAfterNoSellFeint,
} from "./treasureNoSellDestroyFeint.js";

/**
 * 自毁 / 连锁摧毁宝藏槽 FX（从 GamePanel 迁出）。
 * @param {{
 *   findOwnedTreasureSlotIndex: (treasureId: string) => number,
 *   ownedTreasureHasNoSellAccessory: (slot: object | null | undefined) => boolean,
 *   isTreasureBarSlotVisible: (slotIndex: number) => boolean,
 *   getOwnedTreasureSlotEl: (slotIndex: number) => HTMLElement | null,
 *   getOwnedTreasures: () => (object | null)[],
 *   removeOwnedTreasureSlotsLeaveGapAtIndices: (indices: readonly number[], opts?: { triggerBarCompactAnim?: boolean }) => void,
 *   scheduleRunAutoSave: () => void,
 *   wobbleGameTreasureSlot: (slotIndex: number) => Promise<void>,
 *   showScoreBubble: (el: HTMLElement, label: string, kind: string, speed?: number) => HTMLElement | null,
 *   scheduleSmallPlusBubbleOutro: (bubble: HTMLElement | null | undefined, speed?: number) => void,
 *   createWobbleScoreSlotTimeline: (el: HTMLElement | null | undefined) => import('gsap').core.Timeline | null,
 *   awaitWobbleScoreSlotTimeline: (tl: import('gsap').core.Timeline | null | undefined) => Promise<void>,
 *   playOwnedTreasureWobbleOnlyFx: (treasureId: string) => Promise<void>,
 *   setShopOverlayLayersSuppressed: (v: boolean) => void,
 *   waitNextTick: () => Promise<void>,
 *   onBombBlastResolved?: (payload: { bombSlotIndex: number, destroyedOtherTreasures: boolean }) => void,
 * }} deps
 */
export function createTreasureDestroyFx(deps) {
  /** @param {string} treasureId */
  function resolveSelfDestructBubbleForTreasure(treasureId) {
    const custom = TREASURE_HOOKS_BY_ID.get(String(treasureId))?.resolveSelfDestructBubble?.();
    if (custom?.text) {
      return { text: String(custom.text), kind: custom.kind ?? "destroy" };
    }
    return { text: "摧毁！", kind: "destroy" };
  }

  /** @param {HTMLElement} el @param {number} sp */
  async function awaitTreasureSlotWobbleEl(el, sp) {
    const wobbleTl = deps.createWobbleScoreSlotTimeline(el);
    if (wobbleTl) {
      wobbleTl.timeScale(sp);
      wobbleTl.play(0);
    }
    await deps.awaitWobbleScoreSlotTimeline(wobbleTl);
  }

  /**
   * @param {number} slotIndex
   * @param {HTMLElement} el
   * @param {number} sp
   * @param {{ text?: string, kind?: string, feint?: boolean }} [bubbleOpts]
   */
  async function wobbleTreasureSlotWithDestroyBubbleConcurrent(slotIndex, el, sp, bubbleOpts = {}) {
    const text = String(bubbleOpts.text ?? "摧毁！");
    const kind = String(bubbleOpts.kind ?? "destroy");
    const wobbleP = deps.wobbleGameTreasureSlot(slotIndex);
    const bubbleP = (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      const bubble = deps.showScoreBubble(el, text, kind, sp);
      if (bubbleOpts.feint) applyNoSellFeintBubbleStyle(bubble);
      return bubble;
    })();
    const [, bubble] = await Promise.all([wobbleP, bubbleP]);
    return bubble;
  }

  /**
   * @param {HTMLElement} el
   * @param {ReturnType<typeof deps.showScoreBubble>} bubble
   * @param {number} sp
   * @param {{ feint?: boolean }} [opts]
   */
  async function shrinkTreasureSlotElOnly(el, bubble, sp, opts = {}) {
    const feint = opts.feint === true;
    const s = Math.max(0.01, Number(sp) || getLevelEndAnimSpeed());
    gsap.killTweensOf(el);
    await new Promise((resolve) => {
      gsap.to(el, {
        scale: 0,
        opacity: 0,
        duration: 0.35 / s,
        ease: EASE_TRANSFORM,
        transformOrigin: "50% 50%",
        onComplete: resolve,
      });
    });
    deps.scheduleSmallPlusBubbleOutro(bubble, s);
    if (feint) {
      await restoreTreasureSlotAfterNoSellFeint(el, s);
      return;
    }
    gsap.set(el, { clearProps: "scale,opacity,transform" });
  }

  /** @param {number} slotIndex @param {HTMLElement} el @param {ReturnType<typeof deps.showScoreBubble>} bubble @param {number} sp */
  async function shrinkTreasureSlotAndClear(slotIndex, el, bubble, sp) {
    await shrinkTreasureSlotElOnly(el, bubble, sp);
    deps.removeOwnedTreasureSlotsLeaveGapAtIndices([slotIndex], { triggerBarCompactAnim: true });
  }

  async function destroyOwnedTreasureWithFx(treasureId, slotIndex = null) {
    const ix =
      typeof slotIndex === "number" && slotIndex >= 0
        ? slotIndex
        : deps.findOwnedTreasureSlotIndex(treasureId);
    if (ix < 0) return;
    const owned = deps.getOwnedTreasures();
    const slot = owned[ix];
    const tid = String(treasureId ?? slot?.treasureId ?? "");
    const feint = deps.ownedTreasureHasNoSellAccessory(slot);
    if (!deps.isTreasureBarSlotVisible(ix)) {
      if (!feint) {
        deps.removeOwnedTreasureSlotsLeaveGapAtIndices([ix]);
        deps.scheduleRunAutoSave();
      }
      return;
    }
    const el = deps.getOwnedTreasureSlotEl(ix);
    if (!el) {
      if (!feint) {
        deps.removeOwnedTreasureSlotsLeaveGapAtIndices([ix]);
        deps.scheduleRunAutoSave();
      }
      return;
    }
    const sp = getLevelEndAnimSpeed();
    const { text: bubbleText, kind: bubbleKind } = resolveSelfDestructBubbleForTreasure(tid);
    await awaitTreasureSlotWobbleEl(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = deps.showScoreBubble(el, bubbleText, bubbleKind, sp);
    if (feint) applyNoSellFeintBubbleStyle(bubble);
    if (feint) {
      await shrinkTreasureSlotElOnly(el, bubble, sp, { feint: true });
      return;
    }
    await shrinkTreasureSlotAndClear(ix, el, bubble, sp);
    deps.scheduleRunAutoSave();
  }

  async function destroyOtherOwnedTreasureFromSourceFx(
    sourceTreasureId,
    victimTreasureId,
    victimSlotIndex = null,
  ) {
    const sourceId = String(sourceTreasureId ?? "");
    const victimId = String(victimTreasureId ?? "");
    if (!victimId) return;
    const owned = deps.getOwnedTreasures();
    const victimIx =
      typeof victimSlotIndex === "number" && victimSlotIndex >= 0
        ? victimSlotIndex
        : deps.findOwnedTreasureSlotIndex(victimId);
    const feint = victimIx >= 0 && deps.ownedTreasureHasNoSellAccessory(owned[victimIx]);
    if (sourceId) await deps.playOwnedTreasureWobbleOnlyFx(sourceId);
    const ix = victimIx;
    if (ix < 0) return;
    if (!deps.isTreasureBarSlotVisible(ix)) {
      if (!feint) {
        deps.removeOwnedTreasureSlotsLeaveGapAtIndices([ix]);
        deps.scheduleRunAutoSave();
      }
      return;
    }
    const el = deps.getOwnedTreasureSlotEl(ix);
    if (!el) {
      if (!feint) {
        deps.removeOwnedTreasureSlotsLeaveGapAtIndices([ix]);
        deps.scheduleRunAutoSave();
      }
      return;
    }
    const sp = getLevelEndAnimSpeed();
    deps.setShopOverlayLayersSuppressed(true);
    await deps.waitNextTick();
    const bubble = await wobbleTreasureSlotWithDestroyBubbleConcurrent(ix, el, sp, { feint });
    deps.setShopOverlayLayersSuppressed(false);
    await shrinkTreasureSlotElOnly(el, bubble, sp, { feint });
    if (!feint) {
      deps.removeOwnedTreasureSlotsLeaveGapAtIndices([ix], { triggerBarCompactAnim: true });
      deps.scheduleRunAutoSave();
    }
  }

  /** 炸弹：本槽与左右邻槽（非空、非禁售邻槽）同时 wobble+气泡；禁售炸弹仅假爆炸 */
  async function destroyBombBlastAtSlot(bombSlotIndex) {
    const bombIx = Math.floor(Number(bombSlotIndex));
    if (!Number.isFinite(bombIx) || bombIx < 0) return;

    const owned = deps.getOwnedTreasures();
    const isSlotNoSell = (ix) => deps.ownedTreasureHasNoSellAccessory(owned[ix]);
    const destroyIndices = resolveBombBlastDestroySlotIndices(owned, bombIx, isSlotNoSell);
    const feintIndices = resolveBombBlastFeintSlotIndices(owned, bombIx, isSlotNoSell);
    const adjacentVictims = resolveBombAdjacentVictimSlotIndices(owned, bombIx, isSlotNoSell);
    if (!destroyIndices.length && !feintIndices.length) return;

    deps.onBombBlastResolved?.({
      bombSlotIndex: bombIx,
      destroyedOtherTreasures: adjacentVictims.length > 0,
    });

    const sp = getLevelEndAnimSpeed();
    const animateOrder = [...destroyIndices, ...feintIndices.filter((ix) => !destroyIndices.includes(ix))];
    /** @type {{ ix: number, el?: HTMLElement, bubbleText: string, bubbleKind: string, skipAnim: boolean, feint: boolean }[]} */
    const targets = [];
    for (const ix of animateOrder) {
      const slot = owned[ix];
      const tid = String(slot?.treasureId ?? "");
      const isBomb = ix === bombIx;
      const bubble = isBomb
        ? resolveSelfDestructBubbleForTreasure(tid)
        : { text: "摧毁！", kind: "destroy" };
      const feint = feintIndices.includes(ix);
      if (!deps.isTreasureBarSlotVisible(ix)) {
        targets.push({
          ix,
          bubbleText: bubble.text,
          bubbleKind: bubble.kind,
          skipAnim: true,
          feint,
        });
        continue;
      }
      const el = deps.getOwnedTreasureSlotEl(ix);
      if (!el) {
        targets.push({
          ix,
          bubbleText: bubble.text,
          bubbleKind: bubble.kind,
          skipAnim: true,
          feint,
        });
        continue;
      }
      targets.push({
        ix,
        el,
        bubbleText: bubble.text,
        bubbleKind: bubble.kind,
        skipAnim: false,
        feint,
      });
    }

    deps.setShopOverlayLayersSuppressed(true);
    await deps.waitNextTick();

    const animated = targets.filter((t) => !t.skipAnim && t.el);
    await Promise.all(
      animated.map(async (t) => {
        const bubble = await wobbleTreasureSlotWithDestroyBubbleConcurrent(
          t.ix,
          /** @type {HTMLElement} */ (t.el),
          sp,
          { text: t.bubbleText, kind: t.bubbleKind, feint: t.feint },
        );
        await shrinkTreasureSlotElOnly(/** @type {HTMLElement} */ (t.el), bubble, sp, {
          feint: t.feint,
        });
      }),
    );

    deps.setShopOverlayLayersSuppressed(false);

    const removeIndices = destroyIndices.filter((ix) => {
      const target = targets.find((t) => t.ix === ix);
      return !target?.feint;
    });
    if (removeIndices.length) {
      deps.removeOwnedTreasureSlotsLeaveGapAtIndices(removeIndices, { triggerBarCompactAnim: true });
      deps.scheduleRunAutoSave();
    }
  }

  return {
    destroyOwnedTreasureWithFx,
    destroyOtherOwnedTreasureFromSourceFx,
    destroyBombBlastAtSlot,
    wobbleTreasureSlotWithDestroyBubbleConcurrent,
    shrinkTreasureSlotElOnly,
  };
}
