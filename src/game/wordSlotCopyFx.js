import {
  PLUS_BUBBLE_OUTRO_DELAY_S,
  SCORING_BUBBLE_POP_DELAY_MS,
  SCORING_GAP_SCALE,
  SCORING_STEP_BEAT_MS,
} from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";
import { shouldSkipSettlementTreasureFx } from "../settings/settlementAnimSkip.js";

const COPY_BUBBLE_Z_INDEX = 380;
/** 复制气泡展示后额外停留（约为 outro 前可读时间的 55%，再接海绵擦除） */
const COPY_BUBBLE_LINGER_MS = Math.round(
  PLUS_BUBBLE_OUTRO_DELAY_S * 1000 * SCORING_GAP_SCALE * 0.55,
);
/** 复制步结束 → 字后海绵擦除等下一步（与逐字母计分 `SCORING_LETTER_GAP_MS` 一致） */
const COPY_TO_NEXT_STEP_GAP_MS = Math.round(50 * 1.2 * SCORING_GAP_SCALE);

/**
 * @typedef {Object} WordSlotCopyFxDeps
 * @property {(index: number) => HTMLElement | null | undefined} getWordSlotEl
 * @property {(el: HTMLElement | null | undefined, sp?: number) => Promise<void>} awaitTreasureSlotWobbleEl
 * @property {(anchor: unknown, text: string, kind: string, speed?: number, bubbleZIndex?: number) => HTMLElement | null} showScoreBubble
 * @property {(bubble: HTMLElement | null | undefined, speed?: number) => void} scheduleSmallPlusBubbleOutro
 */

/**
 * 词槽整格 wobble + 槽上方「复制」气泡（传真机等；与计分 wobble 同目标 `.word-slot-tile`）。
 * 时序：峰值出气泡 → 计分后摇 → 气泡可读停留 → 步间间隔，再接海绵擦除。
 * @param {WordSlotCopyFxDeps} deps
 * @param {number} slotIndex
 * @param {number} [sp=1]
 */
export async function runWordSlotCopyFxAtIndex(deps, slotIndex, sp = 1) {
  if (shouldSkipSettlementTreasureFx()) return;
  const slotEl = deps.getWordSlotEl(slotIndex);
  if (!(slotEl instanceof HTMLElement)) return;
  void deps.awaitTreasureSlotWobbleEl(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = deps.showScoreBubble(slotEl, "复制", "copy", sp, COPY_BUBBLE_Z_INDEX);
  if (bubble) deps.scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  await scoringSleep(COPY_BUBBLE_LINGER_MS, sp);
  await scoringSleep(COPY_TO_NEXT_STEP_GAP_MS, sp);
}
