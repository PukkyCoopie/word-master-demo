import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";
import { COLLECTION_UPGRADE_CATALOG } from "../collection/collectionUpgradeCatalog.js";
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { getTreasureDef } from "../treasures/treasureRegistry.js";
import {
  getTier1DefForPair,
  getTier2DefForPair,
  VOUCHERS_BY_ID,
} from "../vouchers/voucherDefinitions.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";
import { voucherStampsForOwnedGroup } from "../vouchers/voucherOwnedDisplay.js";

/** 收藏页 tab 顺序（不含成就、单词榜） */
export const RUN_DISCOVERY_TAB_ORDER = Object.freeze([
  "treasures",
  "spells",
  "upgrades",
  "vouchers",
  "materials",
  "accessories",
]);

/** @typedef {'treasures' | 'spells' | 'upgrades' | 'vouchers' | 'materials' | 'accessories'} RunDiscoveryTabId */

/**
 * @typedef {Object} RunDiscoveryLog
 * @property {RunDiscoveryEntry[]} entries
 * @property {number} nextOrder
 */

/**
 * @typedef {Object} RunDiscoveryEntryBase
 * @property {RunDiscoveryTabId} tabId
 * @property {number} order
 */

/**
 * @typedef {RunDiscoveryEntryBase & { kind: 'treasure', treasureId: string }} RunDiscoveryTreasureEntry
 * @typedef {RunDiscoveryEntryBase & { kind: 'spell', spellId: string }} RunDiscoverySpellEntry
 * @typedef {RunDiscoveryEntryBase & { kind: 'upgrade', upgradeId: string }} RunDiscoveryUpgradeEntry
 * @typedef {RunDiscoveryEntryBase & { kind: 'voucher', pairId: string, tier: 1 | 2 }} RunDiscoveryVoucherEntry
 * @typedef {RunDiscoveryEntryBase & { kind: 'material', materialId: string }} RunDiscoveryMaterialEntry
 * @typedef {RunDiscoveryEntryBase & { kind: 'accessory', accessoryId: string }} RunDiscoveryAccessoryEntry
 * @typedef {RunDiscoveryTreasureEntry | RunDiscoverySpellEntry | RunDiscoveryUpgradeEntry | RunDiscoveryVoucherEntry | RunDiscoveryMaterialEntry | RunDiscoveryAccessoryEntry} RunDiscoveryEntry
 */

/** @returns {RunDiscoveryLog} */
export function createRunDiscoveryLog() {
  return { entries: [], nextOrder: 0 };
}

/** @param {RunDiscoveryTabId} tabId @returns {number} */
function tabSortIndex(tabId) {
  const ix = RUN_DISCOVERY_TAB_ORDER.indexOf(tabId);
  return ix >= 0 ? ix : RUN_DISCOVERY_TAB_ORDER.length;
}

/**
 * @param {RunDiscoveryEntry[]} entries
 * @returns {RunDiscoveryEntry[]}
 */
export function sortRunDiscoveryEntries(entries) {
  return [...entries].sort((a, b) => {
    const tabDiff = tabSortIndex(a.tabId) - tabSortIndex(b.tabId);
    if (tabDiff !== 0) return tabDiff;
    return a.order - b.order;
  });
}

/**
 * @param {RunDiscoveryLog} log
 * @param {{ treasureId?: string, spellId?: string, upgradeId?: string, voucherId?: string, materialId?: string, accessoryId?: string }} payload
 */
