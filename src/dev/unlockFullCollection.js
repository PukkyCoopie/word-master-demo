import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";
import { ACHIEVEMENT_DEFINITIONS } from "../achievements/achievementDefinitions.js";
import { unlockAchievementId } from "../achievements/achievementCareer.js";
import { getCollectionUnlockProgress } from "../collection/collectionProgress.js";
import { COLLECTION_MATERIAL_DISPLAY_ORDER } from "../collection/collectionMaterialRichDesc.js";
import { COLLECTION_UPGRADE_TREASURE_IDS } from "../collection/collectionUpgradeCatalog.js";
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { TREASURE_CATALOG } from "../treasures/treasureCatalog.js";
import { VOUCHER_PAIR_ORDER } from "../vouchers/voucherDefinitions.js";

/**
 * 将当前生涯槽位的收藏图鉴与成就设为全解锁（开发/测试用）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @returns {{ progress: ReturnType<typeof getCollectionUnlockProgress>, achievements: number }}
 */
export function applyFullCollectionUnlockToCareer(career) {
  career.discoveredTreasureIds = TREASURE_CATALOG.map((t) => t.treasureId);
  career.discoveredSpellIds = SPELL_DEFINITIONS.map((s) => s.id).filter(Boolean);
  career.discoveredUpgradeIds = [...COLLECTION_UPGRADE_TREASURE_IDS];
  career.discoveredVoucherTiers = {};
  for (const pairId of VOUCHER_PAIR_ORDER.keys()) {
    career.discoveredVoucherTiers[pairId] = 2;
  }
  career.discoveredMaterialIds = [...COLLECTION_MATERIAL_DISPLAY_ORDER];
  career.discoveredAccessoryIds = Object.keys(ACCESSORY_CATALOG);

  let achievements = 0;
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockAchievementId(career, def.id)) achievements += 1;
  }

  return {
    progress: getCollectionUnlockProgress(career),
    achievements,
  };
}
