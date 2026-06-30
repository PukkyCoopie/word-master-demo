import gsap from "gsap";
import { EASE_TRANSFORM, EASE_GRID_GRAVITY_Y, EASE_GRID_LINEAR } from "../constants.js";
import { gridTileEntranceDelayKey } from "./gridOnlyMaterialScoring.js";

/** 下落时长略长，便于看出加速过程 */
export const GRID_DROP_DURATION = 0.52;
export const GRID_FLIP_DURATION = 0.46;

/**
 * @typedef {Object} GridDropAnimDeps
 * @property {() => Array<Array<object | null>>} getGrid
 * @property {(index: number) => HTMLElement | undefined} getGridTileElByIndex
 * @property {(index: number) => HTMLElement | undefined} [getGridTileRef]
 * @property {(el: HTMLElement | null | undefined) => void} clearGridTileGsapAfterDrop
 * @property {(kind: string) => void} [triggerHaptic]
 * @property {number} rows
 * @property {number} cols
 * @property {() => number} [getPlayableTopRow] 镣铐等：首行可玩格索引（默认 0）
 * @property {typeof gsap} [gsapLib]
 */

/**
 * 棋盘补牌/首次入场 GSAP 下落与 FLIP（无 Vue；DOM 经 getter 注入）。
 *
 * @param {GridDropAnimDeps} deps
 */
