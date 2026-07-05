/**
 * 火山喷发：受害者筛选与距离排序（纯逻辑）。
 */

/**
 * @param {{ left: number, top: number, width: number, height: number } | null | undefined} rect
 * @param {{ left: number, top: number, width: number, height: number } | null | undefined} anchorRect
 * @returns {number}
 */
export function rectCenterDistanceSq(rect, anchorRect) {
  if (!anchorRect || anchorRect.width < 1 || anchorRect.height < 1) {
    return Number.POSITIVE_INFINITY;
  }
  if (!rect || rect.width < 1 || rect.height < 1) return Number.POSITIVE_INFINITY;
  const ax = anchorRect.left + anchorRect.width / 2;
  const ay = anchorRect.top + anchorRect.height / 2;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = cx - ax;
  const dy = cy - ay;
  return dx * dx + dy * dy;
}

/**
 * @param {unknown} tile
 * @returns {boolean}
 */
export function gridTileHasMaterial(tile) {
  if (!tile || typeof tile !== "object") return false;
  if (/** @type {{ isWildcard?: boolean }} */ (tile).isWildcard === true) return true;
  return String(/** @type {{ materialId?: unknown }} */ (tile).materialId ?? "").trim() !== "";
}

/**
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} volcanoSlotIndex
 * @returns {number[]}
 */
export function resolveVolcanoTreasureVictimIndices(ownedSlots, volcanoSlotIndex) {
  const originIx = Math.floor(Number(volcanoSlotIndex));
  if (!Array.isArray(ownedSlots) || !Number.isFinite(originIx)) return [];
  /** @type {number[]} */
  const victims = [];
  for (let i = 0; i < ownedSlots.length; i += 1) {
    if (i === originIx) continue;
    if (ownedSlots[i] == null) continue;
    victims.push(i);
  }
  return victims;
}

/**
 * @param {readonly (readonly unknown[])[] | unknown[][]} grid
 * @param {number} ROWS
 * @param {number} COLS
 * @returns {{ row: number, col: number }[]}
 */
export function collectVolcanoIgniteGridCells(grid, ROWS, COLS) {
  /** @type {{ row: number, col: number }[]} */
  const out = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const tile = grid[r]?.[c];
      if (!tile || typeof tile !== "object") continue;
      if (!String(/** @type {{ letter?: unknown }} */ (tile).letter ?? "").trim()) continue;
      if (/** @type {{ bossGridBlocked?: boolean }} */ (tile).bossGridBlocked) continue;
      out.push({ row: r, col: c });
    }
  }
  return out;
}

/**
 * @typedef {{ kind: 'treasure', slotIndex: number, distance: number }} VolcanoRippleTreasureTarget
 * @typedef {{ kind: 'grid', row: number, col: number, distance: number }} VolcanoRippleGridTarget
 * @typedef {VolcanoRippleTreasureTarget | VolcanoRippleGridTarget} VolcanoRippleTarget
 */

/**
 * 宝藏摧毁与棋盘点燃并入同一队列，按与火山锚点的 DOM 距离升序。
 * @param {{
 *   victimSlotIndices: number[],
 *   igniteGridCells: { row: number, col: number }[],
 *   anchorRect: { left: number, top: number, width: number, height: number } | null | undefined,
 *   getTreasureSlotRect: (slotIndex: number) => { left: number, top: number, width: number, height: number } | null | undefined,
 *   getGridCellRect: (row: number, col: number) => { left: number, top: number, width: number, height: number } | null | undefined,
 * }} p
 * @returns {VolcanoRippleTarget[]}
 */
export function buildVolcanoEruptionRippleTargets(p) {
  const { victimSlotIndices, igniteGridCells, anchorRect, getTreasureSlotRect, getGridCellRect } = p;
  /** @type {VolcanoRippleTarget[]} */
  const out = [];
  for (const slotIndex of victimSlotIndices) {
    out.push({
      kind: "treasure",
      slotIndex,
      distance: rectCenterDistanceSq(getTreasureSlotRect(slotIndex), anchorRect),
    });
  }
  for (const { row, col } of igniteGridCells) {
    out.push({
      kind: "grid",
      row,
      col,
      distance: rectCenterDistanceSq(getGridCellRect(row, col), anchorRect),
    });
  }
  out.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.kind !== b.kind) return a.kind === "treasure" ? -1 : 1;
    if (a.kind === "treasure" && b.kind === "treasure") return a.slotIndex - b.slotIndex;
    if (a.kind === "grid" && b.kind === "grid") {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    }
    return 0;
  });
  return out;
}
