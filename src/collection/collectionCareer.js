import { VOUCHERS_BY_ID } from "../vouchers/voucherDefinitions.js";
import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";
import { TILE_MATERIAL_CONCEPT_BY_ID } from "../game/gameConceptCopy.js";
import { COLLECTION_UPGRADE_TREASURE_IDS } from "./collectionUpgradeCatalog.js";
import { COLLECTION_LEADERBOARD_MAX } from "./collectionTypes.js";

/** @param {unknown} raw @returns {string[]} */
function normalizeIdList(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** @param {unknown} raw @returns {Record<string, number>} */
function normalizeSingleCardAppearanceCounts(raw) {
  if (!raw || typeof raw !== "object") return {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const [key, val] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    const id = String(key ?? "").trim();
    const n = Math.floor(Number(val) || 0);
    if (!id || n <= 0) continue;
    out[id] = n;
  }
  return out;
}

/** @param {unknown} raw @returns {Record<string, 1 | 2>} */
function normalizeVoucherTiers(raw) {
  if (!raw || typeof raw !== "object") return {};
  /** @type {Record<string, 1 | 2>} */
  const out = {};
  for (const [key, val] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    const pairId = String(key ?? "").trim();
    const tier = Math.floor(Number(val) || 0);
    if (!pairId || (tier !== 1 && tier !== 2)) continue;
    out[pairId] = /** @type {1 | 2} */ (tier);
  }
  return out;
}

/** @param {unknown} raw @returns {import('./collectionTypes.js').CollectionWordRecord[]} */
function normalizeWordRecords(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = /** @type {Record<string, unknown>} */ (item);
      const word = String(o.word ?? "").trim();
      const score = Math.max(0, Math.floor(Number(o.score) || 0));
      const length = Math.max(0, Math.floor(Number(o.length) || 0));
      if (!word || length <= 0) return null;
      const recordedAt = Number.isFinite(Number(o.recordedAt))
        ? Math.floor(Number(o.recordedAt))
        : 0;
      const tiles = Array.isArray(o.tiles)
        ? o.tiles
            .map((t) => {
              if (!t || typeof t !== "object") return null;
              const x = /** @type {Record<string, unknown>} */ (t);
              const letter = String(x.letter ?? "").trim();
              if (!letter) return null;
              return {
                letter,
                naturalLetter: x.naturalLetter != null ? String(x.naturalLetter) : undefined,
                vowelDisplayShift:
                  x.vowelDisplayShift != null ? Math.sign(Number(x.vowelDisplayShift) || 0) : undefined,
                rarity: String(x.rarity ?? "common"),
                materialId: x.materialId != null ? String(x.materialId) : null,
                isWildcard: x.isWildcard === true,
                tileScoreBonus: Math.max(0, Math.floor(Number(x.tileScoreBonus) || 0)),
                letterMultBonus: Number(x.letterMultBonus) || 0,
                materialScoreBonus: Math.max(0, Math.floor(Number(x.materialScoreBonus) || 0)),
                materialMultBonus: Number(x.materialMultBonus) || 0,
                accessoryId: x.accessoryId != null ? String(x.accessoryId) : null,
                treasureAccessoryId:
                  x.treasureAccessoryId != null ? String(x.treasureAccessoryId) : null,
                vowelGhostPrev: x.vowelGhostPrev != null ? String(x.vowelGhostPrev) : undefined,
                vowelGhostNext: x.vowelGhostNext != null ? String(x.vowelGhostNext) : undefined,
              };
            })
            .filter(Boolean)
        : [];
      const ownedTreasures = Array.isArray(o.ownedTreasures)
        ? o.ownedTreasures.map((s) => {
            if (s == null) return null;
            if (typeof s !== "object") return null;
            const slot = /** @type {Record<string, unknown>} */ (s);
            const treasureId = String(slot.treasureId ?? "").trim();
            if (!treasureId) return null;
            /** @type {import('../save/runSavePayload.js').SerializedOwnedTreasureSlot} */
            const out = {
              treasureId,
              price: Math.max(0, Math.floor(Number(slot.price) || 0)),
            };
            if (Array.isArray(slot.treasureAccessoryIds) && slot.treasureAccessoryIds.length) {
              out.treasureAccessoryIds = slot.treasureAccessoryIds.map(String).filter(Boolean);
            }
            const elapsed = Math.floor(Number(slot.hourglassStagesElapsed) || 0);
            if (elapsed > 0) out.hourglassStagesElapsed = elapsed;
            if (slot.treasureAccessoryExpired === true) out.treasureAccessoryExpired = true;
            return out;
          })
        : [];
      return /** @type {import('./collectionTypes.js').CollectionWordRecord} */ ({
        word,
        score,
        length,
        recordedAt,
        tiles,
        ownedTreasures,
      });
    })
    .filter(Boolean);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {Record<string, unknown>} raw
 */
