import { grantDevOwnedTreasureById } from "./devGrantTreasures.js";
import { applyWordToGridTopRow } from "./treasureHookFxDevScenario.js";
import { iterTreasureHookContributions } from "../game/treasureBlueprintMirror.js";
import { getWordLetterCount } from "../composables/useScoring.js";
import {
  resolveJudgedLengthTableLen,
  resolveWordLengthJudgmentBonus,
} from "../game/wordLengthJudgmentBonus.js";
import { getWordLengthJudgmentBonus } from "../vouchers/voucherRuntime.js";
import { getPresetWordLengthJudgmentBonus } from "../game/runPresetRuntime.js";
import {
  sumTreasureLengthJudgmentPenalty,
  sumTreasureSubmitLengthBonus,
  TREASURE_HOOKS_BY_ID,
} from "../treasures/treasureRegistry.js";
import { readTreasureBankSnapshot } from "../treasures/treasureBankHelpers.js";
import { ensureOwnedSlotBank } from "../treasures/treasureRunState.js";

const LADDER_ID = "122";
const LADDER_LEVELS_ACTIVE = 3;

/** @typedef {Object} LadderQuisLengthProbeCtx
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {object[]} ownedTreasureInstances
 * @property {import('../treasures/treasureRunState.js').TreasureRunState | null | undefined} [treasureRun]
 * @property {Iterable<string>} [ownedVoucherIds]
 * @property {string} [presetId]
 * @property {number} [runWordLengthJudgmentPenalty]
 * @property {(word: string) => object | null | undefined} [getWordDefinition]
 * @property {string} [word]
 */

export const LADDER_QUIS_DEV_WORD = "quis";

/**
 * 仅两块梯子，且均为「还剩 3 关」生效态。
 * @param {Parameters<typeof grantDevOwnedTreasureById>[1]} grantDeps
 * @returns {number[]}
 */
export function grantTwoActiveLadderTreasures(grantDeps) {
  grantDeps.setOwnedTreasures([]);
  /** @type {number[]} */
  const slotIndices = [];
  for (let copy = 0; copy < 2; copy += 1) {
    const result = grantDevOwnedTreasureById(LADDER_ID, grantDeps);
    if (!result.ok) continue;
    slotIndices.push(result.slotIndex);
    const slot = grantDeps.getOwnedTreasures()[result.slotIndex];
    if (slot && typeof slot === "object") {
      ensureOwnedSlotBank(slot).posPackProgress = LADDER_LEVELS_ACTIVE;
    }
  }
  return slotIndices;
}

/**
 * @param {LadderQuisLengthProbeCtx} ctx
 */
export function buildLadderQuisLengthProbeReport(ctx) {
  const word = String(ctx.word ?? LADDER_QUIS_DEV_WORD).toLowerCase().trim();
  const ownedSlotTreasureIds = ctx.ownedSlotTreasureIds ?? [];
  const ownedTreasureInstances = ctx.ownedTreasureInstances ?? [];
  const actualLetterCount = getWordLetterCount([], word);

  const paintBonus = getWordLengthJudgmentBonus(ctx.ownedVoucherIds ?? []);
  const presetBonus = getPresetWordLengthJudgmentBonus(ctx.presetId ?? "");
  const runPenalty = Math.max(0, Math.floor(Number(ctx.runWordLengthJudgmentPenalty) || 0));
  const treasurePenalty = sumTreasureLengthJudgmentPenalty(ownedSlotTreasureIds);
  const ladderFlatBonus = sumTreasureSubmitLengthBonus(
    ownedSlotTreasureIds,
    ctx.treasureRun,
    ownedTreasureInstances,
  );
  const flatBonus = resolveWordLengthJudgmentBonus({
    ownedVoucherIds: ctx.ownedVoucherIds ?? [],
    ownedSlotTreasureIds,
    presetId: ctx.presetId ?? "",
    runWordLengthJudgmentPenalty: ctx.runWordLengthJudgmentPenalty ?? 0,
    treasureRun: ctx.treasureRun,
    ownedTreasureInstances,
  });
  const judgedLen = resolveJudgedLengthTableLen({
    wordLetterCount: actualLetterCount,
    ownedVoucherIds: ctx.ownedVoucherIds ?? [],
    ownedSlotTreasureIds,
    presetId: ctx.presetId ?? "",
    runWordLengthJudgmentPenalty: ctx.runWordLengthJudgmentPenalty ?? 0,
    treasureRun: ctx.treasureRun,
    ownedTreasureInstances,
    resolvedWord: word,
    getWordDefinition: ctx.getWordDefinition,
  });

  /** @type {{ slotIndex: number, posPackProgress: number | null, lengthBonus: number }[]} */
  const ladderSlots = [];
  for (const { treasureId, slotIndex, source } of iterTreasureHookContributions(ownedSlotTreasureIds)) {
    if (String(treasureId) !== LADDER_ID || source !== "self") continue;
    const hookCtx = {
      ownedSlotTreasureIds,
      ownedTreasureInstances,
      treasureRun: ctx.treasureRun,
      hookSlotIndex: slotIndex,
      hookSource: source,
    };
    const bank = readTreasureBankSnapshot(ctx.treasureRun ?? null, LADDER_ID, hookCtx);
    const lengthBonus = Math.max(
      0,
      Math.floor(Number(TREASURE_HOOKS_BY_ID.get(LADDER_ID)?.getSubmitLengthBonus?.(hookCtx)) || 0),
    );
    ladderSlots.push({
      slotIndex,
      posPackProgress: bank?.posPackProgress ?? null,
      lengthBonus,
    });
  }

  const expectedJudgedLen = actualLetterCount + 4;

  return {
    word,
    actualLetterCount,
    judgedLen,
    expectedJudgedLenIfTwoActiveLaddersOnly: expectedJudgedLen,
    matchesExpected: judgedLen === expectedJudgedLen,
    breakdown: {
      paintVoucherBonus: paintBonus,
      presetBonus,
      runWordLengthJudgmentPenalty: runPenalty,
      treasureLengthPenalty: treasurePenalty,
      ladderFlatBonusSum: ladderFlatBonus,
      flatBonusTotal: flatBonus,
      formula: `${actualLetterCount} + ${flatBonus} = ${judgedLen}`,
    },
    ladderSlots,
  };
}

/**
 * @param {object} deps
 * @param {string} word
 */
export async function autoSelectTopRowWord(deps, word) {
  const letters = String(word ?? "")
    .toLowerCase()
    .split("")
    .filter(Boolean);
  while (deps.getSelectedOrderLength?.() > 0) {
    deps.removeFromSlot?.(deps.getSelectedOrderLength() - 1);
    await deps.nextTick?.();
  }
  for (let c = 0; c < letters.length; c += 1) {
    deps.selectTile?.(0, c);
    await deps.nextTick?.();
  }
}

/**
 * @param {object} deps
 * @param {string} word
 */
export function applyWordToTopRow(deps, word) {
  applyWordToGridTopRow(deps.getGrid(), deps.ROWS, deps.COLS, word);
  deps.touchGrid?.();
}
