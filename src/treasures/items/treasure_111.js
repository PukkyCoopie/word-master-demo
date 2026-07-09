import { concept, describe } from "../treasureDescription.js";
import {
  isTreasureHookContributionActive,
  iterTreasureHookContributions,
  resolvePostLetterAnimSlotIndex,
} from "../../game/treasureBlueprintMirror.js";

const ID = "111";
const UPGRADE_FX_DELAY_MS = 300;

/**
 * 本关仍有效的日历 hook 贡献（实体槽 + 面具/绵羊 blueprint 镜像）。
 * @param {(string | null | undefined)[]} ownedIds
 * @returns {{ slotIndex: number, treasureId: string, source: "self" | "blueprint" }[]}
 */
function resolveActiveCalendarContributions(ownedIds) {
  return iterTreasureHookContributions(ownedIds).filter(
    (entry) => entry.treasureId === ID && isTreasureHookContributionActive(ownedIds, entry),
  );
}

/** @param {(string | null | undefined)[]} ownedIds */
function resolveCalendarOrchestratorContribution(ownedIds) {
  const active = resolveActiveCalendarContributions(ownedIds);
  return active.length ? active[0] : null;
}

/**
 * @param {import("../treasureTypes.js").TreasureDiscardContext} ctx
 * @param {(string | null | undefined)[]} snapshotOwned
 */
function isCalendarOrchestratorHook(ctx, snapshotOwned) {
  const liveOwned = ctx.getOwnedSlotTreasureIds?.() ?? snapshotOwned;
  const orchestrator = resolveCalendarOrchestratorContribution(liveOwned);
  if (!orchestrator) return false;
  const hookSlot = Math.floor(Number(ctx.hookSlotIndex) ?? -1);
  const hookSource = ctx.hookSource === "blueprint" ? "blueprint" : "self";
  return orchestrator.slotIndex === hookSlot && orchestrator.source === hookSource;
}

/**
 * 各贡献对应的动效槽（实体日历用真实槽；面具/绵羊 blueprint 用镜像槽）。
 * @param {(string | null | undefined)[]} ownedIds
 * @returns {number[]}
 */
function resolveActiveCalendarFxSlotIndices(ownedIds) {
  return resolveActiveCalendarContributions(ownedIds).map((entry) =>
    resolvePostLetterAnimSlotIndex(ownedIds, ID, entry.slotIndex, entry.source),
  );
}

/** @param {import("../treasureTypes.js").TreasureDiscardContext} ctx */
function shouldCalendarDiscardTrigger(ctx) {
  const rs = ctx.treasureRun;
  if (!rs || rs.levelFirstFullWordDiscardDone) return false;
  const chars = (ctx.discardedLetters ?? [])
    .map((p) => String(p?.letter ?? "").toLowerCase())
    .join("");
  if (!chars || !ctx.resolveDiscardedWord?.(chars)) return false;
  const len = Math.max(0, Math.round(Number(ctx.judgedWordLength ?? chars.length) || 0));
  if (len < 3 || len > 16) return false;
  return true;
}

/**
 * @param {import("../treasureTypes.js").TreasureDiscardContext} ctx
 * @param {number} len
 * @param {number} count
 */
async function runCalendarLengthUpgradeStaircase(ctx, len, count) {
  const n = Math.max(1, Math.floor(Number(count) || 1));
  if (
    typeof ctx.runInRunUpgradeStaircasePlayback === "function" &&
    typeof ctx.buildInRunLengthUpgradeStep === "function"
  ) {
    /** @type {{ apply?: () => void, payload: object }[]} */
    const steps = [];
    let virtualBefore = null;
    for (let i = 0; i < n; i += 1) {
      const step = ctx.buildInRunLengthUpgradeStep(len);
      if (!step?.payload) continue;
      if (virtualBefore == null) {
        virtualBefore = Math.max(1, Math.round(Number(step.payload.beforeLevel) || 1));
      }
      steps.push({
        apply: step.apply,
        payload: { ...step.payload, beforeLevel: virtualBefore },
      });
      virtualBefore += 1;
    }
    if (steps.length) {
      await ctx.runInRunUpgradeStaircasePlayback(steps);
      return;
    }
  }
  if (typeof ctx.runSingleInRunLengthUpgradeFx === "function") {
    for (let i = 0; i < n; i += 1) {
      await ctx.runSingleInRunLengthUpgradeFx(len);
    }
    return;
  }
  for (let i = 0; i < n; i += 1) {
    ctx.bumpWordLengthLevel?.(len);
  }
}

/**
 * 各生效槽依次 wobble +「升级」气泡（与宝藏栏多槽 FX 同节拍）。
 * @param {import("../treasureTypes.js").TreasureDiscardContext} ctx
 * @param {readonly number[]} slotIndices
 */
async function wobbleUpgradeAtCalendarSlots(ctx, slotIndices) {
  for (const slotIndex of slotIndices) {
    const ix = Math.floor(Number(slotIndex));
    if (typeof ctx.playOwnedTreasureBubbleFxAtSlot === "function") {
      await ctx.playOwnedTreasureBubbleFxAtSlot(ix, "升级", "upgrade");
      continue;
    }
    if (typeof ctx.wobbleOwnedTreasureAtSlot === "function") {
      await ctx.wobbleOwnedTreasureAtSlot(ix);
    } else {
      await ctx.playOwnedTreasureWobbleOnlyFx?.(ID);
    }
    if (typeof ctx.playOwnedTreasureBubbleOnlyFxAtSlot === "function") {
      await ctx.playOwnedTreasureBubbleOnlyFxAtSlot(ix, "升级", "upgrade");
    } else {
      await ctx.playOwnedTreasureBubbleOnlyFx?.(ID, "升级", "upgrade");
    }
  }
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  unlockPrerequisite: { type: "everDiscardedFullWord" },
  description: describe("每当你在关卡中第一次弃掉一个完整单词，", concept("升级"), "这个单词对应的长度"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onDiscardBatch(ctx) {
    if (!shouldCalendarDiscardTrigger(ctx)) return;

    const snapshotOwned = ctx.ownedSlotTreasureIds ?? [];
    if (!isCalendarOrchestratorHook(ctx, snapshotOwned)) return;

    const liveOwned = ctx.getOwnedSlotTreasureIds?.() ?? snapshotOwned;
    const calendarFxSlots = resolveActiveCalendarFxSlotIndices(liveOwned);
    if (!calendarFxSlots.length) return;
    if (!shouldCalendarDiscardTrigger(ctx)) return;

    ctx.treasureRun.levelFirstFullWordDiscardDone = true;

    const len = Math.max(
      0,
      Math.round(
        Number(
          ctx.judgedWordLength ??
            (ctx.discardedLetters ?? []).map((p) => String(p?.letter ?? "").toLowerCase()).join("").length,
        ) || 0,
      ),
    );

    await wobbleUpgradeAtCalendarSlots(ctx, calendarFxSlots);
    await new Promise((resolve) => setTimeout(resolve, UPGRADE_FX_DELAY_MS));
    await runCalendarLengthUpgradeStaircase(ctx, len, calendarFxSlots.length);
  },
};