export function normalizeCollectionCareerFields(career, raw) {
  career.discoveredTreasureIds = normalizeIdList(raw.discoveredTreasureIds);
  career.shopAppearedPrerequisiteTreasureIds = normalizeIdList(raw.shopAppearedPrerequisiteTreasureIds);
  career.shopPrerequisiteTreasureSingleCardAppearanceCounts = normalizeSingleCardAppearanceCounts(
    raw.shopPrerequisiteTreasureSingleCardAppearanceCounts,
  );
  career.discoveredSpellIds = normalizeIdList(raw.discoveredSpellIds);
  career.discoveredUpgradeIds = normalizeIdList(raw.discoveredUpgradeIds);
  career.discoveredVoucherTiers = normalizeVoucherTiers(raw.discoveredVoucherTiers);
  career.discoveredMaterialIds = normalizeIdList(raw.discoveredMaterialIds);
  career.discoveredAccessoryIds = normalizeIdList(raw.discoveredAccessoryIds);
  career.scoreLeaderboard = normalizeWordRecords(raw.scoreLeaderboard).slice(0, COLLECTION_LEADERBOARD_MAX);
  career.lengthLeaderboard = normalizeWordRecords(raw.lengthLeaderboard).slice(
    0,
    COLLECTION_LEADERBOARD_MAX,
  );
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} treasureId
 */
export function recordTreasureDiscovered(career, treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return false;
  if (!Array.isArray(career.discoveredTreasureIds)) career.discoveredTreasureIds = [];
  if (career.discoveredTreasureIds.includes(id)) return false;
  career.discoveredTreasureIds.push(id);
  return true;
}

/**
 * 有解锁前提的宝藏出现在商店货架。
 * - 任意货架（含牌包）：写入 `shopAppearedPrerequisiteTreasureIds`（生涯「已出现」）。
 * - 仅单卡区：`shopPrerequisiteTreasureSingleCardAppearanceCounts` +1（阶段二衰减用）。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} treasureId
 * @param {{ singleCardShelf?: boolean }} [opts]
 */
export function recordPrerequisiteTreasureShopAppeared(career, treasureId, opts) {
  const id = String(treasureId ?? "").trim();
  if (!id) return false;
  let changed = false;
  if (!Array.isArray(career.shopAppearedPrerequisiteTreasureIds)) {
    career.shopAppearedPrerequisiteTreasureIds = [];
  }
  if (!career.shopAppearedPrerequisiteTreasureIds.includes(id)) {
    career.shopAppearedPrerequisiteTreasureIds.push(id);
    changed = true;
  }
  if (opts?.singleCardShelf) {
    if (
      !career.shopPrerequisiteTreasureSingleCardAppearanceCounts ||
      typeof career.shopPrerequisiteTreasureSingleCardAppearanceCounts !== "object"
    ) {
      career.shopPrerequisiteTreasureSingleCardAppearanceCounts = {};
    }
    const counts = career.shopPrerequisiteTreasureSingleCardAppearanceCounts;
    counts[id] = Math.max(0, Math.floor(Number(counts[id]) || 0)) + 1;
    changed = true;
  }
  return changed;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} spellId
 */
export function recordSpellDiscovered(career, spellId) {
  const id = String(spellId ?? "").trim();
  if (!id || id === "restart" || id === "dice") return false;
  if (!Array.isArray(career.discoveredSpellIds)) career.discoveredSpellIds = [];
  if (career.discoveredSpellIds.includes(id)) return false;
  career.discoveredSpellIds.push(id);
  return true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} upgradeTreasureId 升级 catalog id，如 upgrade_len3、upgrade_rarity_common（任意来源触发均可）
 */
