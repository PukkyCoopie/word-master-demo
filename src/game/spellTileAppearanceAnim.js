import gsap from "gsap";
import { syncTileStateToDeckCard } from "../composables/useGameState.js";
import {
  snapshotMaxIntrinsicGainsFromTile,
  applyIntrinsicGainsToTileAndLinkedCard,
} from "./tileIntrinsicGains.js";

const SHRINK = 0.26;
const STAGGER = 0.1;
const FRAME_YIELD = 0.04;
/** 法术「删除」确认动效 */
const DELETE_GROW_SCALE = 1.22;
const DELETE_GROW_DUR = 0.26;
const DELETE_SHRINK_DUR = 0.34;
const DELETE_STAGGER = 0.09;
/** 谷底弹出：略带回弹、无大角度晃，避免「廉价 wobble」感 */
const POP_PEAK = 1.06;
const POP_IN = 0.26;
const POP_SETTLE = 0.2;

/**
 * @param {unknown} snap
 */
export function cloneSpellTileSnapshot(snap) {
  if (snap == null || typeof snap !== "object") return snap;
  try {
    return JSON.parse(JSON.stringify(snap));
  } catch {
    return snap;
  }
}

/** @param {unknown} snap */
function cloneSnap(snap) {
  return cloneSpellTileSnapshot(snap);
}

/**
 * @param {Record<string, unknown>[][]} g
 * @param {number} ROWS
 * @param {number} COLS
 */
export function cloneGridDeep(g, ROWS, COLS) {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(cloneSnap(g[r]?.[c]));
    }
    rows.push(row);
  }
  return rows;
}

/**
 * @param {unknown[][]} before
 * @param {unknown[][]} after
 * @param {number} ROWS
 * @param {number} COLS
 * @returns {{ row: number, col: number }[]}
 */
