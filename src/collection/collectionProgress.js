import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { TREASURE_CATALOG } from "../treasures/treasureCatalog.js";
import { VOUCHER_PAIR_ORDER } from "../vouchers/voucherDefinitions.js";
import { COLLECTION_MATERIAL_DISPLAY_ORDER } from "./collectionMaterialRichDesc.js";
import { COLLECTION_UPGRADE_TOTAL, COLLECTION_UPGRADE_TREASURE_IDS } from "./collectionUpgradeCatalog.js";
import { ACHIEVEMENT_TOTAL } from "../achievements/achievementDefinitions.js";
import { countUnlockedAchievements } from "../achievements/achievementCareer.js";

/** 收藏全库进度统计用的 tab（含成就；用于生涯 profile 收藏解锁进度） */
const COLLECTION_ITEM_TAB_IDS = Object.freeze(
  new Set(["treasures", "spells", "upgrades", "vouchers", "materials", "accessories", "achievements"]),
);

/** 收藏页需在标题后展示（n/x）解锁进度的 tab */
export const COLLECTION_UNLOCK_TAB_IDS = Object.freeze(
  new Set(["treasures", "spells", "upgrades", "vouchers", "materials", "accessories", "achievements"]),
);

const TREASURE_TOTAL = TREASURE_CATALOG.length;
const SPELL_TOTAL = SPELL_DEFINITIONS.length;
const VOUCHER_PAIR_TOTAL = VOUCHER_PAIR_ORDER.size;
const MATERIAL_TOTAL = COLLECTION_MATERIAL_DISPLAY_ORDER.length;
const ACCESSORY_TOTAL = Object.keys(ACCESSORY_CATALOG).length;

/** @param {unknown} raw */
function normalizeIdSet(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return new Set(arr.map((id) => String(id ?? "").trim()).filter(Boolean));
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @param {string} tabId
 * @returns {{ unlocked: number, total: number } | null}
 */
export function getCollectionTabProgress(career, tabId) {
  if (!COLLECTION_UNLOCK_TAB_IDS.has(tabId)) return null;

  switch (tabId) {
    case "treasures":
      return {
        unlocked: normalizeIdSet(career?.discoveredTreasureIds).size,
        total: TREASURE_TOTAL,
      };
    case "spells":
      return {
        unlocked: normalizeIdSet(career?.discoveredSpellIds).size,
        total: SPELL_TOTAL,
      };
    case "upgrades": {
      const discovered = normalizeIdSet(career?.discoveredUpgradeIds);
      let unlocked = 0;
      for (const id of discovered) {
        if (COLLECTION_UPGRADE_TREASURE_IDS.has(id)) unlocked += 1;
      }
      return { unlocked, total: COLLECTION_UPGRADE_TOTAL };
    }
    case "vouchers": {
      const tiers =
        career?.discoveredVoucherTiers && typeof career.discoveredVoucherTiers === "object"
          ? career.discoveredVoucherTiers
          : {};
      let unlocked = 0;
      for (const pairId of VOUCHER_PAIR_ORDER.keys()) {
        if ((tiers[pairId] ?? 0) >= 1) unlocked += 1;
      }
      return { unlocked, total: VOUCHER_PAIR_TOTAL };
    }
    case "materials": {
      const discovered = normalizeIdSet(career?.discoveredMaterialIds);
      let unlocked = 0;
      for (const id of COLLECTION_MATERIAL_DISPLAY_ORDER) {
        if (discovered.has(id)) unlocked += 1;
      }
      return { unlocked, total: MATERIAL_TOTAL };
    }
    case "accessories": {
      const discovered = normalizeIdSet(career?.discoveredAccessoryIds);
      let unlocked = 0;
      for (const id of Object.keys(ACCESSORY_CATALOG)) {
        if (discovered.has(id)) unlocked += 1;
      }
      return { unlocked, total: ACCESSORY_TOTAL };
    }
    case "achievements":
      return {
        unlocked: countUnlockedAchievements(career),
        total: ACHIEVEMENT_TOTAL,
      };
    default:
      return null;
  }
}

/**
 * @param {string} tabId
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @returns {string | null}
 */
export function formatCollectionTabProgressLine(tabId, career) {
  const progress = getCollectionTabProgress(career, tabId);
  if (!progress) return null;
  return `${progress.unlocked} / ${progress.total}`;
}

/**
 * @param {string} baseLabel
 * @param {string} tabId
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 */
export function formatCollectionTabTitle(baseLabel, tabId, career) {
  const progress = getCollectionTabProgress(career, tabId);
  if (!progress) return baseLabel;
  return `${baseLabel}（${progress.unlocked}/${progress.total}）`;
}

/**
 * 收藏全库解锁进度（宝藏/法术/升级/优惠券/材质/配饰/成就合计）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @returns {{ unlocked: number, total: number, percent: number }}
 */
export function getCollectionUnlockProgress(career) {
  let unlocked = 0;
  let total = 0;
  for (const tabId of COLLECTION_ITEM_TAB_IDS) {
    const p = getCollectionTabProgress(career, tabId);
    if (!p) continue;
    unlocked += p.unlocked;
    total += p.total;
  }
  const percent =
    total <= 0 ? 0 : unlocked >= total ? 100 : Math.floor((unlocked / total) * 100);
  return { unlocked, total, percent };
}

/**
 * 生涯面板展示：如 `0% (0/120)`、`100% (120/120)`。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 */
export function formatCollectionUnlockProgressDisplay(career) {
  const { unlocked, total, percent } = getCollectionUnlockProgress(career);
  return `${percent}% (${unlocked}/${total})`;
}