export function appendRunDiscovery(log, payload) {
  if (!log || typeof log !== "object") return;
  if (!Array.isArray(log.entries)) log.entries = [];
  if (!Number.isFinite(log.nextOrder)) log.nextOrder = 0;

  const treasureId = String(payload.treasureId ?? "").trim();
  if (treasureId) {
    if (!log.entries.some((e) => e.kind === "treasure" && e.treasureId === treasureId)) {
      log.entries.push({
        tabId: "treasures",
        order: log.nextOrder++,
        kind: "treasure",
        treasureId,
      });
    }
    return;
  }

  const spellId = String(payload.spellId ?? "").trim();
  if (spellId) {
    if (!log.entries.some((e) => e.kind === "spell" && e.spellId === spellId)) {
      log.entries.push({
        tabId: "spells",
        order: log.nextOrder++,
        kind: "spell",
        spellId,
      });
    }
    return;
  }

  const upgradeId = String(payload.upgradeId ?? "").trim();
  if (upgradeId) {
    if (!log.entries.some((e) => e.kind === "upgrade" && e.upgradeId === upgradeId)) {
      log.entries.push({
        tabId: "upgrades",
        order: log.nextOrder++,
        kind: "upgrade",
        upgradeId,
      });
    }
    return;
  }

  const voucherId = String(payload.voucherId ?? "").trim();
  if (voucherId) {
    const def = VOUCHERS_BY_ID.get(voucherId);
    if (!def) return;
    const pairId = def.pairId;
    const tier = /** @type {1 | 2} */ (def.tier === 2 ? 2 : 1);
    const existing = log.entries.find((e) => e.kind === "voucher" && e.pairId === pairId);
    if (existing && existing.kind === "voucher") {
      if (tier > existing.tier) existing.tier = tier;
      return;
    }
    log.entries.push({
      tabId: "vouchers",
      order: log.nextOrder++,
      kind: "voucher",
      pairId,
      tier,
    });
    return;
  }

  const materialId = String(payload.materialId ?? "").trim();
  if (materialId) {
    if (!log.entries.some((e) => e.kind === "material" && e.materialId === materialId)) {
      log.entries.push({
        tabId: "materials",
        order: log.nextOrder++,
        kind: "material",
        materialId,
      });
    }
    return;
  }

  const accessoryId = String(payload.accessoryId ?? "").trim();
  if (accessoryId) {
    if (!log.entries.some((e) => e.kind === "accessory" && e.accessoryId === accessoryId)) {
      log.entries.push({
        tabId: "accessories",
        order: log.nextOrder++,
        kind: "accessory",
        accessoryId,
      });
    }
  }
}

/**
 * @param {RunDiscoveryLog | null | undefined} log
 * @returns {import('./runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem[]}
 */
export function buildRunDiscoveryDisplayItems(log) {
  const entries = sortRunDiscoveryEntries(log?.entries ?? []);
  /** @type {import('./runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem[]} */
  const out = [];

  for (const entry of entries) {
    switch (entry.kind) {
      case "treasure": {
        const def = getTreasureDef(entry.treasureId);
        if (!def) break;
        out.push({
          kind: "treasure",
          key: `treasure:${entry.treasureId}`,
          treasureId: entry.treasureId,
          emoji: def.emoji ?? "",
          name: def.name ?? "",
          rarity: def.rarity ?? "common",
          ariaLabel: def.name ?? "宝藏",
        });
        break;
      }
      case "spell": {
        const def = SPELL_DEFINITIONS.find((s) => s.id === entry.spellId);
        if (!def) break;
        out.push({
          kind: "spell",
          key: `spell:${entry.spellId}`,
          spellId: entry.spellId,
          name: def.name ?? "",
          iconClass: def.iconClass ?? "",
          ariaLabel: def.name ?? "法术",
        });
        break;
      }
      case "upgrade": {
        const row = COLLECTION_UPGRADE_CATALOG.find((o) => String(o.treasureId) === entry.upgradeId);
        if (!row) break;
        out.push({
          kind: "upgrade",
          key: `upgrade:${entry.upgradeId}`,
          upgradeId: entry.upgradeId,
          upgradeKind: row.upgradeKind ?? "",
          lengthBadgeLabel: row.lengthBadgeLabel ?? row.lengthLabel ?? "",
          lengthLabel: row.lengthLabel ?? "",
          iconClass: row.iconClass ?? "",
          name: row.name ?? "",
          ariaLabel: row.name ?? "升级",
        });
        break;
      }
      case "voucher": {
        const tier1 = getTier1DefForPair(entry.pairId);
        const tier2 = entry.tier >= 2 ? getTier2DefForPair(entry.pairId) : null;
        if (!tier1) break;
        const group = { pairId: entry.pairId, tier1, tier2 };
        const stamps = voucherStampsForOwnedGroup(group);
        const top = tier2 ?? tier1;
        out.push({
          kind: "voucher",
          key: `voucher:${entry.pairId}`,
          pairId: entry.pairId,
          tier: entry.tier,
          stamps,
          ariaLabel: formatVoucherDisplayName(top, { pairHasTier2Owned: Boolean(tier2) }),
        });
        break;
      }
      case "material": {
        out.push({
          kind: "material",
          key: `material:${entry.materialId}`,
          materialId: entry.materialId,
          ariaLabel: entry.materialId === "wildcard" ? "万能块" : entry.materialId,
        });
        break;
      }
      case "accessory": {
        const def = ACCESSORY_CATALOG[entry.accessoryId];
        if (!def) break;
        out.push({
          kind: "accessory",
          key: `accessory:${entry.accessoryId}`,
          accessoryId: entry.accessoryId,
          chipClass: def.chip.chipClass,
          iconClass: def.chip.iconClass,
          scopeClass:
            def.legacyStorage === "treasure_field" ? "treasure-accessory-chip" : "tile-accessory-chip",
          ariaLabel: entry.accessoryId,
        });
        break;
      }
      default:
        break;
    }
  }

  return out;
}

