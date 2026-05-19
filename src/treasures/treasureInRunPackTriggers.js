import {
  dictionaryPosMatchesAdverb,
  dictionaryPosMatchesTreasureLevelKey,
  wordEndsWithSuffix,
} from "../game/wordPosMatch.js";

/**
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {{ treasureId: string, suffix?: string, posKey?: 'n' | 'v' | 'adj', requireAdverb?: boolean, packKind: import('../shop/rollInRunBundlePack.js').InRunBundlePackKind }} opts
 */
export async function tryOpenInRunPackOnWordMatch(ctx, opts) {
  const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
  if (!word) return;
  if (opts.suffix && !wordEndsWithSuffix(word, opts.suffix)) return;
  const def = ctx.getWordDefinition?.(word);
  const pos = def?.pos;
  if (opts.requireAdverb) {
    if (!dictionaryPosMatchesAdverb(pos)) return;
  } else if (opts.posKey) {
    if (!dictionaryPosMatchesTreasureLevelKey(pos, opts.posKey)) return;
  }
  const slotIx = ctx.findOwnedTreasureSlotIndex?.(opts.treasureId) ?? -1;
  await ctx.requestInRunPackOpenOfKind?.({
    kind: opts.packKind,
    treasureId: opts.treasureId,
    treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
  });
}
