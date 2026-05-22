/** 牌库 stack：最上层（idx = n-1）为 0°，往下依次略偏；张数越多每层转角越小 */
export function deckStackPileRotationDeg(count, idx) {
  const n = Math.max(1, Math.round(Number(count)) || 1);
  if (n <= 1) return 0;
  const layers = n - 1;
  const step = Math.min(10, 40 / layers);
  return (idx - (n - 1)) * step;
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