/**
 * @param {RunDiscoveryLog | null | undefined} log
 * @returns {unknown[]}
 */
export function serializeRunDiscoveryLog(log) {
  if (!log || !Array.isArray(log.entries)) return [];
  return log.entries.map((e) => ({ ...e }));
}

/**
 * @param {unknown} raw
 * @returns {RunDiscoveryLog}
 */
export function deserializeRunDiscoveryLog(raw) {
  const log = createRunDiscoveryLog();
  if (!Array.isArray(raw)) return log;
  let maxOrder = -1;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (item);
    const tabId = String(o.tabId ?? "");
    if (!RUN_DISCOVERY_TAB_ORDER.includes(/** @type {RunDiscoveryTabId} */ (tabId))) continue;
    const order = Math.floor(Number(o.order) || 0);
    const kind = String(o.kind ?? "");
    /** @type {RunDiscoveryEntry | null} */
    let entry = null;
    if (kind === "treasure") {
      const treasureId = String(o.treasureId ?? "").trim();
      if (treasureId) entry = { tabId: /** @type {RunDiscoveryTabId} */ (tabId), order, kind: "treasure", treasureId };
    } else if (kind === "spell") {
      const spellId = String(o.spellId ?? "").trim();
      if (spellId) entry = { tabId: /** @type {RunDiscoveryTabId} */ (tabId), order, kind: "spell", spellId };
    } else if (kind === "upgrade") {
      const upgradeId = String(o.upgradeId ?? "").trim();
      if (upgradeId) entry = { tabId: /** @type {RunDiscoveryTabId} */ (tabId), order, kind: "upgrade", upgradeId };
    } else if (kind === "voucher") {
      const pairId = String(o.pairId ?? "").trim();
      const tier = Math.floor(Number(o.tier) || 0);
      if (pairId && (tier === 1 || tier === 2)) {
        entry = {
          tabId: /** @type {RunDiscoveryTabId} */ (tabId),
          order,
          kind: "voucher",
          pairId,
          tier: /** @type {1 | 2} */ (tier),
        };
      }
    } else if (kind === "material") {
      const materialId = String(o.materialId ?? "").trim();
      if (materialId) entry = { tabId: /** @type {RunDiscoveryTabId} */ (tabId), order, kind: "material", materialId };
    } else if (kind === "accessory") {
      const accessoryId = String(o.accessoryId ?? "").trim();
      if (accessoryId) entry = { tabId: /** @type {RunDiscoveryTabId} */ (tabId), order, kind: "accessory", accessoryId };
    }
    if (entry) {
      log.entries.push(entry);
      if (order > maxOrder) maxOrder = order;
    }
  }
  log.nextOrder = maxOrder + 1;
  return log;
}
