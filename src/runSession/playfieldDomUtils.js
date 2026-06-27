import { gpPlayfieldBridge } from "./gpPlayfieldBridge.js";

/** 组件 ref 取根 DOM（LetterTile 等），原生元素原样返回 */
export function refToDom(el) {
  if (!el) return undefined;
  if (typeof el.getEl === "function") return el.getEl() ?? undefined;
  return el.$el != null ? el.$el : el;
}

/**
 * 棋盘 DOM 查询（assembly 前 GP 回退；bind 后以 playfieldController 为准）。
 * @param {{
 *   gridTileRefs: import('vue').Ref<(HTMLElement | undefined)[]>,
 *   letterGridRef: import('vue').Ref<HTMLElement | null>,
 *   selectedOrder: import('vue').Ref<{ row: number, col: number }[]>,
 *   COLS: number,
 * }} deps
 */
export function createPlayfieldDomSurface(deps) {
  const { gridTileRefs, letterGridRef, selectedOrder, COLS } = deps;

  function setGridTileRef(index, el) {
    gpPlayfieldBridge.ctrl?.setGridTileRef?.(index, el);
    const node = refToDom(el);
    if (node) gridTileRefs.value[index] = node;
    else gridTileRefs.value[index] = undefined;
  }

  function getGridTileElByIndex(index) {
    const fromCtrl = gpPlayfieldBridge.ctrl?.getGridTileElByIndex?.(index);
    if (fromCtrl) return fromCtrl;
    const ctrlRefs = gpPlayfieldBridge.ctrl?.gridTileRefs;
    const refs = ctrlRefs ?? gridTileRefs;
    const byRef = refs.value[index];
    if (byRef) return byRef;
    const host = letterGridRef.value;
    const child = host?.children?.[index];
    if (!(child instanceof HTMLElement)) return undefined;
    const tileEl = child.querySelector(".grid-tile");
    return tileEl instanceof HTMLElement ? tileEl : child;
  }

  function getGridCellElByIndex(index) {
    const host = letterGridRef.value;
    const child = host?.children?.[index];
    if (!(child instanceof HTMLElement)) return undefined;
    return child.classList.contains("letter-grid-cell") ? child : undefined;
  }

  function getSelectedGridCellElsInOrder() {
    const list = [];
    for (const pos of selectedOrder.value) {
      const el = getGridCellElByIndex(pos.row * COLS + pos.col);
      if (el) list.push(el);
    }
    return list;
  }

  function getSelectedGridTileElsInOrder() {
    const list = [];
    for (const pos of selectedOrder.value) {
      const el = getGridTileElByIndex(pos.row * COLS + pos.col);
      if (el) list.push(el);
    }
    return list;
  }

  return {
    refToDom,
    setGridTileRef,
    getGridTileElByIndex,
    getGridCellElByIndex,
    getSelectedGridCellElsInOrder,
    getSelectedGridTileElsInOrder,
  };
}
