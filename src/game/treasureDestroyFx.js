import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { TREASURE_HOOKS_BY_ID } from "../treasures/treasureRegistry.js";
import { SCORING_BUBBLE_POP_DELAY_MS } from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";
import { resolveBombAdjacentVictimSlotIndices, resolveBombBlastDestroySlotIndices } from "./treasureBombBlast.js";

/**
 * 自毁 / 连锁摧毁宝藏槽 FX（从 GamePanel 迁出）。
 * @param {{
 *   findOwnedTreasureSlotIndex: (treasureId: string) => number,
 *   ownedTreasureHasNoSellAccessory: (slot: object | null | undefined) => boolean,
 *   isTreasureBarSlotVisible: (slotIndex: number) => boolean,
 *   getOwnedTreasureSlotEl: (slotIndex: number) => HTMLElement | null,
 *   getOwnedTreasures: () => (object | null)[],
 *   removeAndCompactOwnedTreasureAtIndex: (slotIndex: number, opts?: { triggerBarCompactAnim?: boolean }) => void,
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
   * @param {{ text?: string, kind?: string }} [bubbleOpts]
   */
  async function wobbleTreasureSlotWithDestroyBubbleConcurrent(slotIndex, el, sp, bubbleOpts = {}) {
    const text = String(bubbleOpts.text ?? "摧毁！");
    const kind = String(bubbleOpts.kind ?? "destroy");
    const wobbleP = deps.wobbleGameTreasureSlot(slotIndex);
    const bubbleP = (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      return deps.showScoreBubble(el, text, kind, sp);
    })();
    const [, bubble] = await Promise.all([wobbleP, bubbleP]);
    return bubble;
  }

  /** @param {HTMLElement} el @param {ReturnType<typeof deps.showScoreBubble>} bubble @param {number} sp */
  async function shrinkTreasureSlotElOnly(el, bubble, sp) {
    gsap.killTweensOf(el);
    await new Promise((resolve) => {
      gsap.to(el, {
        scale: 0,
        opacity: 0,
        duration: 0.35,
        ease: EASE_TRANSFORM,
        transformOrigin: "50% 50%",
        onComplete: resolve,
      });
    });
    deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    gsap.set(el, { clearProps: "scale,opacity,transform" });
  }

  /** @param {number} slotIndex @param {HTMLElement} el @param {ReturnType<typeof deps.showScoreBubble>} bubble @param {number} sp */
  async function shrinkTreasureSlotAndClear(slotIndex, el, bubble, sp) {
    await shrinkTreasureSlotElOnly(el, bubble, sp);
    deps.removeAndCompactOwnedTreasureAtIndex(slotIndex);
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
    if (deps.ownedTreasureHasNoSellAccessory(slot)) return;
    if (!deps.isTreasureBarSlotVisible(ix)) {
      deps.removeAndCompactOwnedTreasureAtIndex(ix);
      deps.scheduleRunAutoSave();
      return;
    }
    const el = deps.getOwnedTreasureSlotEl(ix);
    if (!el) {
      deps.removeAndCompactOwnedTreasureAtIndex(ix);
      deps.scheduleRunAutoSave();
      return;
    }
    const sp = 1;
    const { text: bubbleText, kind: bubbleKind } = resolveSelfDestructBubbleForTreasure(tid);
    await awaitTreasureSlotWobbleEl(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = deps.showScoreBubble(el, bubbleText, bubbleKind, sp);
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
    if (victimIx >= 0 && deps.ownedTreasureHasNoSellAccessory(owned[victimIx])) return;
    if (sourceId) await deps.playOwnedTreasureWobbleOnlyFx(sourceId);
    const ix = victimIx;
    if (ix < 0) return;
    if (!deps.isTreasureBarSlotVisible(ix)) {
      deps.removeAndCompactOwnedTreasureAtIndex(ix);
      deps.scheduleRunAutoSave();
      return;
    }
    const el = deps.getOwnedTreasureSlotEl(ix);
    if (!el) {
      deps.removeAndCompactOwnedTreasureAtIndex(ix);
      deps.scheduleRunAutoSave();
      return;
    }
    const sp = 1;
    deps.setShopOverlayLayersSuppressed(true);
    await deps.waitNextTick();
    const bubble = await wobbleTreasureSlotWithDestroyBubbleConcurrent(ix, el, sp);
    deps.setShopOverlayLayersSuppressed(false);
    await shrinkTreasureSlotAndClear(ix, el, bubble, sp);
    deps.scheduleRunAutoSave();
  }

  /** 炸弹：本槽与左右邻槽（非空、非禁售）同时 wobble+气泡后一并移除 */
  async function destroyBombBlastAtSlot(bombSlotIndex) {
    const bombIx = Math.floor(Number(bombSlotIndex));
    if (!Number.isFinite(bombIx) || bombIx < 0) return;

    const owned = deps.getOwnedTreasures();
    const isSlotNoSell = (ix) => deps.ownedTreasureHasNoSellAccessory(owned[ix]);
    const adjacentVictims = resolveBombAdjacentVictimSlotIndices(owned, bombIx, isSlotNoSell);
    const indices = resolveBombBlastDestroySlotIndices(owned, bombIx, isSlotNoSell);
    if (!indices.length) return;

    deps.onBombBlastResolved?.({
      bombSlotIndex: bombIx,
      destroyedOtherTreasures: adjacentVictims.length > 0,
    });

    const sp = 1;
    /** @type {{ ix: number, el?: HTMLElement, bubbleText: string, bubbleKind: string, skipAnim: boolean }[]} */
    const targets = [];
    for (const ix of indices) {
      const slot = owned[ix];
      const tid = String(slot?.treasureId ?? "");
      const isBomb = ix === bombIx;
      const bubble = isBomb
        ? resolveSelfDestructBubbleForTreasure(tid)
        : { text: "摧毁！", kind: "destroy" };
      if (!deps.isTreasureBarSlotVisible(ix)) {
        targets.push({
          ix,
          bubbleText: bubble.text,
          bubbleKind: bubble.kind,
          skipAnim: true,
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
        });
        continue;
      }
      targets.push({
        ix,
        el,
        bubbleText: bubble.text,
        bubbleKind: bubble.kind,
        skipAnim: false,
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
          { text: t.bubbleText, kind: t.bubbleKind },
        );
        await shrinkTreasureSlotElOnly(/** @type {HTMLElement} */ (t.el), bubble, sp);
      }),
    );

    deps.setShopOverlayLayersSuppressed(false);

    deps.removeOwnedTreasureSlotsLeaveGapAtIndices(indices, { triggerBarCompactAnim: true });
    deps.scheduleRunAutoSave();
  }

  return {
    destroyOwnedTreasureWithFx,
    destroyOtherOwnedTreasureFromSourceFx,
    destroyBombBlastAtSlot,
    wobbleTreasureSlotWithDestroyBubbleConcurrent,
    shrinkTreasureSlotElOnly,
  };
}
