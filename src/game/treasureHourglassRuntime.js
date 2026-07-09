import { ACCESSORY_HOURGLASS, ACCESSORY_RENTAL } from "../accessories/accessoryCatalog.js";
import { readTreasureAccessoryIds, treasureHasAccessory } from "../accessories/accessoryState.js";
import {
  SCORING_BUBBLE_POP_DELAY_MS,
} from "./scoreBubbleFx.js";
import { getLevelEndAnimSpeed } from "./levelEndAnimSpeed.js";
import { scoringSleep } from "./submitScoringTiming.js";
import { isLevelEndSettlementSkipActive } from "../settings/settlementAnimSkip.js";

export const HOURGLASS_EXPIRE_STAGES = 5;

/** @param {Record<string, unknown> | null | undefined} slot */
export function slotHasActiveHourglass(slot) {
  if (!slot) return false;
  return treasureHasAccessory(slot, ACCESSORY_HOURGLASS) && slot.treasureAccessoryExpired !== true;
}

/** @param {Record<string, unknown> | null | undefined} entity */
export function isHourglassAccessoryExpired(entity) {
  if (!entity || entity.treasureAccessoryExpired !== true) return false;
  return treasureHasAccessory(entity, ACCESSORY_HOURGLASS);
}

/**
 * @param {Record<string, unknown>} slot
 * @returns {{ kind: 'none' } | { kind: 'tick', count: number } | { kind: 'expired' }}
 */
export function incrementHourglassOnSlot(slot) {
  if (!slotHasActiveHourglass(slot)) return { kind: "none" };
  const elapsed = Math.max(0, Math.floor(Number(slot.hourglassStagesElapsed) || 0)) + 1;
  slot.hourglassStagesElapsed = elapsed;
  if (elapsed >= HOURGLASS_EXPIRE_STAGES) {
    slot.treasureAccessoryExpired = true;
    return { kind: "expired" };
  }
  return { kind: "tick", count: elapsed };
}

/**
 * @param {readonly (Record<string, unknown> | null)[]} ownedSlots
 * @returns {number}
 */
export function countOwnedRentalTreasures(ownedSlots) {
  if (!Array.isArray(ownedSlots)) return 0;
  let n = 0;
  for (const s of ownedSlots) {
    if (s && readTreasureAccessoryIds(s).includes(ACCESSORY_RENTAL)) n += 1;
  }
  return n;
}

/**
 * 已拥有宝藏详情：沙漏配饰分区追加行（「还剩 x 个关卡」或橙红「（已失效）」）。
 * @param {Record<string, unknown> | null | undefined} slot
 * @returns {import('../treasures/treasureDescription.js').TreasureDescSegment[] | null}
 */
export function buildHourglassOwnedAccessoryStatusSegments(slot) {
  if (!slot || !treasureHasAccessory(slot, ACCESSORY_HOURGLASS)) return null;
  if (slot.treasureAccessoryExpired === true) {
    return [{ type: "br" }, { type: "riskText", v: "（已失效）" }];
  }
  const elapsed = Math.max(0, Math.floor(Number(slot.hourglassStagesElapsed) || 0));
  const remaining = Math.max(0, HOURGLASS_EXPIRE_STAGES - elapsed);
  // 括号起首行由 TreasureDescRichText.injectLineBreaksBeforeParentheses 换行，勿再前置 br
  return [{ type: "text", v: `（还剩${remaining}个关卡）` }];
}

/** @param {readonly (Record<string, unknown> | null)[]} ownedSlots */
export function getTreasureAccessoryExpiredSlotIndices(ownedSlots) {
  /** @type {number[]} */
  const out = [];
  if (!Array.isArray(ownedSlots)) return out;
  for (let i = 0; i < ownedSlots.length; i += 1) {
    if (ownedSlots[i]?.treasureAccessoryExpired === true) out.push(i);
  }
  return out;
}

/**
 * 小关结束：沙漏配饰 tick / 失效气泡 FX。
 * @param {{
 *   getOwnedTreasures: () => (Record<string, unknown> | null)[],
 *   setOwnedTreasures: (slots: (Record<string, unknown> | null)[]) => void,
 *   wobbleScoreSlot: (el: HTMLElement, speed?: number) => void,
 *   getOwnedTreasureBarFxEl: (slotIndex: number) => HTMLElement | null | undefined,
 *   showScoreBubble: (el: HTMLElement, label: string, kind: string, speed?: number) => HTMLElement | null,
 *   scheduleSmallPlusBubbleOutro: (bubble: HTMLElement | null | undefined, speed?: number) => void,
 *   scheduleRunAutoSave: () => void,
 * }} deps
 */
export function createTreasureHourglassStageFx(deps) {
  /** @param {number} slotIndex @param {number} elapsedStages @param {number} sp */
  function showTreasureSlotHourglassBubbleAtPeak(slotIndex, elapsedStages, sp) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const count = Math.max(1, Math.floor(Number(elapsedStages) || 0));
    const bubble = deps.showScoreBubble(el, `${count}/${HOURGLASS_EXPIRE_STAGES}`, "hourglass", sp);
    deps.scheduleSmallPlusBubbleOutro(bubble, sp);
  }

  /** @param {number} slotIndex @param {number} sp */
  function showTreasureSlotExpiredBubbleAtPeak(slotIndex, sp) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const bubble = deps.showScoreBubble(el, "已失效", "accessory-expired", sp);
    deps.scheduleSmallPlusBubbleOutro(bubble, sp);
  }

  /** @param {number} slotIndex @param {number} elapsedStages */
  async function playTreasureSlotHourglassBubbleAtPeak(slotIndex, elapsedStages) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const sp = getLevelEndAnimSpeed();
    deps.wobbleScoreSlot(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    showTreasureSlotHourglassBubbleAtPeak(slotIndex, elapsedStages, sp);
  }

  /** @param {number} slotIndex */
  async function playTreasureSlotExpiredBubbleAtPeak(slotIndex) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const sp = getLevelEndAnimSpeed();
    deps.wobbleScoreSlot(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    showTreasureSlotExpiredBubbleAtPeak(slotIndex, sp);
  }

  /**
   * @param {{ onBeforeEachTick?: () => void | Promise<void> }} [opts]
   */
  async function runHourglassStageEndFx(opts = {}) {
    const slots = deps.getOwnedTreasures();
    let changed = false;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot || typeof slot !== "object") continue;
      const result = incrementHourglassOnSlot(/** @type {Record<string, unknown>} */ (slot));
      if (result.kind === "none") continue;
      changed = true;
      await opts.onBeforeEachTick?.();
      if (isLevelEndSettlementSkipActive()) continue;
      const el = deps.getOwnedTreasureBarFxEl(i);
      if (!el) continue;
      const sp = getLevelEndAnimSpeed();
      deps.wobbleScoreSlot(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      if (result.kind === "tick") {
        showTreasureSlotHourglassBubbleAtPeak(i, result.count, sp);
      } else if (result.kind === "expired") {
        showTreasureSlotExpiredBubbleAtPeak(i, sp);
      }
    }
    if (changed) {
      deps.setOwnedTreasures([...slots]);
      deps.scheduleRunAutoSave();
    }
  }

  return {
    runHourglassStageEndFx,
    playTreasureSlotHourglassBubbleAtPeak,
    playTreasureSlotExpiredBubbleAtPeak,
  };
}
