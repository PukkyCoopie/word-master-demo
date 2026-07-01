/** 面具（98）复制右侧槽位；绵羊（105）复制整条栏最左侧可复制的宝藏（跳过面具/绵羊） */

export const BLUEPRINT_RIGHT_TREASURE_ID = "98";
/** @deprecated 与 `BLUEPRINT_RIGHT_TREASURE_ID` 相同 */
export const BLUEPRINT_TREASURE_ID = BLUEPRINT_RIGHT_TREASURE_ID;
export const BLUEPRINT_LEFT_TREASURE_ID = "105";

/** @param {string | null | undefined} id */
function isBlueprintMirrorTreasureId(id) {
  return id === BLUEPRINT_RIGHT_TREASURE_ID || id === BLUEPRINT_LEFT_TREASURE_ID;
}

/**
 * 整条宝藏栏最左侧、可作为复制目标的宝藏 id（跳过空位与面具/绵羊 blueprint 本体）。
 * @param {(string | null | undefined)[]} slots
 * @returns {string | null}
 */
export function getLeftmostCopyableTreasureId(slots) {
  for (let i = 0; i < (slots ?? []).length; i += 1) {
    const tid = slots[i];
    if (tid == null || tid === "") continue;
    if (isBlueprintMirrorTreasureId(tid)) continue;
    return String(tid);
  }
  return null;
}

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
    if (!right || isBlueprintMirrorTreasureId(right)) return null;
    return String(right);
  }
  if (tid === BLUEPRINT_LEFT_TREASURE_ID) {
    return getLeftmostCopyableTreasureId(slots);
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
    const result = visit(entry);
    if (result != null && typeof /** @type {Promise<unknown>} */ (result).then === "function") {
      await result;
    }
  }
}

/**
 * 字后步等高亮：实体宝藏所在槽（蓝图镜像时用被复制 id 的真实槽，而非面具/绵羊槽）。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {string} treasureId
 * @param {number} hookSlotIndex
 */
export function resolvePhysicalTreasureSlotIndex(ownedSlotTreasureIds, treasureId, hookSlotIndex) {
  const tid = String(treasureId ?? "");
  const slots = ownedSlotTreasureIds ?? [];
  const ix = Math.floor(Number(hookSlotIndex));
  if (tid && Number.isFinite(ix) && ix >= 0 && ix < slots.length && slots[ix] === tid) {
    return ix;
  }
  if (!tid) return Math.max(0, Math.floor(Number(hookSlotIndex) || 0));
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === tid) return i;
  }
  return Math.max(0, Math.floor(Number(hookSlotIndex) || 0));
}

/**
 * 本次 hook 是否对应槽位上的实体宝藏（非面具/绵羊 blueprint 镜像）。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {number} slotIndex
 * @param {string} treasureId
 * @param {"self" | "blueprint"} source
 */
export function isPhysicalTreasureHookContribution(ownedSlotTreasureIds, slotIndex, treasureId, source) {
  if (source !== "self") return false;
  return String((ownedSlotTreasureIds ?? [])[slotIndex] ?? "") === String(treasureId ?? "");
}

/**
 * 顺序 hook 批次中：该贡献是否仍有效（槽位未被清空、蓝图镜像目标仍在）。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {{ slotIndex: number, treasureId: string, source: "self" | "blueprint" }} entry
 */
export function isTreasureHookContributionActive(ownedSlotTreasureIds, { slotIndex, treasureId, source }) {
  const slots = ownedSlotTreasureIds ?? [];
  const tid = String(treasureId ?? "");
  if (!tid) return false;
  if (source === "self") {
    return String(slots[slotIndex] ?? "") === tid;
  }
  return getBlueprintMirroredTreasureId(slots, slotIndex) === tid;
}

/**
 * run 银行 / 充能等「累加」是否应在本 hook 写入（仅实体槽位上的宝藏本身；蓝图复制只复现效果，不累加进被复制 id）。
 */
export function shouldTreasureRunAccumulationMutate(ownedSlotTreasureIds, slotIndex, treasureId, source) {
  return isPhysicalTreasureHookContribution(ownedSlotTreasureIds, slotIndex, treasureId, source);
}

/**
 * 计分时该 treasureId 在 hook 遍历中生效的路径数（含面具/绵羊 blueprint）。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {string} treasureId
 */
export function countTreasureHookContributionPaths(ownedSlotTreasureIds, treasureId) {
  const tid = String(treasureId ?? "");
  if (!tid) return 0;
  let n = 0;
  for (const entry of iterTreasureHookContributions(ownedSlotTreasureIds)) {
    if (entry.treasureId === tid) n += 1;
  }
  return n;
}

/**
 * 字后步动画槽：实体宝藏用真实槽；蓝图镜像用面具/绵羊槽。
 */
export function resolvePostLetterAnimSlotIndex(ownedSlotTreasureIds, treasureId, hookSlotIndex, source) {
  if (source === "blueprint") return Math.max(0, Math.floor(Number(hookSlotIndex) || 0));
  return resolvePhysicalTreasureSlotIndex(ownedSlotTreasureIds, treasureId, hookSlotIndex);
}

/** 本次 hook 来自面具/绵羊 blueprint 镜像（只复现增益，不触发成长/状态写入）。 */
export function isTreasureHookBlueprintMirror(ctx) {
  return ctx?.hookSource === "blueprint";
}

/**
 * 关卡结算等 hook 动效槽：优先用 hook 贡献槽位（蓝图时为面具/绵羊槽）。
 * @param {{ hookSlotIndex?: number }} ctx
 */
export function resolveTreasureHookAnimSlotIndex(ctx) {
  const ix = Math.floor(Number(ctx?.hookSlotIndex));
  return Number.isFinite(ix) && ix >= 0 ? ix : undefined;
}