export function recordUpgradeDiscovered(career, upgradeTreasureId) {
  const id = String(upgradeTreasureId ?? "").trim();
  if (!id || !COLLECTION_UPGRADE_TREASURE_IDS.has(id)) return false;
  if (!Array.isArray(career.discoveredUpgradeIds)) career.discoveredUpgradeIds = [];
  if (career.discoveredUpgradeIds.includes(id)) return false;
  career.discoveredUpgradeIds.push(id);
  return true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} voucherId
 */
export function recordVoucherDiscovered(career, voucherId) {
  const id = String(voucherId ?? "").trim();
  if (!id) return false;
  const def = VOUCHERS_BY_ID.get(id);
  if (!def) return false;
  if (!career.discoveredVoucherTiers || typeof career.discoveredVoucherTiers !== "object") {
    career.discoveredVoucherTiers = {};
  }
  const prev = career.discoveredVoucherTiers[def.pairId] ?? 0;
  if (def.tier <= prev) return false;
  career.discoveredVoucherTiers[def.pairId] = /** @type {1 | 2} */ (def.tier);
  return true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} materialId
 */
export function recordMaterialDiscovered(career, materialId) {
  const id = String(materialId ?? "").trim();
  if (!id || !TILE_MATERIAL_CONCEPT_BY_ID[id]) return false;
  if (!Array.isArray(career.discoveredMaterialIds)) career.discoveredMaterialIds = [];
  if (career.discoveredMaterialIds.includes(id)) return false;
  career.discoveredMaterialIds.push(id);
  return true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} accessoryId
 */
export function recordAccessoryDiscovered(career, accessoryId) {
  const id = String(accessoryId ?? "").trim();
  if (!id || !ACCESSORY_CATALOG[id]) return false;
  if (!Array.isArray(career.discoveredAccessoryIds)) career.discoveredAccessoryIds = [];
  if (career.discoveredAccessoryIds.includes(id)) return false;
  career.discoveredAccessoryIds.push(id);
  return true;
}

/**
 * @param {import('./collectionTypes.js').CollectionWordRecord[]} list
 * @param {import('./collectionTypes.js').CollectionWordRecord} record
 * @param {'score' | 'length'} sortKey
 * @returns {import('./collectionTypes.js').CollectionWordRecord[]}
 */
function insertLeaderboardRecord(list, record, sortKey) {
  const next = [...list, record];
  return sortLeaderboard(next, sortKey).slice(0, COLLECTION_LEADERBOARD_MAX);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {import('./collectionTypes.js').CollectionWordRecord} record
 */
export function tryInsertScoreLeaderboard(career, record) {
  const list = sortLeaderboard([...(career.scoreLeaderboard ?? [])], "score");
  if (list.length >= COLLECTION_LEADERBOARD_MAX) {
    const worst = list[list.length - 1];
    if (record.score < worst.score) return false;
  }
  career.scoreLeaderboard = insertLeaderboardRecord(list, record, "score");
  return true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {import('./collectionTypes.js').CollectionWordRecord} record
 */
export function tryInsertLengthLeaderboard(career, record) {
  const list = sortLeaderboard([...(career.lengthLeaderboard ?? [])], "length");
  if (list.length >= COLLECTION_LEADERBOARD_MAX) {
    const worst = list[list.length - 1];
    if (record.length < worst.length) return false;
  }
  career.lengthLeaderboard = insertLeaderboardRecord(list, record, "length");
  return true;
}

/**
 * @param {import('./collectionTypes.js').CollectionWordRecord[]} list
 * @param {'score' | 'length'} sortKey
 */
function sortLeaderboard(list, sortKey) {
  return list.sort((a, b) => {
    const primaryA = sortKey === "score" ? a.score : a.length;
    const primaryB = sortKey === "score" ? b.score : b.length;
    if (primaryB !== primaryA) return primaryB - primaryA;
    if (b.score !== a.score) return b.score - a.score;
    return (b.recordedAt || 0) - (a.recordedAt || 0);
  });
}
