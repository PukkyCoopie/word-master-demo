import { ACCESSORY_CROP } from "../accessories/accessoryCatalog.js";
import { BASE_TREASURE_SLOT_COUNT } from "../accessories/accessorySlotCapacity.js";
import { COMET_TREASURE_ID } from "./noSellGoldBombCometDevScenario.js";
import { KITE_TREASURE_ID, VOLCANO_TREASURE_ID } from "./volcanoKiteDevScenario.js";

export const SPARK_TREASURE_ID = "1";
export const FLAME_TREASURE_ID = "129";
export const VOLCANO_COMET_DEV_COMET_COUNT = 5;

/**
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 * @param {string} treasureId
 * @param {number} slotIndex
 */
export function buildVolcanoCometDevOwnedSlot(buildOwnedTreasureSlot, treasureId, slotIndex) {
  const ix = Math.max(0, Math.floor(Number(slotIndex) || 0));
  return buildOwnedTreasureSlot({
    treasureId,
    ...(ix >= BASE_TREASURE_SLOT_COUNT ? { treasureAccessoryIds: [ACCESSORY_CROP] } : {}),
  });
}

/**
 * 槽位：[火花][彗星×3][火山][彗星×2][裁剪·彗星][裁剪·风筝][裁剪·火苗]
 * 超出默认 6 栏的宝藏均带裁剪配饰扩栏。
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function buildVolcanoCometOwnedTreasureSlots(buildOwnedTreasureSlot) {
  const cometAt = (ix) => buildVolcanoCometDevOwnedSlot(buildOwnedTreasureSlot, COMET_TREASURE_ID, ix);
  return [
    buildVolcanoCometDevOwnedSlot(buildOwnedTreasureSlot, SPARK_TREASURE_ID, 0),
    cometAt(1),
    cometAt(2),
    cometAt(3),
    buildVolcanoCometDevOwnedSlot(buildOwnedTreasureSlot, VOLCANO_TREASURE_ID, 4),
    cometAt(5),
    cometAt(6),
    buildVolcanoCometDevOwnedSlot(buildOwnedTreasureSlot, KITE_TREASURE_ID, 7),
    buildVolcanoCometDevOwnedSlot(buildOwnedTreasureSlot, FLAME_TREASURE_ID, 8),
  ];
}
