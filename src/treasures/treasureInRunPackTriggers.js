import {
  dictionaryPosMatchesAdverb,
  dictionaryPosMatchesTreasureLevelKey,
} from "../game/wordPosMatch.js";
import { bumpPosPackProgress, setPosPackProgress } from "./treasureInRunPackProgress.js";

/**
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {{ treasureId: string, packKind: import('../shop/rollInRunBundlePack.js').InRunBundlePackKind }} opts
 */
async function requestInRunPackOpen(ctx, opts) {
  const slotIx = ctx.findOwnedTreasureSlotIndex?.(opts.treasureId) ?? -1;
  await ctx.requestInRunPackOpenOfKind?.({
    kind: opts.packKind,
    treasureId: opts.treasureId,
    treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
  });
}

/**
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {string} word
 * @param {{ posKey?: 'n' | 'v' | 'adj', requireAdverb?: boolean }} match
 */
function wordMatchesPosRule(ctx, word, match) {
  const def = ctx.getWordDefinition?.(word);
  const pos = def?.pos;
  if (match.requireAdverb) return dictionaryPosMatchesAdverb(pos);
  if (match.posKey) return dictionaryPosMatchesTreasureLevelKey(pos, match.posKey);
  return false;
}

/**
 * 词性计数达标后打开对局内组合包（`requiredCount` 为 1 时每次匹配即开包，不记进度）。
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {{ treasureId: string, posKey?: 'n' | 'v' | 'adj', requireAdverb?: boolean, packKind: import('../shop/rollInRunBundlePack.js').InRunBundlePackKind, requiredCount: number }} opts
 */
export async function tryOpenInRunPackOnPosProgress(ctx, opts) {
  const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
  if (!word) return;
  if (!wordMatchesPosRule(ctx, word, opts)) return;

  const required = Math.max(1, Math.floor(Number(opts.requiredCount) || 1));
  if (required <= 1) {
    await requestInRunPackOpen(ctx, opts);
    return;
  }

  const rs = ctx.treasureRun;
  if (!rs) return;
  const next = bumpPosPackProgress(rs, opts.treasureId);
  if (next < required) return;
  setPosPackProgress(rs, opts.treasureId, 0);
  await requestInRunPackOpen(ctx, opts);
}
