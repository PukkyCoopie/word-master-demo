/** @typedef {import('../game/runCollectionDiscoveries.js').RunDiscoveryTabId} RunDiscoveryTabId */

/** @typedef {RunDiscoveryTabId | 'achievements'} CollectionNewMarkTabId */

/** @param {unknown} raw @returns {string[]} */
function normalizeKeyList(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const key = String(item ?? "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** @param {unknown} raw @returns {string[]} */
function normalizeTabIdList(raw) {
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

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {Record<string, unknown>} raw
 */
export function normalizeCollectionNewDiscoveryFields(career, raw) {
  career.collectionNewDiscoveryKeys = normalizeKeyList(raw.collectionNewDiscoveryKeys);
  career.collectionTabsPendingNewClear = normalizeTabIdList(raw.collectionTabsPendingNewClear);
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career @returns {Set<string>} */
export function getCollectionNewDiscoveryKeySet(career) {
  return new Set(normalizeKeyList(career?.collectionNewDiscoveryKeys));
}

/**
 * @param {string} kind
 * @param {string} id
 * @returns {string}
 */
export function buildCollectionNewDiscoveryKey(kind, id) {
  const k = String(kind ?? "").trim();
  const v = String(id ?? "").trim();
  if (!k || !v) return "";
  return `${k}:${v}`;
}

/** @param {string} treasureId @returns {string} */
export function collectionNewKeyForTreasure(treasureId) {
  return buildCollectionNewDiscoveryKey("treasure", treasureId);
}

/** @param {string} spellId @returns {string} */
export function collectionNewKeyForSpell(spellId) {
  return buildCollectionNewDiscoveryKey("spell", spellId);
}

/** @param {string} upgradeId @returns {string} */
export function collectionNewKeyForUpgrade(upgradeId) {
  return buildCollectionNewDiscoveryKey("upgrade", upgradeId);
}

/** @param {string} pairId @returns {string} */
export function collectionNewKeyForVoucher(pairId) {
  return buildCollectionNewDiscoveryKey("voucher", pairId);
}

/** @param {string} materialId @returns {string} */
export function collectionNewKeyForMaterial(materialId) {
  return buildCollectionNewDiscoveryKey("material", materialId);
}

/** @param {string} accessoryId @returns {string} */
export function collectionNewKeyForAccessory(accessoryId) {
  return buildCollectionNewDiscoveryKey("accessory", accessoryId);
}

/** @param {string} achievementId @returns {string} */
export function collectionNewKeyForAchievement(achievementId) {
  return buildCollectionNewDiscoveryKey("achievement", achievementId);
}

/**
 * @param {string} key
 * @returns {CollectionNewMarkTabId | null}
 */
export function collectionNewDiscoveryTabForKey(key) {
  const k = String(key ?? "").trim();
  if (!k) return null;
  const kind = k.split(":")[0];
  if (kind === "treasure") return "treasures";
  if (kind === "spell") return "spells";
  if (kind === "upgrade") return "upgrades";
  if (kind === "voucher") return "vouchers";
  if (kind === "material") return "materials";
  if (kind === "accessory") return "accessories";
  if (kind === "achievement") return "achievements";
  return null;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} key
 */
export function markCollectionNewDiscovery(career, key) {
  const k = String(key ?? "").trim();
  if (!k) return;
  if (!Array.isArray(career.collectionNewDiscoveryKeys)) career.collectionNewDiscoveryKeys = [];
  if (career.collectionNewDiscoveryKeys.includes(k)) return;
  career.collectionNewDiscoveryKeys.push(k);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} key
 */
export function clearCollectionNewDiscovery(career, key) {
  const k = String(key ?? "").trim();
  if (!k || !Array.isArray(career.collectionNewDiscoveryKeys)) return;
  career.collectionNewDiscoveryKeys = career.collectionNewDiscoveryKeys.filter((item) => item !== k);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {CollectionNewMarkTabId} tabId
 */
export function markCollectionTabPendingNewClear(career, tabId) {
  const id = String(tabId ?? "").trim();
  if (!id) return;
  if (!Array.isArray(career.collectionTabsPendingNewClear)) career.collectionTabsPendingNewClear = [];
  if (career.collectionTabsPendingNewClear.includes(id)) return;
  career.collectionTabsPendingNewClear.push(id);
}

/**
 * 再次进入 tab 时：若该 tab 曾离开过，清除其下全部「新！」标记。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {CollectionNewMarkTabId} tabId
 * @returns {boolean} 是否执行了清除
 */
export function clearCollectionNewDiscoveriesOnTabReenter(career, tabId) {
  const id = String(tabId ?? "").trim();
  if (!id) return false;
  const pending = normalizeTabIdList(career.collectionTabsPendingNewClear);
  if (!pending.includes(id)) return false;
  career.collectionTabsPendingNewClear = pending.filter((tab) => tab !== id);
  const keys = normalizeKeyList(career.collectionNewDiscoveryKeys);
  career.collectionNewDiscoveryKeys = keys.filter((key) => collectionNewDiscoveryTabForKey(key) !== id);
  return true;
}
