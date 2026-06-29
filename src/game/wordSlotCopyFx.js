import { SCORING_BUBBLE_POP_DELAY_MS } from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";

const COPY_BUBBLE_Z_INDEX = 380;

/**
 * @typedef {Object} WordSlotCopyFxDeps
 * @property {(index: number) => HTMLElement | null | undefined} getWordSlotEl
 * @property {(el: HTMLElement | null | undefined, sp?: number) => Promise<void>} awaitTreasureSlotWobbleEl
 * @property {(anchor: unknown, text: string, kind: string, speed?: number, bubbleZIndex?: number) => HTMLElement | null} showScoreBubble
 * @property {(bubble: HTMLElement | null | undefined, speed?: number) => void} scheduleSmallPlusBubbleOutro
 */

/**
 * 词槽整格 wobble + 槽上方「复制」气泡（传真机等；与计分 wobble 同目标 `.word-slot-tile`）。
 * @param {WordSlotCopyFxDeps} deps
 * @param {number} slotIndex
 * @param {number} [sp=1]
 */
export async function runWordSlotCopyFxAtIndex(deps, slotIndex, sp = 1) {
  const slotEl = deps.getWordSlotEl(slotIndex);
  if (!(slotEl instanceof HTMLElement)) return;
  const wobbleP = deps.awaitTreasureSlotWobbleEl(slotEl, sp);
  const bubbleP = (async () => {
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = deps.showScoreBubble(slotEl, "复制", "copy", sp, COPY_BUBBLE_Z_INDEX);
    if (bubble) deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    return bubble;
  })();
  await Promise.all([wobbleP, bubbleP]);
}
