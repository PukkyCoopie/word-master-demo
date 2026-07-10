import gsap from "gsap";
import { EASE_TRANSFORM, EASE_GRID_GRAVITY_Y, EASE_GRID_LINEAR } from "../constants.js";
import { gridTileEntranceDelayKey } from "./gridOnlyMaterialScoring.js";
import {
  gridIntroDropOffsetRows as gridIntroDropOffsetRowsPure,
  gridRefillNewTileDropOffsetRows as gridRefillNewTileDropOffsetRowsPure,
  isGridDropFromAboveGrid,
} from "./gridDropOffset.js";

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
 * @param {{ row: number, col: number }} prevCell
 * @param {number} row
 * @param {number} col
 * @param {number} stepX
 * @param {number} stepY
 */
function computeFlipDeltaFromCells(prevCell, row, col, stepX, stepY) {
  if (prevCell.row === row && prevCell.col === col) {
    return { dx: 0, dy: 0 };
  }
  return {
    dx: (prevCell.col - col) * stepX,
    dy: (prevCell.row - row) * stepY,
  };
}

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

  /** @type {{ y: number, x: number } | null} */
  let gridStepCache = null;

  function invalidateGridTileStepCache() {
    gridStepCache = null;
  }

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

  /** @returns {number} 相对落点格向上的偏移行数（乘 stepY 为 GSAP y0）；按完整棋盘行计，镣铐顶行封锁时仍从网格外落入 */
  function gridRefillNewTileDropOffsetRows(row, col) {
    return gridRefillNewTileDropOffsetRowsPure(row, gridColumnHasEmptyAbove(row, col), ROWS);
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
    if (gridStepCache && gridStepCache.y > 0) return gridStepCache.y;
    const topRow = resolvePlayableTopRow();
    const i0 = topRow * COLS;
    const i1 = i0 + COLS;
    const e0 = getGridTileElByIndex(i0);
    const e1 = getGridTileElByIndex(i1);
    let stepY = 72;
    if (e0 && e1) {
      const dy = e1.getBoundingClientRect().top - e0.getBoundingClientRect().top;
      stepY = Math.max(48, dy);
    }
    gridStepCache = { y: stepY, x: gridStepCache?.x ?? 0 };
    return stepY;
  }

  function measureGridTileStepX() {
    if (gridStepCache && gridStepCache.x > 0) return gridStepCache.x;
    const e0 = getGridTileElByIndex(0);
    const e1 = getGridTileElByIndex(1);
    let stepX = 0;
    if (e0 && e1) {
      const dx = e1.getBoundingClientRect().left - e0.getBoundingClientRect().left;
      stepX = Math.max(48, Math.abs(dx));
    } else {
      stepX = measureGridTileStepY();
    }
    gridStepCache = { y: gridStepCache?.y ?? 0, x: stepX };
    return stepX;
  }

  /**
   * initial：首次入场，最下一排 tile 先落，再往上逐排。
   * 补牌：新格同上；同 id FLIP 也按排从下到上依次动。
   * @param {{ rects?: Map<string, DOMRect> | null, cells: Map<string, { row: number, col: number }> } | null} prevFlip 补牌前快照；initial 时为 null
   * @param {{ initial?: boolean }} [options]
   */
  function runGridDropAnimation(prevFlip, options = {}) {
    const isInitial = options.initial === true;
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
        const tickOne = (_el, opts = {}) => {
          if (opts.landHaptic) triggerHaptic("land");
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
        const dDrop = GRID_DROP_DURATION;
        const dFlip = GRID_FLIP_DURATION;
        /** @type {Array<() => void>} */
        const startAnimJobs = [];
        for (let i = 0; i < ROWS * COLS; i++) {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const tile = grid[row][col];
          if (tile == null || tile.bossGridBlocked) continue;
          const el = getGridTileElByIndex(i);
          if (!el) continue;
          pending++;
          const tid = tile?.id != null && tile.id !== "" ? String(tile.id) : "";
          const stagger = gridTileEntranceDelay(row, col);
          const flipDelay = gridTileEntranceDelay(row, col, 0.65);

          if (isInitial) {
            startAnimJobs.push(() => {
              gsapLib.killTweensOf(el);
              gsapLib.to(el, {
                y: 0,
                duration: dDrop,
                delay: stagger,
                ease: EASE_GRID_GRAVITY_Y,
                onComplete: () => tickOne(el, { landHaptic: true }),
              });
            });
          } else if (tid && prevCellMap?.has(tid)) {
            const pCell = prevCellMap.get(tid);
            const { dx, dy } = computeFlipDeltaFromCells(pCell, row, col, stepX, stepY);
            startAnimJobs.push(() => {
              gsapLib.killTweensOf(el);
              if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                tickOne(el);
                return;
              }
              const gravityDom = Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) > 1.5;
              if (gravityDom) {
                gsapLib
                  .timeline({ delay: flipDelay, onComplete: () => tickOne(el, { landHaptic: true }) })
                  .fromTo(
                    el,
                    { x: dx, y: dy, force3D: true, immediateRender: true },
                    { x: 0, duration: dFlip, ease: EASE_GRID_LINEAR },
                    0,
                  )
                  .to(el, { y: 0, duration: dFlip, ease: EASE_GRID_GRAVITY_Y }, 0);
              } else {
                gsapLib.fromTo(
                  el,
                  { x: dx, y: dy, force3D: true, immediateRender: true },
                  {
                    x: 0,
                    y: 0,
                    duration: dFlip,
                    delay: flipDelay,
                    ease: EASE_TRANSFORM,
                    onComplete: () => tickOne(el, { landHaptic: true }),
                  },
                );
              }
            });
          } else {
            const dropOffsetRows = gridRefillNewTileDropOffsetRows(row, col);
            const y0 = -dropOffsetRows * stepY;
            const dropFromAboveGrid = isGridDropFromAboveGrid(dropOffsetRows, row);
            /** @type {gsap.TweenVars} */
            const fromVars = { x: 0, y: y0, force3D: true, immediateRender: true };
            /** @type {gsap.TweenVars} */
            const toVars = {
              y: 0,
              duration: dDrop,
              delay: stagger,
              ease: EASE_GRID_GRAVITY_Y,
              onComplete: () => tickOne(el, { landHaptic: true }),
            };
            if (dropFromAboveGrid) {
              fromVars.opacity = 0.55;
              toVars.opacity = 1;
            }
            startAnimJobs.push(() => {
              gsapLib.killTweensOf(el);
              gsapLib.fromTo(el, fromVars, toVars);
            });
          }
        }
        for (const start of startAnimJobs) {
          start();
        }
        if (pending === 0) {
          settleOnce();
        }
      };

      run();
    });
  }

  /** 首次入场：相对完整棋盘顶行的向上偏移行数（× stepY 为初始 y）；stagger 仍按可玩区 */
  function gridIntroDropOffsetRows(row) {
    return gridIntroDropOffsetRowsPure(row);
  }

  return {
    captureGridRectsByTileId,
    measureGridTileStepY,
    measureGridTileStepX,
    invalidateGridTileStepCache,
    gridRefillNewTileDropOffsetRows,
    gridIntroDropOffsetRows,
    gridTileEntranceDelay,
    runGridDropAnimation,
  };
}
