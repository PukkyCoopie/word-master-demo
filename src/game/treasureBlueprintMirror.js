/** 面具（98）复制右侧槽位；绵羊（105）复制左侧槽位 */

export const BLUEPRINT_RIGHT_TREASURE_ID = "98";
/** @deprecated 与 `BLUEPRINT_RIGHT_TREASURE_ID` 相同 */
export const BLUEPRINT_TREASURE_ID = BLUEPRINT_RIGHT_TREASURE_ID;
export const BLUEPRINT_LEFT_TREASURE_ID = "105";

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function ownedHasBlueprint(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).some(
    (id) => id === BLUEPRINT_RIGHT_TREASURE_ID || id === BLUEPRINT_LEFT_TREASURE_ID,
  );
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {number} slotIndex
 * @returns {string | null}
 */
export function getBlueprintMirroredTreasureId(ownedSlotTreasureIds, slotIndex) {
  const slots = ownedSlotTreasureIds ?? [];
  const tid = slots[slotIndex];
  if (tid === BLUEPRINT_RIGHT_TREASURE_ID) {
    const right = slots[slotIndex + 1];
    if (!right || right === BLUEPRINT_RIGHT_TREASURE_ID || right === BLUEPRINT_LEFT_TREASURE_ID) return null;
    return String(right);
  }
  if (tid === BLUEPRINT_LEFT_TREASURE_ID) {
    const left = slots[slotIndex - 1];
    if (!left || left === BLUEPRINT_RIGHT_TREASURE_ID || left === BLUEPRINT_LEFT_TREASURE_ID) return null;
    return String(left);
  }
  return null;
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @returns {{ slotIndex: number, treasureId: string, source: "self" | "blueprint" }[]}
 */
export function iterTreasureHookContributions(ownedSlotTreasureIds) {
  const slots = ownedSlotTreasureIds ?? [];
  /** @type {{ slotIndex: number, treasureId: string, source: "self" | "blueprint" }[]} */
  const out = [];
  for (let si = 0; si < slots.length; si++) {
    const tid = slots[si];
    if (tid == null || tid === "") continue;
    out.push({ slotIndex: si, treasureId: String(tid), source: "self" });
    const mirrored = getBlueprintMirroredTreasureId(slots, si);
    if (mirrored) out.push({ slotIndex: si, treasureId: mirrored, source: "blueprint" });
  }
  return out;
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {(entry: { slotIndex: number, treasureId: string, source: "self" | "blueprint" }) => void | Promise<void>} visit
 */
export async function forEachTreasureHookContribution(ownedSlotTreasureIds, visit) {
  for (const entry of iterTreasureHookContributions(ownedSlotTreasureIds)) {
    await visit(entry);
  }
}