export function diffGridAppearanceTargets(before, after, ROWS, COLS) {
  /** @type {{ row: number, col: number }[]} */
  const out = [];
  const seen = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const A = before[r]?.[c];
      const B = after[r]?.[c];
      let jA;
      let jB;
      try {
        jA = JSON.stringify(A);
        jB = JSON.stringify(B);
      } catch {
        continue;
      }
      if (jA === jB) continue;
      if (!A?.letter && !B?.letter) continue;
      const k = `${r},${c}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ row: r, col: c });
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} dest
 * @param {unknown} snap
 */
function assignCellFromSnap(dest, snap) {
  if (!dest || typeof dest !== "object") return;
  const prevDeck = dest._deckCard;
  const plain = cloneSnap(snap);
  if (plain == null || typeof plain !== "object") return;
  const keptGains = snapshotMaxIntrinsicGainsFromTile(dest);
  const snapGains = snapshotMaxIntrinsicGainsFromTile(plain);
  /* 合并写入，避免先删光 key 再 assign 与 Vue 响应式/局部字段打架 */
  Object.assign(dest, plain);
  /* JSON 克隆会把 `_deckCard` 变成脱离 multiset 的副本；后续 `createTileFromDeckCard` 等从牌张读角标会盖掉格上增益 */
  if (prevDeck && typeof prevDeck === "object") dest._deckCard = prevDeck;
  applyIntrinsicGainsToTileAndLinkedCard(dest, {
    sb: Math.max(keptGains.sb, snapGains.sb),
    mb: Math.max(keptGains.mb, snapGains.mb),
  });
  syncTileStateToDeckCard(dest);
}

/**
 * @param {import("vue").ShallowRef<Record<string, unknown>[][]>} grid
 * @param {{ row: number, col: number }[]} targets
 * @param {unknown[]} snaps
 */
function assignTargetsFromSnaps(grid, targets, snaps) {
  const g = grid.value;
  for (let i = 0; i < targets.length; i++) {
    const { row, col } = targets[i];
    const cell = g[row]?.[col];
    if (cell && typeof cell === "object") assignCellFromSnap(cell, snaps[i]);
  }
}

/**
 * @param {{
 *   spellId: string,
 *   targets: { row: number, col: number }[],
 *   oldSnaps: unknown[],
 *   newSnaps?: unknown[],
 *   getNewSnapsAtMid?: () => unknown[],
 *   grid: import("vue").ShallowRef<Record<string, unknown>[][]>,
 *   touchGrid: () => void,
 *   getTileEl: (row: number, col: number) => HTMLElement | undefined,
 *   nextTick: () => Promise<void>,
 * }} opts
 */
export async function runSpellTileAppearanceAnim(opts) {
  const { spellId, targets, oldSnaps, newSnaps, getNewSnapsAtMid, grid, touchGrid, getTileEl, nextTick } =
    opts;
  if (!targets.length) return;

  const sid = String(spellId ?? "");
  assignTargetsFromSnaps(grid, targets, oldSnaps);
  touchGrid();
  await nextTick();

  const useBundled =
    sid === "seedling" ||
    sid === "dice" ||
    typeof getNewSnapsAtMid === "function";

  /* 生长/骰子/延后施法：多格同步缩至谷底再写回，避免提前读到已施法状态 */
  if (useBundled) {
    await runBundledTileAppearanceAnim({
      targets,
      newSnaps,
      getNewSnapsAtMid,
      grid,
      touchGrid,
      getTileEl,
    });
    return;
  }

  await Promise.all(
    targets.map((pos, i) =>
      animateOneTileIndependent({
        el: getTileEl(pos.row, pos.col),
        row: pos.row,
        col: pos.col,
        newSnap: newSnaps[i],
        grid,
        touchGrid,
        delay: i * STAGGER,
      }),
    ),
  );
}

/**
 * @param {{
 *   targets: { row: number, col: number }[],
 *   newSnaps?: unknown[],
 *   getNewSnapsAtMid?: () => unknown[],
 *   grid: import("vue").ShallowRef<Record<string, unknown>[][]>,
 *   touchGrid: () => void,
 *   getTileEl: (row: number, col: number) => HTMLElement | undefined,
 * }} p
 */
function runBundledTileAppearanceAnim(p) {
  const { targets, newSnaps, getNewSnapsAtMid, grid, touchGrid, getTileEl } = p;
  const g = grid.value;
  const shrinkEnd = Math.max(0, (targets.length - 1) * STAGGER) + SHRINK;

  return new Promise((resolve) => {
    const els = targets.map(({ row, col }) => getTileEl(row, col));

    const tl = gsap.timeline({
      onComplete: () => {
        for (const el of els) {
          if (el instanceof HTMLElement) gsap.set(el, { clearProps: "scale,rotation" });
        }
        resolve();
      },
    });

    targets.forEach((_, i) => {
      const el = els[i];
      if (!(el instanceof HTMLElement)) return;
      gsap.set(el, { transformOrigin: "50% 50%", rotation: 0 });
      tl.to(el, { scale: 0.12, duration: SHRINK, ease: "power3.in" }, i * STAGGER);
    });

    tl.add(() => {
      const snaps =
        typeof getNewSnapsAtMid === "function" ? getNewSnapsAtMid() : newSnaps;
      for (let i = 0; i < targets.length; i++) {
        const { row, col } = targets[i];
        const cell = g[row]?.[col];
        if (cell && typeof cell === "object") assignCellFromSnap(cell, snaps[i]);
      }
      touchGrid();
    }, shrinkEnd);

    tl.to({}, { duration: FRAME_YIELD });

    targets.forEach((_, i) => {
      const el = els[i];
      if (!(el instanceof HTMLElement)) return;
      const sub = gsap.timeline();
      sub.to(el, { scale: POP_PEAK, duration: POP_IN, ease: "back.out(1.42)" });
      sub.to(el, { scale: 1, duration: POP_SETTLE, ease: "power3.out" });
      tl.add(sub, shrinkEnd + FRAME_YIELD + i * STAGGER * 0.55);
    });
  });
}

/**
 * @param {{
 *   el?: HTMLElement,
 *   row: number,
 *   col: number,
 *   newSnap: unknown,
 *   grid: import("vue").ShallowRef<Record<string, unknown>[][]>,
 *   touchGrid: () => void,
 *   delay: number,
 * }} p
 */
/**
 * @param {import("vue").ShallowRef<Record<string, unknown>[][]>} grid
 * @param {unknown[][]} snap
 * @param {number} ROWS
 * @param {number} COLS
 */
export function restoreGridFromDeepClone(grid, snap, ROWS, COLS) {
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const plain = cloneSnap(snap[r]?.[c]);
      const t = g[r]?.[c];
      if (plain != null && typeof plain === "object") {
        if (t != null && typeof t === "object") {
          const prevDeck = t._deckCard;
          for (const k of Object.keys(t)) delete t[k];
          Object.assign(t, plain);
          if (prevDeck && typeof prevDeck === "object") t._deckCard = prevDeck;
          syncTileStateToDeckCard(t);
        } else {
          g[r][c] = plain;
        }
      } else {
        g[r][c] = plain;
      }
    }
  }
}

/**
 * @param {{
 *   el?: HTMLElement,
 *   row: number,
 *   col: number,
 *   newSnap: unknown,
 *   grid: import("vue").ShallowRef<Record<string, unknown>[][]>,
 *   touchGrid: () => void,
 *   delay: number,
 * }} p
 */
function animateOneTileIndependent(p) {
  const { el, row, col, newSnap, grid, touchGrid, delay } = p;
  const g = grid.value;
  if (!(el instanceof HTMLElement)) {
    const cell = g[row]?.[col];
    if (cell && typeof cell === "object") assignCellFromSnap(cell, newSnap);
    touchGrid();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gsap.set(el, { transformOrigin: "50% 50%", rotation: 0 });
    const tl = gsap.timeline({
      delay,
      onComplete: () => {
        gsap.set(el, { clearProps: "scale,rotation" });
        resolve();
      },
    });

    tl.to(el, { scale: 0.12, duration: SHRINK, ease: "power3.in" });
    tl.add(() => {
      const cell = g[row]?.[col];
      if (cell && typeof cell === "object") assignCellFromSnap(cell, newSnap);
      touchGrid();
    });
    tl.to({}, { duration: FRAME_YIELD });
    tl.to(el, { scale: POP_PEAK, duration: POP_IN, ease: "back.out(1.42)" });
    tl.to(el, { scale: 1, duration: POP_SETTLE, ease: "power3.out" });
  });
}

/**
 * 与棋盘 `animateOneTileIndependent` 同款节奏，在「谷底」调用 `onMidShrink`（例如写法术弹层上的 tile 快照），不写棋盘。
 * @param {{ el?: HTMLElement, delay?: number, onMidShrink?: () => void }} p
 */
function animateOneTileDetachedTimeline(p) {
  const { el, delay = 0, onMidShrink } = p;
  if (!(el instanceof HTMLElement)) {
    onMidShrink?.();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gsap.set(el, { transformOrigin: "50% 50%", rotation: 0 });
    const tl = gsap.timeline({
      delay,
      onComplete: () => {
        gsap.set(el, { clearProps: "scale,rotation" });
        resolve();
      },
    });

    tl.to(el, { scale: 0.12, duration: SHRINK, ease: "power3.in" });
    tl.add(() => {
      onMidShrink?.();
    });
    tl.to({}, { duration: FRAME_YIELD });
    tl.to(el, { scale: POP_PEAK, duration: POP_IN, ease: "back.out(1.42)" });
    tl.to(el, { scale: 1, duration: POP_SETTLE, ease: "power3.out" });
  });
}

/**
 * 法术弹层候选格：与 `runBundledTileAppearanceAnim` 同款同步谷底，不写棋盘。
 * @param {{ getTileEl: (i: number) => HTMLElement | undefined, targetCount: number, onMidShrinkAll?: () => void }} p
 */
function runDetachedBundledTimeline(p) {
  const { getTileEl, targetCount, onMidShrinkAll } = p;
  const shrinkEnd = Math.max(0, (targetCount - 1) * STAGGER) + SHRINK;

  return new Promise((resolve) => {
    const els = Array.from({ length: targetCount }, (_, i) => getTileEl(i));

    const tl = gsap.timeline({
      onComplete: () => {
        for (const el of els) {
          if (el instanceof HTMLElement) gsap.set(el, { clearProps: "scale,rotation" });
        }
        resolve();
      },
    });

    for (let i = 0; i < targetCount; i++) {
      const el = els[i];
      if (!(el instanceof HTMLElement)) continue;
      gsap.set(el, { transformOrigin: "50% 50%", rotation: 0 });
      tl.to(el, { scale: 0.12, duration: SHRINK, ease: "power3.in" }, i * STAGGER);
    }

    tl.add(() => {
      onMidShrinkAll?.();
    }, shrinkEnd);

    tl.to({}, { duration: FRAME_YIELD });

    for (let i = 0; i < targetCount; i++) {
      const el = els[i];
      if (!(el instanceof HTMLElement)) continue;
      const sub = gsap.timeline();
      sub.to(el, { scale: POP_PEAK, duration: POP_IN, ease: "back.out(1.42)" });
      sub.to(el, { scale: 1, duration: POP_SETTLE, ease: "power3.out" });
      tl.add(sub, shrinkEnd + FRAME_YIELD + i * STAGGER * 0.55);
    }
  });
}

/**
 * 法术「删除」确认：候选格先略放大，再收至极小并淡出（弹层内视为已删光）。
 * @param {{
 *   targetCount: number,
 *   getTileEl: (i: number) => HTMLElement | undefined,
 *   nextTick: () => Promise<void>,
 * }} opts
 */
export async function runDetachedDeleteBackConfirmAnim(opts) {
  const { targetCount, getTileEl, nextTick } = opts;
  if (targetCount <= 0) return;
  await nextTick();
  await Promise.all(
    Array.from({ length: targetCount }, (_, i) =>
      new Promise((resolve) => {
        const el = getTileEl(i);
        if (!(el instanceof HTMLElement)) {
          resolve();
          return;
        }
        gsap.killTweensOf(el);
        gsap.set(el, { transformOrigin: "50% 50%", scale: 1, opacity: 1 });
        const tl = gsap.timeline({
          delay: i * DELETE_STAGGER,
          onComplete: () => {
            gsap.set(el, { scale: 0, opacity: 0 });
            resolve();
          },
        });
        tl.to(el, { scale: DELETE_GROW_SCALE, duration: DELETE_GROW_DUR, ease: "power2.out" });
        tl.to(el, { scale: 0.02, opacity: 0, duration: DELETE_SHRINK_DUR, ease: "power3.in" });
      }),
    ),
  );
}

/**
 * 在法术选择弹层的 LetterTile DOM 上播放与棋盘一致的缩小→换图→回弹（不写 `grid`）。
 *
 * @param {{
 *   spellId: string,
 *   targetCount: number,
 *   getTileEl: (i: number) => HTMLElement | undefined,
 *   onMidAtIndex?: (i: number) => void,
 *   onMidShrinkAll?: () => void,
 *   nextTick: () => Promise<void>,
 * }} opts
 */
export async function runDetachedSpellTileAppearanceAnim(opts) {
  const { spellId, targetCount, getTileEl, onMidAtIndex, onMidShrinkAll, nextTick } = opts;
  if (targetCount <= 0) return;
  await nextTick();
  const sid = String(spellId ?? "");
  /** 材质类确认：多格同步缩至谷底再换图，避免逐格错峰时提前读到已施法状态 */
  if (sid === "seedling" || sid === "dice" || typeof onMidShrinkAll === "function") {
    await runDetachedBundledTimeline({
      getTileEl,
      targetCount,
      onMidShrinkAll,
    });
    return;
  }
  await Promise.all(
    Array.from({ length: targetCount }, (_, i) =>
      animateOneTileDetachedTimeline({
        el: getTileEl(i),
        delay: i * STAGGER,
        onMidShrink: () => onMidAtIndex?.(i),
      }),
    ),
  );
}