export function createGridDropAnim(deps) {
  const {
    getGrid,
    getGridTileElByIndex,
    getGridTileRef = () => undefined,
    clearGridTileGsapAfterDrop,
    triggerHaptic = () => {},
    rows: ROWS,
    cols: COLS,
    getPlayableTopRow = () => 0,
    gsapLib = gsap,
  } = deps;

  function resolvePlayableTopRow() {
    const top = Math.floor(Number(getPlayableTopRow()) || 0);
    return Math.max(0, Math.min(top, ROWS - 1));
  }

  function gridTileEntranceDelay(row, col, colMul = 1) {
    const topRow = resolvePlayableTopRow();
    const playableRows = ROWS - topRow;
    const playableRow = Math.max(0, row - topRow);
    return gridTileEntranceDelayKey(playableRow, col, playableRows, COLS, colMul);
  }

  function isGridCellEmptyForDropAnim(cell) {
    if (cell?.bossGridBlocked) return false;
    return cell == null || !cell.letter || String(cell.letter).trim() === "";
  }

  function gridColumnHasEmptyAbove(row, col) {
    const grid = getGrid();
    for (let r = 0; r < row; r++) {
      const cell = grid[r]?.[col];
      if (cell?.bossGridBlocked) continue;
      if (isGridCellEmptyForDropAnim(cell)) return true;
    }
    return false;
  }

  /** @returns {number} 相对落点格向上的偏移行数（乘 stepY 为 GSAP y0） */
  function gridRefillNewTileDropOffsetRows(row, col) {
    const topRow = resolvePlayableTopRow();
    const playableRow = Math.max(0, row - topRow);
    const playableRows = ROWS - topRow;
    if (gridColumnHasEmptyAbove(row, col)) return playableRows + row + 2;
    return playableRow + 2;
  }

  /** 补牌前按 tile.id 记录视口矩形（须与 `snapshotGridCellsByTileId()` 同一时刻调用，保证 FLIP 一致） */
  function captureGridRectsByTileId() {
    const map = new Map();
    const g = getGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const el = getGridTileElByIndex(idx);
        const tile = g[r][c];
        if (el && tile?.id != null && tile.id !== "") map.set(String(tile.id), el.getBoundingClientRect());
      }
    }
    return map;
  }

  function measureGridTileStepY() {
    const topRow = resolvePlayableTopRow();
    const i0 = topRow * COLS;
    const i1 = i0 + COLS;
    const e0 = getGridTileElByIndex(i0);
    const e1 = getGridTileElByIndex(i1);
    if (e0 && e1) {
      const dy = e1.getBoundingClientRect().top - e0.getBoundingClientRect().top;
      return Math.max(48, dy);
    }
    return 72;
  }

  function measureGridTileStepX() {
    const e0 = getGridTileElByIndex(0);
    const e1 = getGridTileElByIndex(1);
    if (e0 && e1) {
      const dx = e1.getBoundingClientRect().left - e0.getBoundingClientRect().left;
      return Math.max(48, Math.abs(dx));
    }
    return measureGridTileStepY();
  }

  /**
   * initial：首次入场，最下一排 tile 先落，再往上逐排。
   * 补牌：新格同上；同 id FLIP 也按排从下到上依次动。
   * @param {{ rects: Map<string, DOMRect>, cells: Map<string, { row: number, col: number }> } | null} prevFlip 补牌前快照；initial 时为 null
   */
  function runGridDropAnimation(prevFlip, options = {}) {
    const isInitial = options.initial === true;
    const prevRectMap = !isInitial && prevFlip?.rects ? prevFlip.rects : null;
    const prevCellMap = !isInitial && prevFlip?.cells ? prevFlip.cells : null;
    return new Promise((resolve) => {
      let settled = false;
      let watchdogTimer = null;
      const settleOnce = () => {
        if (settled) return;
        settled = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        for (let j = 0; j < ROWS * COLS; j++) {
          clearGridTileGsapAfterDrop(getGridTileElByIndex(j));
        }
        resolve();
      };
      const run = () => {
        const stepY = measureGridTileStepY();
        const stepX = measureGridTileStepX();
        let pending = 0;
        let completed = 0;
        let movedAnimatedCount = 0;
        let movedInstantCount = 0;
        let newDropCount = 0;
        let fallbackNodeCount = 0;
        const tickOne = (el, opts = {}) => {
          if (opts.landHaptic) triggerHaptic("land");
          clearGridTileGsapAfterDrop(el);
          if (settled) return;
          if (++completed >= pending) settleOnce();
        };
        const maxDropDelay = gridTileEntranceDelay(0, COLS - 1);
        const maxFlipDelay = gridTileEntranceDelay(0, COLS - 1, 0.65);
        const watchdogMs =
          Math.ceil(Math.max(maxDropDelay + GRID_DROP_DURATION, maxFlipDelay + GRID_FLIP_DURATION) * 1000) + 800;
        watchdogTimer = setTimeout(() => {
          console.warn("[runGridDropAnimation] watchdog fired, force finishing drop animation");
          settleOnce();
        }, Math.max(1200, watchdogMs));
        const grid = getGrid();
        for (let i = 0; i < ROWS * COLS; i++) {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const tile = grid[row][col];
          if (tile == null) continue;
          const el = getGridTileElByIndex(i);
          if (!el) continue;
          if (!getGridTileRef(i)) fallbackNodeCount += 1;
          pending++;
          const tid = tile?.id != null && tile.id !== "" ? String(tile.id) : "";
          const stagger = gridTileEntranceDelay(row, col);
          gsapLib.killTweensOf(el);
          const dDrop = GRID_DROP_DURATION;
          const dFlip = GRID_FLIP_DURATION;
          const flipDelay = gridTileEntranceDelay(row, col, 0.65);

          if (isInitial) {
            gsapLib
              .timeline({ delay: stagger, onComplete: () => tickOne(el, { landHaptic: true }) })
              .to(el, { y: 0, duration: dDrop, ease: EASE_GRID_GRAVITY_Y }, 0);
          } else if (tid && prevCellMap?.has(tid)) {
            const pCell = prevCellMap.get(tid);
            const movedCell = pCell.row !== row || pCell.col !== col;
            let dx = 0;
            let dy = 0;
            if (prevRectMap?.has(tid)) {
              const prev = prevRectMap.get(tid);
              const last = el.getBoundingClientRect();
              dx = prev.left - last.left;
              dy = prev.top - last.top;
            }
            const rectSignificant = Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5;
            if (!rectSignificant && movedCell) {
              dx = -(col - pCell.col) * stepX;
              dy = -(row - pCell.row) * stepY;
            }
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
              if (movedCell) {
                movedInstantCount += 1;
              }
              gsapLib.set(el, { x: 0, y: 0 });
              tickOne(el);
            } else {
              if (movedCell) movedAnimatedCount += 1;
              gsapLib.set(el, { x: dx, y: dy, force3D: true });
              const gravityDom = Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) > 1.5;
              if (gravityDom) {
                gsapLib
                  .timeline({ delay: flipDelay, onComplete: () => tickOne(el, { landHaptic: true }) })
                  .to(el, { x: 0, duration: dFlip, ease: EASE_GRID_LINEAR }, 0)
                  .to(el, { y: 0, duration: dFlip, ease: EASE_GRID_GRAVITY_Y }, 0);
              } else {
                gsapLib.to(el, {
                  x: 0,
                  y: 0,
                  duration: dFlip,
                  delay: flipDelay,
                  ease: EASE_TRANSFORM,
                  onComplete: () => tickOne(el, { landHaptic: true }),
                });
              }
            }
          } else {
            newDropCount += 1;
            const topRow = resolvePlayableTopRow();
            const playableRow = Math.max(0, row - topRow);
            const dropOffsetRows = gridRefillNewTileDropOffsetRows(row, col);
            const y0 = -dropOffsetRows * stepY;
            const dropFromAboveGrid = dropOffsetRows > playableRow + 2;
            gsapLib.set(el, {
              x: 0,
              y: y0,
              ...(dropFromAboveGrid ? { opacity: 0.55 } : {}),
            });
            const dropTl = gsapLib.timeline({
              delay: stagger,
              onComplete: () => tickOne(el, { landHaptic: true }),
            });
            dropTl.to(el, { y: 0, duration: dDrop, ease: EASE_GRID_GRAVITY_Y }, 0);
            if (dropFromAboveGrid) {
              dropTl.to(el, { opacity: 1, duration: dDrop, ease: EASE_GRID_LINEAR }, 0);
            }
          }
        }
        if (pending === 0) {
          settleOnce();
        }
      };

      run();
    });
  }

  /** 首次入场：相对可玩区顶行的向上偏移行数（× stepY 为初始 y） */
  function gridIntroDropOffsetRows(row) {
    const topRow = resolvePlayableTopRow();
    const playableRow = Math.max(0, row - topRow);
    return playableRow + 2.2;
  }

  return {
    captureGridRectsByTileId,
    measureGridTileStepY,
    measureGridTileStepX,
    gridRefillNewTileDropOffsetRows,
    gridIntroDropOffsetRows,
    gridTileEntranceDelay,
    runGridDropAnimation,
  };
}
