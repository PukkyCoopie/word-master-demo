import { resolveRestartEffectiveSpellId } from "../game/inRunGrantFlow.js";
import { filterTreasureDefsForSpellGrantPool } from "../treasures/treasureAvailability.js";
import { getSpellDefinition } from "./spellDefinitions.js";

/** 需至少 1 个已装备宝藏才有意义（随机目标宝藏 / 配饰） */
export const SPELL_IDS_REQUIRING_OWNED_TREASURE = Object.freeze(["ectoplasm", "ankh", "star"]);

/** 需空宝藏槽且法术授予池内仍有未拥有宝藏 */
export const SPELL_IDS_GRANTING_RANDOM_TREASURE = Object.freeze(["treasure_map", "cache", "wraith"]);

const GRANT_RARITY_BY_SPELL_ID = Object.freeze({
  treasure_map: null,
  cache: "epic",
  wraith: "legendary",
});

/**
 * @typedef {{
 *   ownedTreasureCount?: number,
 *   emptyTreasureSlots?: number,
 *   grantableAnyTreasureCount?: number,
 *   grantableEpicTreasureCount?: number,
 *   grantableLegendaryTreasureCount?: number,
 * }} SpellPoolEligibilityCounts
 */

/**
 * @param {readonly unknown[] | null | undefined} ownedTreasureSlots
 */
export function countFilledOwnedTreasureSlots(ownedTreasureSlots) {
  if (!Array.isArray(ownedTreasureSlots)) return 0;
  return ownedTreasureSlots.filter((s) => s != null).length;
}

/**
 * @param {string} spellId
 * @param {SpellPoolEligibilityCounts} counts
 */
function grantableTreasureCountForSpell(spellId, counts) {
  const empty = Math.max(0, Math.floor(Number(counts.emptyTreasureSlots) || 0));
  if (empty < 1) return 0;
  const rarity = GRANT_RARITY_BY_SPELL_ID[String(spellId ?? "")];
  if (rarity === "epic") return Math.max(0, Math.floor(Number(counts.grantableEpicTreasureCount) || 0));
  if (rarity === "legendary") {
    return Math.max(0, Math.floor(Number(counts.grantableLegendaryTreasureCount) || 0));
  }
  return Math.max(0, Math.floor(Number(counts.grantableAnyTreasureCount) || 0));
}

/**
 * 是否可进入商店单卡区 / 牌包法术池、对局内随机释法池等（不含重播、促销券等特例）。
 * @param {string} spellId
 * @param {SpellPoolEligibilityCounts} [counts]
 */
export function isSpellEligibleForPools(spellId, counts = {}) {
  const sid = String(spellId ?? "");
  if (!sid) return false;
  if (SPELL_IDS_REQUIRING_OWNED_TREASURE.includes(sid)) {
    const owned = Math.max(0, Math.floor(Number(counts.ownedTreasureCount) || 0));
    if (owned < 1) return false;
  }
  if (SPELL_IDS_GRANTING_RANDOM_TREASURE.includes(sid)) {
    if (grantableTreasureCountForSpell(sid, counts) < 1) return false;
  }
  return true;
}

/**
 * @param {SpellPoolEligibilityCounts} counts
 * @param {string[]} [extraExcludeIds]
 */
export function buildSpellPoolExcludeIds(counts, extraExcludeIds = []) {
  const out = new Set((extraExcludeIds ?? []).map((id) => String(id)));
  for (const sid of [...SPELL_IDS_REQUIRING_OWNED_TREASURE, ...SPELL_IDS_GRANTING_RANDOM_TREASURE]) {
    if (!isSpellEligibleForPools(sid, counts)) out.add(sid);
  }
  return [...out];
}

/**
 * 与 `grantRandomShopTreasureByRarity` 同源：法术授予宝藏池（含非商店专属掉落）。
 *
 * @param {import("../treasures/treasureTypes.js").TreasureDef[]} grantDefs
 * @param {import("../treasures/treasureAvailability.js").TreasurePoolSnapshot} snap
 * @param {Set<string>} ownedTreasureIdSet
 * @param {number} ownedTreasureCount
 * @param {number} emptyTreasureSlots
 * @returns {SpellPoolEligibilityCounts}
 */
export function buildSpellPoolEligibilityCounts(
  grantDefs,
  snap,
  ownedTreasureIdSet,
  ownedTreasureCount,
  emptyTreasureSlots,
) {
  const owned = ownedTreasureIdSet instanceof Set ? ownedTreasureIdSet : new Set();
  const empty = Math.max(0, Math.floor(Number(emptyTreasureSlots) || 0));
  const countUnowned = (/** @type {readonly import("../treasures/treasureTypes.js").TreasureDef[]} */ pool) =>
    pool.filter((t) => t && !owned.has(t.treasureId)).length;

  const anyPool = filterTreasureDefsForSpellGrantPool(grantDefs, snap, null);
  const epicPool = filterTreasureDefsForSpellGrantPool(grantDefs, snap, "epic");
  const legPool = filterTreasureDefsForSpellGrantPool(grantDefs, snap, "legendary");

  return {
    ownedTreasureCount: Math.max(0, Math.floor(Number(ownedTreasureCount) || 0)),
    emptyTreasureSlots: empty,
    grantableAnyTreasureCount: countUnowned(anyPool),
    grantableEpicTreasureCount: countUnowned(epicPool),
    grantableLegendaryTreasureCount: countUnowned(legPool),
  };
}

/**
 * @param {string} spellId
 * @param {{
 *   lastReplayableSpellId?: string | null,
 *   spellCastHistory?: string[],
 * } & SpellPoolEligibilityCounts} opts
 */
function canPurchaseRestartSpell(lastReplayableSpellId, spellCastHistory = []) {
  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory, lastReplayableSpellId);
  if (!replayTarget) return false;
  const prev = getSpellDefinition(replayTarget);
  return Boolean(prev && prev.pickCount >= 0);
}

/**
 * @param {string} spellId
 * @param {{
 *   lastReplayableSpellId?: string | null,
 *   spellCastHistory?: string[],
 * } & SpellPoolEligibilityCounts} opts
 */
export function canPurchaseSpellInShop(spellId, opts = {}) {
  const sid = String(spellId ?? "");
  if (sid === "restart") {
    return canPurchaseRestartSpell(opts.lastReplayableSpellId, opts.spellCastHistory);
  }
  return isSpellEligibleForPools(sid, opts);
}
