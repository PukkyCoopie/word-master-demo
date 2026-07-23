import { normalizeExclusiveTileAccessoryPair } from "../../accessories/accessoryState.js";
import { isUndeformedWildcardLetter, isWildcardMaterialTile } from "../../composables/useScoring.js";
import {
  commitWildcardMorphBeforeEnhancementStrip,
  submitWordTileHasEnhancement,
} from "../../game/treasureEnhancementStrip.js";
import { isTreasureHookContributionActive } from "../../game/treasureBlueprintMirror.js";
import { describe } from "../treasureDescription.js";
import { deckCardRaw, syncTileStateToDeckCard } from "../../game/deckCardSync.js";
import { wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

const ID = "139";
const WILDCARD_MATERIAL_ID = "wildcard";

/** @param {import('../treasureRunState.js').TreasureRunState | null | undefined} rs @param {number} slotIndex @param {'self' | 'blueprint'} source */
function fax139ContributionKey(rs, slotIndex, source) {
  if (!rs) return "";
  if (!rs.level139FaxCopyContributions) rs.level139FaxCopyContributions = new Set();
  if (rs.level139FaxCopyContributions.has("__legacy_done__")) return "";
  return `${Math.floor(Number(slotIndex) || 0)}:${source}`;
}

/** @param {object | null | undefined} scoringTile @param {object | null | undefined} liveTile @param {object | null | undefined} [deckCard] */
function buildFaxAppendSpec(scoringTile, liveTile, deckCard = null) {
  const scoring = scoringTile && typeof scoringTile === "object" ? scoringTile : null;
  const live = liveTile && typeof liveTile === "object" ? liveTile : null;
  const card = deckCard && typeof deckCard === "object" ? deckCard : live?._deckCard ?? scoring?._deckCard ?? null;
  const materialId =
    String(scoring?.materialId ?? live?.materialId ?? card?.materialId ?? "").trim() || null;
  const pair = normalizeExclusiveTileAccessoryPair(
    scoring?.accessoryId ?? live?.accessoryId ?? card?.accessoryId,
    scoring?.treasureAccessoryId ?? live?.treasureAccessoryId ?? card?.treasureAccessoryId,
  );
  const sb = Math.max(
    0,
    Math.floor(
      Number(scoring?.tileScoreBonus ?? live?.tileScoreBonus ?? card?.tileScoreBonus) || 0,
    ),
  );
  const mb = Math.max(
    0,
    Math.floor(
      Number(scoring?.letterMultBonus ?? live?.letterMultBonus ?? card?.letterMultBonus) || 0,
    ),
  );
  if (materialId === WILDCARD_MATERIAL_ID) {
    return {
      materialId: WILDCARD_MATERIAL_ID,
      accessoryId: pair.accessoryId,
      treasureAccessoryId: pair.treasureAccessoryId,
      tileScoreBonus: sb > 0 ? sb : undefined,
      letterMultBonus: mb > 0 ? mb : undefined,
    };
  }
  const snapLetter = String(scoring?.letter ?? live?.letter ?? card?.letter ?? "")
    .toLowerCase()
    .trim();
  let raw = card ? deckCardRaw(card) : "";
  if (!raw && snapLetter && !isUndeformedWildcardLetter(snapLetter)) {
    raw = snapLetter === "qu" ? "q" : snapLetter.charAt(0);
  }
  return {
    raw: raw || "e",
    materialId,
    accessoryId: pair.accessoryId,
    treasureAccessoryId: pair.treasureAccessoryId,
    tileScoreBonus: sb > 0 ? sb : undefined,
    letterMultBonus: mb > 0 ? mb : undefined,
  };
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "epic",
  description: describe("在每个关卡的第一次拼写中，将第一个具有增强效果的字母复制并洗入你的字母库"),
};

/**
 * 本关首次拼写复制：实体传真机与面具/绵羊 blueprint 各计一次（按贡献键）。
 * 贡献键在该次提交尝试时即消耗（即使词内无增强字母），保证仅「第一次拼写」可触发。
 * 勿用 `shouldTreasureRunAccumulationMutate`：那是银行累加闸门，会误拦蓝图复现本效果。
 * @param {import('../treasureTypes.js').TreasureSubmitSuccessContext} ctx
 */
async function tryApplyFax139CopySubmit(ctx) {
  const rs = ctx.treasureRun;
  if (!rs) return false;
  const slotIndex = Math.floor(Number(ctx.hookSlotIndex) || 0);
  const source = ctx.hookSource === "blueprint" ? "blueprint" : "self";
  const ownedSlots = ctx.ownedSlotTreasureIds ?? ctx.getOwnedSlotTreasureIds?.() ?? [];
  if (!isTreasureHookContributionActive(ownedSlots, { slotIndex, treasureId: ID, source })) {
    return false;
  }
  const key = fax139ContributionKey(rs, slotIndex, source);
  if (!key || rs.level139FaxCopyContributions.has(key)) return false;
  // 本关该贡献的「第一次拼写」机会：无论有无增强字母可复制，提交时即消耗，避免次词才复制。
  rs.level139FaxCopyContributions.add(key);
  const tiles = ctx.submittedScoringTiles ?? [];
  let sourceIndex = -1;
  /** @type {ReturnType<typeof buildFaxAppendSpec> | null} */
  let appendSpec = null;
  for (let i = 0; i < tiles.length; i += 1) {
    const scoringTile = tiles[i];
    if (!submitWordTileHasEnhancement(ctx, i, scoringTile)) continue;
    const real = ctx.resolveSubmitTileAtIndex?.(i, scoringTile) ?? null;
    const live = real ?? scoringTile;
    if (!live || typeof live !== "object") continue;
    commitWildcardMorphBeforeEnhancementStrip(live, scoringTile);
    if (!isWildcardMaterialTile(live) || !isUndeformedWildcardLetter(live.letter)) {
      syncTileStateToDeckCard(live);
    }
    const spec = buildFaxAppendSpec(scoringTile, live, live._deckCard ?? scoringTile?._deckCard);
    if (!spec) continue;
    appendSpec = spec;
    sourceIndex = i;
    break;
  }
  if (!appendSpec || sourceIndex < 0) return false;
  const appended = ctx.appendDeckCardSpecToRunDeck?.(appendSpec);
  if (!appended) return false;
  if (ctx.skipSettlementFx === true) return true;
  void wobbleTreasureHookContributor(ctx, ID);
  await ctx.playWordSlotCopyFxAtIndex?.(sourceIndex);
  return true;
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async runSubmitScoringAfterLettersSlotPhase(ctx) {
    await tryApplyFax139CopySubmit(ctx);
  },
};
