/** Blueprint（宝藏 id 98）：复制右侧槽位宝藏的计分/生命周期效果 */

export const BLUEPRINT_TREASURE_ID = "98";

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function ownedHasBlueprint(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).some((id) => id === BLUEPRINT_TREASURE_ID);
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {number} slotIndex
 * @returns {string | null}
 */
export function getBlueprintMirroredTreasureId(ownedSlotTreasureIds, slotIndex) {
  const slots = ownedSlotTreasureIds ?? [];
  if (slots[slotIndex] !== BLUEPRINT_TREASURE_ID) return null;
  const right = slots[slotIndex + 1];
  if (!right || right === BLUEPRINT_TREASURE_ID) return null;
  return String(right);
}

/**
 * 钩子遍历：每个槽位自身效果；Blueprint 槽额外追加右侧宝藏的一份（槽位索引仍为 Blueprint，便于 UI 高亮）。
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
