import {
  dictionaryPosMatchesAdverb,
  dictionaryPosMatchesTreasureLevelKey,
} from "../game/wordPosMatch.js";
import { resolveTreasureHookAnimSlotIndex } from "../game/treasureBlueprintMirror.js";
import { rollProbabilitySuccess } from "./treasureProbability.js";

/**
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {{ treasureId: string, packKind: import('../shop/rollInRunBundlePack.js').InRunBundlePackKind }} opts
 */
async function requestInRunPackOpen(ctx, opts) {
  const hookSlot = resolveTreasureHookAnimSlotIndex(ctx);
  const slotIx =
    hookSlot != null ? hookSlot : (ctx.findOwnedTreasureSlotIndex?.(opts.treasureId) ?? -1);
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
  const translationZh = def?.translation_zh;
  if (match.requireAdverb) return dictionaryPosMatchesAdverb(pos);
  if (match.posKey) return dictionaryPosMatchesTreasureLevelKey(pos, match.posKey, translationZh);
  return false;
}

/**
 * 词性匹配后按 1/requiredCount 概率打开对局内组合包（requiredCount 为 1 时每次匹配必开）。
 * 提交计分流程中会通过 `registerSubmitPostScoreClearFx` 延后至本词总分入库与补牌动画结束后再开包。
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @param {{ treasureId: string, posKey?: 'n' | 'v' | 'adj', requireAdverb?: boolean, packKind: import('../shop/rollInRunBundlePack.js').InRunBundlePackKind, requiredCount: number }} opts
 */
export async function tryOpenInRunPackOnPosProgress(ctx, opts) {
  const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
  if (!word) return;
  if (!wordMatchesPosRule(ctx, word, opts)) return;

  const required = Math.max(1, Math.floor(Number(opts.requiredCount) || 1));
  if (required > 1) {
    const rng = ctx.rng ?? Math.random;
    if (!rollProbabilitySuccess(1, required, rng, ctx.ownedSlotTreasureIds)) return;
  }

  const openPack = () => requestInRunPackOpen(ctx, opts);
  if (typeof ctx.registerSubmitPostScoreClearFx === "function") {
    ctx.registerSubmitPostScoreClearFx(openPack);
    return;
  }
  await openPack();
}
