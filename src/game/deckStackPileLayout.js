/** 牌库 stack：最上层（idx = n-1）为 0°，往下依次略偏；张数越多每层转角越小 */
export function deckStackPileRotationDeg(count, idx) {
  const n = Math.max(1, Math.round(Number(count)) || 1);
  if (n <= 1) return 0;
  const layers = n - 1;
  const step = Math.min(10, 40 / layers);
  return (idx - (n - 1)) * step;
}

/** 牌库 stack 展开后允许材质 canvas 逐帧动画的材质块上限（含） */
export const DECK_STACK_MATERIAL_ANIM_MAX = 5;

/**
 * @param {unknown} materialId
 * @returns {boolean}
 */
export function deckEntryHasMaterial(materialId) {
  return String(materialId ?? "").trim() !== "";
}

/**
 * @param {{ entries?: unknown[] } | null | undefined} stack
 * @param {(entry: unknown) => { materialId?: string | null } | null | undefined} resolveEntryTileProps
 */
export function countDeckStackMaterialTiles(stack, resolveEntryTileProps) {
  const entries = stack?.entries;
  if (!Array.isArray(entries)) return 0;
  let count = 0;
  for (const entry of entries) {
    const props = resolveEntryTileProps(entry);
    if (props && deckEntryHasMaterial(props.materialId)) count += 1;
  }
  return count;
}

/**
 * 牌库 stack 展开预览时是否启用材质动画（超过 {@link DECK_STACK_MATERIAL_ANIM_MAX} 则静帧）。
 *
 * @param {boolean} stackExpanded
 * @param {number} materialTileCount
 */
export function deckStackMaterialAnimateEnabled(stackExpanded, materialTileCount) {
  if (!stackExpanded) return false;
  return materialTileCount <= DECK_STACK_MATERIAL_ANIM_MAX;
}

export function deckStackPileCellStyle(stack, idx) {
  const n = Math.max(1, stack?.entries?.length ?? 1);
  const rotDeg = deckStackPileRotationDeg(n, idx);
  return {
    zIndex: String(idx),
    transform: `rotate(${rotDeg}deg)`,
    transformOrigin: "50% 50%",
  };
}

/** 展开列表中单块：已上场过的牌张 resting 透明度（与 `.deck-expand-tile-hit--dimmed` 一致） */
export function deckExpandHitRestingOpacity(hitEl) {
  return hitEl?.classList?.contains("deck-expand-tile-hit--dimmed") ? 0.42 : 1;
}
