import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";
import { isAchievementUnlocked, unlockAchievementId } from "../achievements/achievementCareer.js";
import { getAchievementCollectionProgress } from "../achievements/achievementCollectionProgress.js";
import { evaluateAndUnlockAchievements } from "../achievements/achievementEvaluate.js";
import {
  recordAccessoryDiscovered,
  recordMaterialDiscovered,
  recordSpellDiscovered,
  recordTreasureDiscovered,
  recordUpgradeDiscovered,
  recordVoucherDiscovered,
} from "../collection/collectionCareer.js";
import { COLLECTION_MATERIAL_DISPLAY_ORDER } from "../collection/collectionMaterialRichDesc.js";
import { COLLECTION_UPGRADE_TREASURE_IDS } from "../collection/collectionUpgradeCatalog.js";
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { TREASURE_CATALOG } from "../treasures/treasureCatalog.js";
import { VOUCHER_DEFINITIONS } from "../vouchers/voucherDefinitions.js";

/** @typedef {import('../achievements/achievementTypes.js').AchievementDefinition} AchievementDefinition */

/**
 * @param {import('../achievements/achievementCollectionProgress.js').AchievementCollectionProgress} progress
 */
function progressBumpDelta(progress) {
  return Math.max(1, Math.ceil(progress.target * 0.25));
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} add
 */
function bumpTreasureDiscoveries(career, add) {
  let remaining = add;
  const discovered = new Set(career.discoveredTreasureIds ?? []);
  for (const entry of TREASURE_CATALOG) {
    if (remaining <= 0) break;
    const id = entry.treasureId;
    if (discovered.has(id)) continue;
    if (recordTreasureDiscovered(career, id)) remaining -= 1;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} add
 */
function bumpSpellDiscoveries(career, add) {
  let remaining = add;
  const discovered = new Set(career.discoveredSpellIds ?? []);
  for (const spell of SPELL_DEFINITIONS) {
    if (remaining <= 0) break;
    const id = spell.id;
    if (!id || id === "restart" || id === "dice" || discovered.has(id)) continue;
    if (recordSpellDiscovered(career, id)) remaining -= 1;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} add
 */
function bumpUpgradeDiscoveries(career, add) {
  let remaining = add;
  const discovered = new Set(career.discoveredUpgradeIds ?? []);
  for (const id of COLLECTION_UPGRADE_TREASURE_IDS) {
    if (remaining <= 0) break;
    if (discovered.has(id)) continue;
    if (recordUpgradeDiscovered(career, id)) remaining -= 1;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} add
 */
function bumpVoucherDiscoveries(career, add) {
  let remaining = add;
  for (const def of VOUCHER_DEFINITIONS) {
    if (remaining <= 0) break;
    const tiers = career.discoveredVoucherTiers ?? {};
    const prev = tiers[def.pairId] ?? 0;
    if (def.tier <= prev) continue;
    if (recordVoucherDiscovered(career, def.id)) remaining -= 1;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} add
 */
function bumpMaterialDiscoveries(career, add) {
  let remaining = add;
  const discovered = new Set(career.discoveredMaterialIds ?? []);
  for (const id of COLLECTION_MATERIAL_DISPLAY_ORDER) {
    if (remaining <= 0) break;
    if (discovered.has(id)) continue;
    if (recordMaterialDiscovered(career, id)) remaining -= 1;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} add
 */
function bumpAccessoryDiscoveries(career, add) {
  let remaining = add;
  const discovered = new Set(career.discoveredAccessoryIds ?? []);
  for (const id of Object.keys(ACCESSORY_CATALOG)) {
    if (remaining <= 0) break;
    if (discovered.has(id)) continue;
    if (recordAccessoryDiscovered(career, id)) remaining -= 1;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {AchievementDefinition} def
 */
function applyCollectionProgressBump(career, def) {
  const progress = getAchievementCollectionProgress(career, def);
  if (!progress || progress.target <= 0) return;

  const delta = progressBumpDelta(progress);
  const desired = Math.min(progress.target, progress.current + delta);
  const add = desired - progress.current;
  if (add <= 0) return;

  const c = def.condition;
  switch (c.kind) {
    case "career_words":
      career.totalWordsSubmitted =
        Math.max(0, Math.floor(Number(career.totalWordsSubmitted) || 0)) + add;
      break;
    case "career_tiles_used":
      career.totalLettersUsed =
        Math.max(0, Math.floor(Number(career.totalLettersUsed) || 0)) + add;
      break;
    case "career_tiles_discarded":
      career.totalLettersDiscarded =
        Math.max(0, Math.floor(Number(career.totalLettersDiscarded) || 0)) + add;
      break;
    case "discover_all_treasures":
      bumpTreasureDiscoveries(career, add);
      break;
    case "discover_all_spells":
      bumpSpellDiscoveries(career, add);
      break;
    case "discover_all_upgrades":
      bumpUpgradeDiscoveries(career, add);
      break;
    case "discover_all_vouchers":
      bumpVoucherDiscoveries(career, add);
      break;
    case "discover_all_materials":
      bumpMaterialDiscoveries(career, add);
      break;
    case "discover_all_accessories":
      bumpAccessoryDiscoveries(career, add);
      break;
    default:
      break;
  }
}

/**
 * 开发者模式：收藏页成就连点作弊。有进度则 +25%，无进度则直接解锁。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {AchievementDefinition} def
 * @returns {AchievementDefinition[]}
 */
export function applyDeveloperAchievementCheat(career, def) {
  if (!def?.id || isAchievementUnlocked(career, def.id)) return [];

  const progress = getAchievementCollectionProgress(career, def);
  if (progress) {
    applyCollectionProgressBump(career, def);
    return evaluateAndUnlockAchievements(career, {});
  }

  if (unlockAchievementId(career, def.id)) return [def];
  return [];
}
