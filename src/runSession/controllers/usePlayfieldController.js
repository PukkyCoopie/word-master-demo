import { computed, ref, shallowRef, watch, nextTick } from "vue";
import gsap from "gsap";
import { useTileDrag, buildInsertDragPreviewSlots } from "../../composables/useTileDrag.js";
import { useWordSlotFly, MIDDLE_MAX_W, SLOT_TILE_W } from "../../composables/useWordSlotFly.js";
import { createPlayfieldGridRender } from "../../game/playfieldGridRender.js";
import { createPlayfieldWordAux } from "../../game/playfieldWordAux.js";
import { createPlayfieldWordHint } from "../../game/playfieldWordHint.js";
import { getCandidateWordsByLength, resolveWordPattern } from "../../composables/useDictionary.js";
import { getWordHintMode } from "../../settings/gameSettings.js";
import { resolveHintMaxPerLevel } from "../../game/wordHintLimits.js";
import { getPresetHintLengthWeightShift } from "../../game/runPresetRuntime.js";
import { createPlayfieldViewContext } from "../../components/run/playfieldViewKey.js";
import { assemblePlayfieldViewContext } from "../viewContext/assemblePlayfieldViewContext.js";

/** @typedef {import("../runSessionTypes.js").PlayfieldController} PlayfieldController */
/** @typedef {import("../runSessionTypes.js").GridStore} GridStore */

/**
 * @typedef {Object} PlayfieldControllerOptions
 * @property {Pick<GridStore, "grid" | "selectedOrder" | "selectedTiles" | "selectTile" | "removeFromSlot" | "removeSingleTileFromWord" | "insertSelectedTileAt" | "reorderSelectedOrder" | "ceruleanBellSlotIndex" | "finalizeCeruleanBellSlotIndex" | "touchGrid" | "ensureCeruleanBellMarkedOnGrid" | "findCeruleanBellLockedTileOnGrid" | "ROWS" | "COLS" | "hintRemaining">} grid
 * @property {{ buildBossWildcardResolveContext: () => unknown, rarityLevelsByRarity: import('vue').Ref<Record<string, number>>, runPresetId: import('vue').Ref<string>, spellCountsByLength: import('vue').Ref<Record<string | number, number>>, judgedLengthTableLenForRun: (n: number) => number, lengthLevelsByLength: import('vue').Ref<Record<string | number, number>> }} hint
 * @property {{ getLetterGridRef: () => HTMLElement | null, getLetterGridWrapRef: () => HTMLElement | null, getWordSlotsWrapRef: () => HTMLElement | null, getWordSlotsScaleRootRef: () => HTMLElement | null }} dom
 * @property {{ transitionBusy: import("vue").Ref<boolean>, showShop: import("vue").Ref<boolean>, scoringAnimating: import("vue").Ref<boolean>, gridRefillAnimating: import("vue").Ref<boolean>, dictFatalError: import("vue").Ref<boolean>, dictionaryReady: import("vue").Ref<boolean>, suppressTilePrimaryClick: import("vue").Ref<boolean>, wordSelectionSwapBusy: import("vue").Ref<boolean> }} gates
 * @property {{ getWordSlotTilePresentations: () => unknown[], vowelGhostForTile: (tile: object, opts?: object) => unknown, computeFlyInTilePresentation: (tile: object) => unknown, computeFlyBackTilePresentation: (tile: object) => unknown, tilePresentationInResolvedWord: (tile: object, res: string | null, eff: string, extra?: object) => unknown, resolvedWordForSubmit: import("vue").ComputedRef<string | null>, effectiveWordPartsForSubmit: import("vue").ComputedRef<{ word: string }>, effectiveWordForSubmit: import("vue").ComputedRef<string>, bossSlugForMechanics: () => string, getBossTileDebuffContext: () => object, resolvePresentationBossTileDebuffed: (tile: object, slug: string, ctx: object) => boolean, isTileInFlyingBackFromWord: (tile: object) => boolean }} presentation
 * @property {{ isRunFlowOverlayOpen: () => boolean, isFirstWordTutorialBlockingInput: () => boolean, isGamePaused: () => boolean, bumpOverlayZ: () => number, triggerHaptic: (kind: string) => void, showToast: (msg: string) => void }} ui
 * @property {{ scheduleRunAutoSave: () => void, scheduleTutorialSpotlightUpdate: () => void, onCeruleanBellNewGridLock: (marked: boolean) => Promise<void> }} callbacks
 * @property {{ gridTileLetterForRender: import('vue').Ref<Map<unknown, string>>, gridTileRarityForRender: import('vue').Ref<Map<unknown, string>>, gridTileVowelGhostForRender: import('vue').Ref<Map<unknown, { prev?: string | null, next?: string | null }>> }} render
 * @property {import('vue').Ref<boolean>} firstWordTutorialActive
 * @property {{ openTileDetail: (payload: unknown, origin?: unknown, nav?: unknown) => void, buildTileDetailPayloadFromTile: (tile: object) => unknown, buildWordSlotTileDetailPayload: (i: number) => unknown, buildWordSlotPreviewNav: (i: number) => unknown, canOpenTileDetail: () => boolean, tileOriginRectFromElement: (el: unknown) => unknown, armTileLongPressFromPointer: (e: PointerEvent, openFn: () => void) => void, clearTileLongPressArm: () => void, markTilePrimaryTapConsumed: (pointerId: number) => void, armTilePrimaryTap: (e: PointerEvent, fire: () => void) => void, tryCompleteTilePrimaryTap: (e: PointerEvent) => void, onTilePointerCancel: (e: PointerEvent) => void }} detail
 * @property {{ allowsTileClick: (row: number, col: number) => boolean, onLetterSelected: () => void, phase: import("vue").ComputedRef<string> }} firstWordTutorial
 */

const SLOT_GAP = 6;
const GRID_CELL_PLACEHOLDER_OPACITY = 0.26;

/**
 * 棋盘 / 词槽交互控制器（任务 2.4）。
 * @param {PlayfieldControllerOptions} options
 * @returns {PlayfieldController}
 */
export function usePlayfieldController(options) {
  const { grid: gridStore, dom, gates, presentation, ui, callbacks, detail, firstWordTutorial: fwt, render, firstWordTutorialActive, hint: hintDeps } = options;
  const {
    grid,
    selectedOrder,
    selectedTiles,
    selectTile,
    removeFromSlot,
    removeSingleTileFromWord,
    insertSelectedTileAt,
    reorderSelectedOrder,
    ceruleanBellSlotIndex,
    finalizeCeruleanBellSlotIndex,
    touchGrid,
    ensureCeruleanBellMarkedOnGrid,
    findCeruleanBellLockedTileOnGrid,
    hintRemaining,
    ROWS,
    COLS,
  } = gridStore;

  const getLetterGridRef = () => dom.getLetterGridRef();
  const getLetterGridWrapRef = () => dom.getLetterGridWrapRef();
  const getWordSlotsWrapRef = () => dom.getWordSlotsWrapRef();
  const getWordSlotsScaleRootRef = () => dom.getWordSlotsScaleRootRef();

/** 离开 word 悬停后 placeholder 缩出动画期间暂留的布局（仅 slotIndex） */
const wordDragPhExit = ref(/** @type {{ slotIndex: number } | null} */ (null));
/**
 * 棋盘占位格定格展示：tile 离格入词/飞入时快照，词串解析变化期间不再刷新字母与材质相关 props。
 * @type {Map<string, {
 *   letter: string,
 *   rarity: string,
 *   materialId: string | null,
 *   accessoryId: string | null,
 *   treasureAccessoryId: string | null,
 *   tileScoreBonus: number,
 *   tileMultBonus: number,
 *   bossTileDebuffed: boolean,
 *   ceruleanBellLocked: boolean,
 *   playerMarked: boolean,
 *   bossGridBlocked: boolean,
 *   vowelGhostPrev: string | null,
 *   vowelGhostNext: string | null,
 * }>}
 */
const gridPlaceholderFreezeByTileId = new Map();
/** 上一次拖动预览列表，供 remap 保留像素位置 */
let lastWordDragPresentations = null;
const gridTileRefs = ref([]);
const wordSlotRefs = /** @type {(HTMLElement | undefined)[]} */ ([]);

/** 计分追加 S 弹出动画期间：缩放仍按原词长，弹出完成后随完整词长缩小 */
const submitScoringAppendScaleLocked = ref(false);

/** 计分动画中报纸等追加的临时词槽字母（不参与拼词/字母库） */
const submitScoringAppendPresentations = ref(/** @type {object[]} */ ([]));

/** 提交词槽离场后至补牌前：槽内字母仍挂在 selectedOrder，但须保持隐藏（防 slot RAF 清 GSAP opacity） */
const submitWordLeaveHiddenCount = ref(0);

function setSubmitScoringAppendPresentations(nextTiles) {
  if (Array.isArray(nextTiles)) {
    submitScoringAppendPresentations.value = nextTiles.filter((t) => t && typeof t === "object");
  } else {
    submitScoringAppendPresentations.value =
      nextTiles && typeof nextTiles === "object" ? [nextTiles] : [];
  }
}

function setSubmitScoringAppendPresentation(tile) {
  setSubmitScoringAppendPresentations(tile ? [tile] : []);
}

function setSubmitScoringAppendScaleLocked(locked) {
  submitScoringAppendScaleLocked.value = locked === true;
}

/** 词槽布局 ↔ 飞字动画桥（updateSlotPositions 定义后写入） */
const slotLayoutBridge = {
  slotScaleRuntime: 1,
  slotLayoutRpx: 1,
  ensureSlotRafRunning: () => {},
  updateSlotPositions: () => {},
};

let slotScaleRuntime = 1;
const slotCurrentPositions = [];
const slotPhScales = [];
const slotPhPrevActive = [];
const SLOT_EXPO_TIME_MS = 250;
const SLOT_SCALE_SETTLE_EPS = 0.002;
const SLOT_POS_SETTLE_EPS = 0.6;
const SLOT_PH_SCALE_SETTLE_EPS = 0.02;
let slotRafId = 0;
let slotRafLastTime = 0;
let slotScaleCssWritten = 1;

function refreshSlotLayoutRpx() {
  slotLayoutBridge.slotLayoutRpx =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  return slotLayoutBridge.slotLayoutRpx;
}

/** 组件 ref 取根 DOM（LetterTile 等），原生元素原样返回 */
function refToDom(el) {
  if (!el) return undefined;
  if (typeof el.getEl === "function") return el.getEl() ?? undefined;
  return el.$el != null ? el.$el : el;
}

function setGridTileRef(index, el) {
  const node = refToDom(el);
  if (node) gridTileRefs.value[index] = node;
  else gridTileRefs.value[index] = undefined;
}

function getGridTileElByIndex(index) {
  const byRef = gridTileRefs.value[index];
  if (byRef) return byRef;
  const host = getLetterGridRef();
  const child = host?.children?.[index];
  if (!(child instanceof HTMLElement)) return undefined;
  const tileEl = child.querySelector(".grid-tile");
  return tileEl instanceof HTMLElement ? tileEl : child;
}

/**
 * 仅在下落/补牌动画结束后调用：清掉 GSAP 写在格子上的 opacity/transform。
 * 飞字过程中不要对格子 clearProps("opacity")，否则会抹掉 Vue 绑定的幽灵透明度导致闪烁。
 * @param {HTMLElement | null | undefined} el
 */
function clearGridTileGsapAfterDrop(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, { clearProps: "opacity,transform" });
}

/**
 * 提交离场动画结束后清掉 GSAP 写在 `.word-slot-tile` 上的 opacity/transform。
 * @param {HTMLElement | null | undefined} el
 */
function clearWordSlotGsapAfterSubmitLeave(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, { clearProps: "opacity,transform,y,scale" });
}

/** @param {number} slotCount */
function beginSubmitWordLeaveHide(slotCount) {
  submitWordLeaveHiddenCount.value = Math.max(0, Math.round(Number(slotCount)) || 0);
}

function endSubmitWordLeaveHide() {
  submitWordLeaveHiddenCount.value = 0;
}

/** 与 css `.letter-grid-cell--placeholder` 一致；离场动画在 cell 外包层 tween，避免盖掉 tile 材质 */

function getGridCellElByIndex(index) {
  const host = getLetterGridRef();
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

function setWordSlotRef(index, el) {
  const node = refToDom(el);
  if (node) {
    wordSlotRefs[index] = node;
    applySlotStyleFromCurrentPosition(index, node);
  } else {
    wordSlotRefs[index] = undefined;
  }
}

function getSelectedGridTileElsInOrder() {
  const list = [];
  for (const pos of selectedOrder.value) {
    const el = getGridTileElByIndex(pos.row * COLS + pos.col);
    if (el) list.push(el);
  }
  return list;
}

const wordSlotFly = useWordSlotFly({
  grid: {
    grid,
    selectedOrder,
    selectedTiles,
    selectTile,
    removeFromSlot,
    removeSingleTileFromWord,
    finalizeCeruleanBellSlotIndex,
    ceruleanBellSlotIndex,
    COLS,
  },
  dom: {
    getWordSlotsWrapRef,
    getGridTileElByIndex,
    getGridTileRef: (index) => gridTileRefs.value[index],
    getWordSlotRef: (index) => wordSlotRefs[index],
    refToDom,
    clearGridTileGsapAfterDrop,
  },
  presentation,
  gates,
  ui,
  callbacks,
  firstWordTutorial: fwt,
  getSlotScaleRuntime: () => slotLayoutBridge.slotScaleRuntime,
  getSlotLayoutRpx: () => slotLayoutBridge.slotLayoutRpx,
  refreshSlotLayoutRpx: () => {
    slotLayoutBridge.slotLayoutRpx =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
    return slotLayoutBridge.slotLayoutRpx;
  },
  ensureSlotRafRunning: () => slotLayoutBridge.ensureSlotRafRunning(),
  updateSlotPositions: (deltaMs) => slotLayoutBridge.updateSlotPositions(deltaMs),
  commitFlyInSlotPosition,
  getSubmitWordLeaveHiddenCount: () => submitWordLeaveHiddenCount.value,
});

const {
  flyingLetters,
  flyingBackBatches,
  flyingBackList,
  flyingLettersForRender,
  wordDragReturnAnimSlot,
  getScaledSlotRect,
  syncFlyingInTargets,
  waitForFlyingInIdle,
  waitForFlyingBackIdle,
  getFlyingBackMinSlotIndex,
  finalizeFlyingBackBatchesImmediately,
  isSlotContentHidden,
  isSlotOutOfFlow,
  isTileFlying,
  setFlyingInRef,
  cancelAllFlyingIn,
  startOneMoveIn,
  startOneMoveOut,
  animateWordTileReturnToGrid,
} = wordSlotFly;

/** 棋盘格已选 / 飞入中 / 拖动占位：半透明 ghost */
function isGridTilePlaceholder(row, col, tile) {
  if (tileDragActive.value && tileDragSource.value?.zone === "grid") {
    const s = tileDragSource.value;
    if (s.row === row && s.col === col) return true;
  }
  if (wordDragReturnAnimSlot.value != null) {
    const pos = selectedOrder.value[wordDragReturnAnimSlot.value];
    if (pos && pos.row === row && pos.col === col) return true;
  }
  return tile?.selected === true || isTileFlying(row, col);
}

/** @param {object} tile */
function captureGridPlaceholderFreeze(tile) {
  if (!tile?.id) return;
  const id = String(tile.id);
  if (gridPlaceholderFreezeByTileId.has(id)) return;
  const ghost = presentation.vowelGhostForTile(tile, { skipLiveWordResolve: true });
  gridPlaceholderFreezeByTileId.set(id, {
    letter: tile.letter,
    rarity: tile.rarity,
    materialId: tile.materialId ?? null,
    accessoryId: tile.accessoryId ?? null,
    treasureAccessoryId: tile.treasureAccessoryId ?? null,
    tileScoreBonus: Number(tile.tileScoreBonus) || 0,
    tileMultBonus: Number(tile.letterMultBonus) || 0,
    bossTileDebuffed: tile.bossTileDebuffed === true,
    ceruleanBellLocked: tile.ceruleanBellLocked === true,
    // 占位 ghost 不展示折角；字母离格时标记随飞字离开棋盘格
    playerMarked: false,
    bossGridBlocked: tile.bossGridBlocked === true,
    vowelGhostPrev: ghost?.prev ?? null,
    vowelGhostNext: ghost?.next ?? null,
  });
}

/** @param {string | number | null | undefined} tileId */
function releaseGridPlaceholderFreeze(tileId) {
  if (tileId == null) return;
  gridPlaceholderFreezeByTileId.delete(String(tileId));
}

/** 提交占位期间同步冻结快照（如海绵擦除材质/配饰后刷新棋盘外观）。 */
function patchGridPlaceholderFreezeFromTile(tile) {
  if (!tile?.id) return;
  const frozen = gridPlaceholderFreezeByTileId.get(String(tile.id));
  if (!frozen) return;
  const ghost = presentation.vowelGhostForTile(tile, { skipLiveWordResolve: true });
  frozen.letter = tile.letter;
  frozen.rarity = tile.rarity;
  frozen.materialId = tile.materialId ?? null;
  frozen.accessoryId = tile.accessoryId ?? null;
  frozen.treasureAccessoryId = tile.treasureAccessoryId ?? null;
  frozen.tileScoreBonus = Number(tile.tileScoreBonus) || 0;
  frozen.tileMultBonus = Number(tile.letterMultBonus) || 0;
  frozen.bossTileDebuffed = tile.bossTileDebuffed === true;
  frozen.ceruleanBellLocked = tile.ceruleanBellLocked === true;
  frozen.bossGridBlocked = tile.bossGridBlocked === true;
  frozen.vowelGhostPrev = ghost?.prev ?? null;
  frozen.vowelGhostNext = ghost?.next ?? null;
}

function syncGridPlaceholderFreezeCaptures() {
  /** @type {Set<string>} */
  const activeIds = new Set();
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = g[r]?.[c];
      if (!tile) continue;
      if (isGridTilePlaceholder(r, c, tile)) {
        activeIds.add(String(tile.id));
        captureGridPlaceholderFreeze(tile);
      }
    }
  }
  for (const id of gridPlaceholderFreezeByTileId.keys()) {
    if (!activeIds.has(id)) releaseGridPlaceholderFreeze(id);
  }
}

/** @param {object} tile */
function gridPlaceholderFrozenPresentation(tile) {
  if (!tile?.id) return null;
  return gridPlaceholderFreezeByTileId.get(String(tile.id)) ?? null;
}

/** @param {object} tile @param {number} index */


function writeWordSlotsScaleCss(scale) {
  const scaleRoot = getWordSlotsScaleRootRef();
  if (!scaleRoot) return;
  if (Math.abs(scale - slotScaleCssWritten) < SLOT_SCALE_SETTLE_EPS) return;
  scaleRoot.style.setProperty("--slot-scale", String(scale));
  slotScaleCssWritten = scale;
}

function ensureSlotRafRunning() {
  if (slotRafId) return;
  slotRafLastTime = performance.now();
  slotRafId = requestAnimationFrame(slotRafLoop);
}

/** @param {number} t */
function setSlotRafLastTime(t) {
  slotRafLastTime = t;
}

function onWordSlotsLayoutResize() {
  refreshSlotLayoutRpx();
  ensureSlotRafRunning();
  updateSlotPositions(true);
}

function wordSlotPlaceholderKey(displayIndex) {
  const exit = wordDragPhExit.value;
  if (exit && displayIndex === exit.slotIndex) {
    const src = tileDragSource.value;
    if (src?.zone === "grid") return `ph-ins-exit-${exit.slotIndex}`;
    if (src?.zone === "word") return `ph-word-exit-${exit.slotIndex}`;
  }
  const src = tileDragSource.value;
  if (src?.zone === "grid") return "ph-grid-insert";
  if (src?.zone === "word") return `ph-word-${src.slotIndex}`;
  return `ph-${displayIndex}`;
}

function isWordSlotDragPlaceholderAt(displayIndex, presentations) {
  if (!tileDragActive.value || !tileDragGhostPresentation.value) return false;
  return displayIndex >= 0 && displayIndex < presentations.length && !presentations[displayIndex];
}

/** 从拼词区拖出时，留在原槽位的 placeholder（非 word 内重排插入位） */
function isWordSourceOriginDragPlaceholderAt(displayIndex, presentations) {
  const src = tileDragSource.value;
  if (!tileDragActive.value || !src || src.zone !== "word") return false;
  if (displayIndex !== src.slotIndex) return false;
  return isWordSlotDragPlaceholderAt(displayIndex, presentations);
}

function initialWordSlotPhScale(displayIndex, presentations) {
  if (!isWordSlotPhVisualAt(displayIndex, presentations)) return 1;
  if (isWordSourceOriginDragPlaceholderAt(displayIndex, presentations)) return 1;
  return 0;
}

function resolveWordSlotPhScaleTarget(displayIndex, presentations) {
  const exit = wordDragPhExit.value;
  if (exit && exit.slotIndex === displayIndex && !presentations[displayIndex]) return 0;
  if (isWordSlotDragPlaceholderAt(displayIndex, presentations)) return 1;
  return 1;
}

function isWordSlotPhVisualAt(displayIndex, presentations) {
  const exit = wordDragPhExit.value;
  if (exit && exit.slotIndex === displayIndex && !presentations[displayIndex]) return true;
  return isWordSlotDragPlaceholderAt(displayIndex, presentations);
}

function ensureSlotPhScale(index, scale) {
  while (slotPhScales.length <= index) slotPhScales.push(1);
  slotPhScales[index] = scale;
}

function tryCompleteWordDragPhExit() {
  const exit = wordDragPhExit.value;
  if (!exit) return;
  const idx = exit.slotIndex;
  if ((slotPhScales[idx] ?? 1) > SLOT_PH_SCALE_SETTLE_EPS) return;
  const slotIndex = exit.slotIndex;
  const src = tileDragSource.value;
  const base = presentation.getWordSlotTilePresentations();
  wordDragPhExit.value = null;
  if (src?.zone === "word" && tileDragHoverZone.value === "grid") {
    const prevPres = buildWordDragPreviewSlots(base, slotIndex, slotIndex);
    const nextPres = base.filter((_, i) => i !== slotIndex);
    remapSlotPositionsAfterShuffleAndSync(prevPres, nextPres);
  } else if (src?.zone === "grid") {
    const prevPres = buildInsertDragPreviewSlots(base, slotIndex);
    remapSlotPositionsAfterShuffleAndSync(prevPres, base);
  }
  lastWordDragPresentations = displayWordSlotPresentations.value;
  ensureSlotRafRunning();
}

/**
 * 拖动预览重排后，按 tile id 保留各槽当前像素位置，使字母块滑到新槽位而非瞬移。
 * @param {readonly (object | null)[]} prevPresentations
 * @param {readonly (object | null)[]} nextPresentations
 */
/** grid 插入预览：hoverIdx 无效时与 displayWordSlotPresentations 一致，落末尾 */
function resolveGridInsertHoverIndex(hoverIdx, baseLength) {
  return hoverIdx >= 0 ? hoverIdx : baseLength;
}

function remapSlotPositionsAfterShuffle(prevPresentations, nextPresentations) {
  while (slotCurrentPositions.length < nextPresentations.length) {
    const idx = slotCurrentPositions.length;
    let insertAt = -1;
    if (nextPresentations.length === prevPresentations.length + 1) {
      for (let i = 0; i < nextPresentations.length; i += 1) {
        if (!nextPresentations[i] && (i >= prevPresentations.length || prevPresentations[i])) {
          insertAt = i;
          break;
        }
      }
    }
    const refIdx = insertAt >= 0 && insertAt <= idx
      ? Math.max(0, insertAt - 1)
      : idx - 1;
    const prev = refIdx >= 0 ? slotCurrentPositions[refIdx] : null;
    const gapPos = {
      x: prev?.x ?? 0,
      y: prev?.y ?? 0,
      w: prev?.w ?? 0,
      h: prev?.h ?? 0,
    };
    if (insertAt >= 0 && insertAt <= idx) {
      slotCurrentPositions.splice(insertAt, 0, { ...gapPos });
      slotPhScales.splice(insertAt, 0, 1);
      slotPhPrevActive.splice(insertAt, 0, false);
    } else {
      slotCurrentPositions.push({ ...gapPos });
      slotPhScales.push(1);
      slotPhPrevActive.push(false);
    }
  }
  const n = Math.min(
    prevPresentations.length,
    nextPresentations.length,
    slotCurrentPositions.length,
  );
  if (n <= 0) return;
  /** @type {Map<string, { x: number, y: number, w: number, h: number }>} */
  const posByTileId = new Map();
  for (let i = 0; i < prevPresentations.length; i += 1) {
    const entry = prevPresentations[i];
    const cur = slotCurrentPositions[i];
    if (entry?.id && cur) {
      posByTileId.set(entry.id, { x: cur.x, y: cur.y, w: cur.w, h: cur.h });
    }
  }
  for (let i = 0; i < nextPresentations.length; i += 1) {
    const entry = nextPresentations[i];
    const cur = slotCurrentPositions[i];
    if (!entry?.id || !cur) continue;
    const p = posByTileId.get(entry.id);
    if (!p) continue;
    cur.x = p.x;
    cur.y = p.y;
    cur.w = p.w;
    cur.h = p.h;
  }
  while (slotCurrentPositions.length > nextPresentations.length) slotCurrentPositions.pop();
  while (slotPhScales.length > nextPresentations.length) slotPhScales.pop();
  while (slotPhPrevActive.length > nextPresentations.length) slotPhPrevActive.pop();
}

/** remap 后于 nextTick 写入 DOM，避免 v-for 重排前 ref 错位导致首帧闪动 */
function applySlotStyleFromCurrentPosition(index, el) {
  const cur = slotCurrentPositions[index];
  if (!el || !cur) return;
  el.style.left = `${cur.x}px`;
  el.style.top = `${cur.y}px`;
  el.style.width = `${cur.w}px`;
  el.style.height = `${cur.h}px`;
}

function applySlotStylesFromCurrentPositions() {
  for (let i = 0; i < slotCurrentPositions.length; i += 1) {
    applySlotStyleFromCurrentPosition(i, wordSlotRefs[i]);
  }
}

/** 飞字落地瞬间：用 GSAP 终点矩形预写槽位，避免词槽首帧 flex 布局与飞字终点不一致 */
function commitFlyInSlotPosition(item) {
  const toRect = item?.toRect;
  if (!toRect) return;
  const wrapEl = getWordSlotsWrapRef();
  if (!wrapEl) return;
  refreshSlotLayoutRpx();
  const wrapRect = wrapEl.getBoundingClientRect();
  const idx = item.targetSlotIndex;
  if (idx < 0) return;
  while (slotCurrentPositions.length <= idx) {
    slotCurrentPositions.push({ x: 0, y: 0, w: 0, h: 0 });
    slotPhScales.push(1);
    slotPhPrevActive.push(false);
  }
  slotCurrentPositions[idx] = {
    x: toRect.left - wrapRect.left,
    y: toRect.top - wrapRect.top,
    w: toRect.width,
    h: toRect.height,
  };
}

function remapSlotPositionsAfterShuffleAndSync(prevPresentations, nextPresentations) {
  remapSlotPositionsAfterShuffle(prevPresentations, nextPresentations);
  nextTick(() => {
    applySlotStylesFromCurrentPositions();
    ensureSlotRafRunning();
  });
}

/** 计算目标并写 DOM；deltaMs 为数字时用 expo.out 风格插值，为 true 时直接 snap（首帧防闪） */
function updateSlotPositions(deltaMs) {
  const wrapEl = getWordSlotsWrapRef();
  if (!wrapEl) return;
  refreshSlotLayoutRpx();
  const wrapRect = wrapEl.getBoundingClientRect();
  const N = resolveWordSlotLayoutCount();
  const presentations = displayWordSlotPresentations.value;
  const batches = flyingBackBatches.value;
  const effectiveNumSlots =
    batches.length > 0
      ? Math.min(...batches.map((b) => b.slotIndex))
      : N + flyingLetters.value.length;
  const scaleFromSlotCount = resolveWordSlotScaleSlotCount();
  if (N === 0) {
    slotCurrentPositions.length = 0;
    slotPhScales.length = 0;
    slotPhPrevActive.length = 0;
    return;
  }
  while (slotCurrentPositions.length < N) {
    const idx = slotCurrentPositions.length;
    const layoutSlots = batches.length > 0 ? effectiveNumSlots : N + flyingLetters.value.length;
    const slotIdx = batches.length > 0 && idx >= effectiveNumSlots ? effectiveNumSlots - 1 : idx;
    const r = getScaledSlotRect(wrapRect, layoutSlots, slotIdx, scaleFromSlotCount);
    if (!r) break;
    const tgtW = r.width;
    const tgtH = r.height;
    slotCurrentPositions.push({
      x: r.left - wrapRect.left,
      y: r.top - wrapRect.top,
      w: tgtW,
      h: tgtH,
    });
    slotPhScales.push(initialWordSlotPhScale(idx, presentations));
    slotPhPrevActive.push(false);
  }
  while (slotCurrentPositions.length > N) slotCurrentPositions.pop();
  while (slotPhScales.length > N) slotPhScales.pop();
  while (slotPhPrevActive.length > N) slotPhPrevActive.pop();
  const targets = [];
  for (let i = 0; i < N; i++) {
    const outOfFlow = batches.some((b) => i >= b.slotIndex);
    if (outOfFlow) {
      targets.push({ x: 0, y: 0, w: 0, h: 0 });
      continue;
    }
    const r = getScaledSlotRect(wrapRect, effectiveNumSlots, i, scaleFromSlotCount);
    if (!r) break;
    targets.push({
      x: r.left - wrapRect.left,
      y: r.top - wrapRect.top,
      w: r.width,
      h: r.height,
    });
  }
  const dt = deltaMs === true ? 1 : (deltaMs || 16) / SLOT_EXPO_TIME_MS;
  const factor = deltaMs === true ? 1 : 1 - Math.pow(2, -10 * Math.min(dt, 1));
  const phActiveNow = [];
  const submitLeaveHiddenCount = submitWordLeaveHiddenCount.value;
  for (let i = 0; i < N; i++) {
    const outOfFlow = batches.some((b) => i >= b.slotIndex);
    const submitLeaveHidden = submitLeaveHiddenCount > 0 && i < submitLeaveHiddenCount;
    const el = wordSlotRefs[i];
    const phVisual = isWordSlotPhVisualAt(i, presentations);
    phActiveNow[i] = phVisual;
    if (phVisual && !slotPhPrevActive[i]) {
      slotPhScales[i] = isWordSourceOriginDragPlaceholderAt(i, presentations) ? 1 : 0;
    }
    const phTarget = resolveWordSlotPhScaleTarget(i, presentations);
    if (phVisual) {
      slotPhScales[i] = (slotPhScales[i] ?? 0) + (phTarget - (slotPhScales[i] ?? 0)) * factor;
    } else {
      slotPhScales[i] = 1;
    }
    if (outOfFlow) {
      continue;
    }
    const cur = slotCurrentPositions[i];
    const tgt = targets[i];
    if (!cur || !tgt) continue;
    cur.x += (tgt.x - cur.x) * factor;
    cur.y += (tgt.y - cur.y) * factor;
    cur.w += (tgt.w - cur.w) * factor;
    cur.h += (tgt.h - cur.h) * factor;
    if (el) {
      el.style.left = cur.x + "px";
      el.style.top = cur.y + "px";
      el.style.width = cur.w + "px";
      el.style.height = cur.h + "px";
      const skipSlotPresentationStyles =
        submitLeaveHidden || gates.scoringAnimating.value || gates.gridRefillAnimating.value;
      if (skipSlotPresentationStyles) {
        // 计分离场 / 补牌 GSAP 正在写 opacity/transform；勿在此处清 inline 样式导致频闪
      } else if (phVisual) {
        const phScale = slotPhScales[i] ?? 1;
        el.style.setProperty("--slot-ph-scale", String(phScale));
        // 行内写入以盖过 GSAP 留在 .word-slot-tile 上的 opacity（对齐棋盘 cell 外包层做法）
        el.style.opacity = String(0.42 * phScale);
        if (phScale < 1 - SLOT_PH_SCALE_SETTLE_EPS) {
          el.style.transform = `scale(${phScale})`;
          el.style.transformOrigin = "center center";
        } else {
          el.style.transform = "";
          el.style.transformOrigin = "";
        }
      } else {
        el.style.removeProperty("--slot-ph-scale");
        el.style.removeProperty("opacity");
        el.style.transform = "";
        el.style.transformOrigin = "";
      }
    }
  }
  slotPhPrevActive.length = 0;
  for (let i = 0; i < phActiveNow.length; i += 1) {
    slotPhPrevActive.push(!!phActiveNow[i]);
  }
  tryCompleteWordDragPhExit();
}

slotLayoutBridge.ensureSlotRafRunning = ensureSlotRafRunning;
slotLayoutBridge.updateSlotPositions = updateSlotPositions;
slotLayoutBridge.slotScaleRuntime = slotScaleRuntime;

function isSlotLayoutSettled() {
  const targetScale = slotScaleTarget.value;
  if (Math.abs(slotScaleRuntime - targetScale) > SLOT_SCALE_SETTLE_EPS) return false;
  const N = resolveWordSlotLayoutCount();
  if (N === 0) return true;
  const wrapEl = getWordSlotsWrapRef();
  if (!wrapEl) return true;
  const wrapRect = wrapEl.getBoundingClientRect();
  const presentations = displayWordSlotPresentations.value;
  const batches = flyingBackBatches.value;
  const effectiveNumSlots =
    batches.length > 0
      ? Math.min(...batches.map((b) => b.slotIndex))
      : N + flyingLetters.value.length;
  const scaleFromSlotCount = resolveWordSlotScaleSlotCount();
  for (let i = 0; i < N; i++) {
    if (batches.some((b) => i >= b.slotIndex)) continue;
    const r = getScaledSlotRect(wrapRect, effectiveNumSlots, i, scaleFromSlotCount);
    const cur = slotCurrentPositions[i];
    if (!r || !cur) return false;
    const tgtX = r.left - wrapRect.left;
    const tgtY = r.top - wrapRect.top;
    const tgtW = r.width;
    const tgtH = r.height;
    if (
      Math.abs(cur.x - tgtX) > SLOT_POS_SETTLE_EPS
      || Math.abs(cur.y - tgtY) > SLOT_POS_SETTLE_EPS
      || Math.abs(cur.w - tgtW) > SLOT_POS_SETTLE_EPS
      || Math.abs(cur.h - tgtH) > SLOT_POS_SETTLE_EPS
    ) {
      return false;
    }
    const phTarget = resolveWordSlotPhScaleTarget(i, presentations);
    if (Math.abs((slotPhScales[i] ?? 1) - phTarget) > SLOT_PH_SCALE_SETTLE_EPS) return false;
  }
  if (wordDragPhExit.value) return false;
  return true;
}

function slotRafLoop() {
  slotRafId = 0;
  if (ui.isGamePaused()) {
    slotRafLastTime = 0;
    return;
  }
  const now = performance.now();
  const delta = slotRafLastTime ? Math.min(now - slotRafLastTime, 50) : 0;
  slotRafLastTime = now;
  updateSlotPositions(delta);
  const dt = delta === 0 ? 1 : delta / SLOT_EXPO_TIME_MS;
  const factor = delta === 0 ? 1 : 1 - Math.pow(2, -10 * Math.min(dt, 1));
  slotScaleRuntime += (slotScaleTarget.value - slotScaleRuntime) * factor;
  slotLayoutBridge.slotScaleRuntime = slotScaleRuntime;
  writeWordSlotsScaleCss(slotScaleRuntime);
  if (!isSlotLayoutSettled()) {
    slotRafId = requestAnimationFrame(slotRafLoop);
    return;
  }
  slotScaleRuntime = slotScaleTarget.value;
  slotLayoutBridge.slotScaleRuntime = slotScaleRuntime;
  const scaleRoot = getWordSlotsScaleRootRef();
  if (scaleRoot) {
    scaleRoot.style.setProperty("--slot-scale", String(slotScaleRuntime));
    slotScaleCssWritten = slotScaleRuntime;
  }
}

function canUseTileDrag() {
  if (gates.dictFatalError.value) return false;
  if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return false;
  if (gates.scoringAnimating.value || gates.gridRefillAnimating.value) return false;
  if (gates.wordSelectionSwapBusy.value) return false;
  if (flyingLetters.value.length > 0 || flyingBackBatches.value.length > 0) return false;
  if (wordDragReturnAnimSlot.value != null) return false;
  return true;
}

function resolveTileDragWordSlotCount() {
  return resolveWordDragTargetPresentations().length;
}

/** 词槽布局槽数：拖动预览与 word→grid 回格飞行动画期间与展示列表一致 */
function resolveWordSlotLayoutCount() {
  if (tileDragActive.value) return resolveTileDragWordSlotCount();
  if (wordDragReturnAnimSlot.value != null) {
    return Math.max(0, selectedOrder.value.length - 1);
  }
  const flyMin = getFlyingBackMinSlotIndex();
  if (flyMin != null) return flyMin;
  const baseCount = selectedOrder.value.length;
  if (
    submitScoringAppendPresentations.value.length > 0 &&
    !tileDragActive.value &&
    wordDragReturnAnimSlot.value == null
  ) {
    return baseCount + submitScoringAppendPresentations.value.length;
  }
  return baseCount;
}

/** 计分追加 S 期间：pop 动画阶段缩放仍按原词长；弹出完成后按完整词长（含 S）缩小 */
function resolveWordSlotScaleSlotCount() {
  const appendLen = submitScoringAppendPresentations.value.length;
  if (
    appendLen > 0 &&
    submitScoringAppendScaleLocked.value &&
    !tileDragActive.value &&
    wordDragReturnAnimSlot.value == null
  ) {
    const batches = flyingBackBatches.value;
    if (batches.length > 0) {
      return Math.min(...batches.map((b) => b.slotIndex));
    }
    return Math.max(1, selectedOrder.value.length);
  }
  const N = resolveWordSlotLayoutCount();
  const batches = flyingBackBatches.value;
  return batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : N + flyingLetters.value.length;
}

function resolveTileDragWordSlotRect(index, layoutCountOverride) {
  const wrapEl = getWordSlotsWrapRef();
  if (!wrapEl) return null;
  const wrapRect = wrapEl.getBoundingClientRect();
  if (wrapRect.width <= 0 || wrapRect.height <= 0) return null;
  const numSlots = layoutCountOverride ?? resolveTileDragWordSlotCount();
  if (index < 0 || index >= numSlots) return null;
  return getScaledSlotRect(wrapRect, numSlots, index);
}

const tileDragGhostPresentation = shallowRef(/** @type {object | null} */ (null));

const {
  dragActive: tileDragActive,
  dragSource: tileDragSource,
  dragHoverWordIndex: tileDragHoverWordIndex,
  dragHoverZone: tileDragHoverZone,
  dragMoved: tileDragMoved,
  dragGhostVisible: tileDragGhostVisible,
  dragGridPlaceholderVisible: tileDragGridPlaceholderVisible,
  dragGhostStyle: tileDragGhostStyle,
  dragGridPlaceholderStyle: tileDragGridPlaceholderStyle,
  onGridTilePointerDown: onTileDragGridPointerDown,
  onWordSlotPointerDown: onTileDragWordPointerDown,
  buildDragPreviewSlots: buildWordDragPreviewSlots,
} = useTileDrag({
  canDrag: canUseTileDrag,
  getWordSlotCount: () => selectedOrder.value.length,
  getWordSlotRect: (index) => resolveTileDragWordSlotRect(index),
  getWordSlotRectForLayout: (index, layoutCount) => resolveTileDragWordSlotRect(index, layoutCount),
  getWordSlotElement: (index) => wordSlotRefs[index] ?? null,
  isWordSlotDragPlaceholder: (index) => {
    if (!tileDragActive.value) return false;
    const pres = displayWordSlotPresentations.value;
    return index >= 0 && index < pres.length && !pres[index];
  },
  getWordOverlayContainer: () => getWordSlotsWrapRef(),
  getGridOverlayContainer: () => getLetterGridWrapRef(),
  getGridTileElement: (i) => gridTileRefs.value[i] ?? getGridTileElByIndex(i),
  getGridCellCount: () => ROWS * COLS,
  getGridCols: () => COLS,
  getWordHitArea: () => getWordSlotsWrapRef(),
  getGridHitArea: () => getLetterGridWrapRef(),
  getDragTilePresentation: () => tileDragGhostPresentation.value,
  canStartFromSource: (source) => {
    if (source.zone === "grid") {
      const tile = grid.value[source.row]?.[source.col];
      if (!tile || tile.selected || tile.bossGridBlocked) return false;
      if (tile.ceruleanBellLocked === true) return false;
      if (isTileFlying(source.row, source.col)) return false;
      return true;
    }
    const order = selectedOrder.value;
    if (source.slotIndex < 0 || source.slotIndex >= order.length) return false;
    if (ceruleanBellSlotIndex.value != null && source.slotIndex <= ceruleanBellSlotIndex.value) {
      return false;
    }
    if (isSlotOutOfFlow(source.slotIndex)) return false;
    return true;
  },
  getWordSourceHomeFlatIndex: () => {
    const src = tileDragSource.value;
    if (!src || src.zone !== "word") return -1;
    const pos = selectedOrder.value[src.slotIndex];
    if (!pos) return -1;
    return pos.row * COLS + pos.col;
  },
  onDragStarted: (pointerId) => {
    detail.markTilePrimaryTapConsumed(pointerId);
    detail.clearTileLongPressArm();
  },
  onCommitGridToWord: (row, col, wordIndex) => {
    if (insertSelectedTileAt(row, col, wordIndex)) {
      ui.triggerHaptic("selection");
      nextTick(() => updateSlotPositions(true));
    }
  },
  onCommitWordReorder: (from, to) => {
    if (reorderSelectedOrder(from, to)) {
      ui.triggerHaptic("selection");
      nextTick(() => updateSlotPositions(true));
    }
  },
  onCommitWordToGrid: (slotIndex, clientX, clientY, ghost) => {
    animateWordTileReturnToGrid(slotIndex, clientX, clientY, ghost);
  },
});

watch(
  () => [
    selectedOrder.value.map((p) => `${p.row},${p.col}`).join("|"),
    flyingLetters.value.map((f) => `${f.id}:${f.pendingRow},${f.pendingCol}`).join("|"),
    wordDragReturnAnimSlot.value,
    tileDragActive.value,
    tileDragSource.value?.zone,
    tileDragSource.value?.row,
    tileDragSource.value?.col,
    tileDragSource.value?.slotIndex,
  ],
  () => syncGridPlaceholderFreezeCaptures(),
  { flush: "sync" },
);

/** 目标槽数（移出时用 effectiveNumSlots，与 updateSlotPositions 一致） */
const slotScaleTarget = computed(() => {
  const n = resolveWordSlotScaleSlotCount();
  if (n === 0) return 1;
  const total = n * SLOT_TILE_W + (n - 1) * SLOT_GAP;
  return Math.min(1, MIDDLE_MAX_W / total);
});

watch(
  () => [
    selectedOrder.value.length,
    flyingLetters.value.length,
    flyingBackBatches.value.length,
    wordDragReturnAnimSlot.value,
    submitScoringAppendPresentations.value.length,
    slotScaleTarget.value,
  ],
  () => ensureSlotRafRunning(),
);

watch([tileDragActive, tileDragSource], () => {
  if (!tileDragActive.value || !tileDragSource.value) {
    tileDragGhostPresentation.value = null;
    wordDragPhExit.value = null;
    lastWordDragPresentations = null;
    return;
  }
  const src = tileDragSource.value;
  if (src.zone === "word") {
    tileDragGhostPresentation.value = presentation.getWordSlotTilePresentations()[src.slotIndex] ?? null;
    return;
  }
  const tile = grid.value[src.row]?.[src.col];
  if (!tile) {
    tileDragGhostPresentation.value = null;
    return;
  }
  const flyPres = presentation.computeFlyInTilePresentation(tile);
  tileDragGhostPresentation.value = {
    ...tile,
    letter: flyPres.letter,
    rarity: flyPres.rarity,
    vowelGhostPrev: flyPres.vowelGhostPrev,
    vowelGhostNext: flyPres.vowelGhostNext,
  };
});

/** 拖动预览槽列表：仅由当前悬停意图与 phExit 决定，与历史路径无关 */
function resolveWordDragTargetPresentations() {
  const base = presentation.getWordSlotTilePresentations();
  const returnSlot = wordDragReturnAnimSlot.value;
  /** @type {readonly (object | null)[]} */
  let result;
  if (returnSlot != null) {
    result = base.filter((_, i) => i !== returnSlot);
  } else if (!tileDragActive.value || !tileDragSource.value) {
    result = base;
  } else {
    const src = tileDragSource.value;
    const zone = tileDragHoverZone.value;
    const hover = tileDragHoverWordIndex.value;
    const exit = wordDragPhExit.value;

    if (exit) {
      if (src.zone === "word") {
        result = buildWordDragPreviewSlots(base, exit.slotIndex, exit.slotIndex);
      } else {
        result = buildInsertDragPreviewSlots(base, exit.slotIndex);
      }
    } else if (zone === "word") {
      if (src.zone === "grid") {
        result = buildInsertDragPreviewSlots(base, resolveGridInsertHoverIndex(hover, base.length));
      } else {
        const targetHover = hover >= 0 ? hover : src.slotIndex;
        result = buildWordDragPreviewSlots(base, src.slotIndex, targetHover);
      }
    } else if (zone === "grid" && src.zone === "word") {
      result = base.filter((_, i) => i !== src.slotIndex);
    } else if (src.zone === "word") {
      result = buildWordDragPreviewSlots(base, src.slotIndex, src.slotIndex);
    } else {
      result = base;
    }
  }

  const flyMin = getFlyingBackMinSlotIndex();
  if (flyMin != null) {
    result = result.slice(0, flyMin);
  }
  if (
    submitScoringAppendPresentations.value.length > 0 &&
    !tileDragActive.value &&
    wordDragReturnAnimSlot.value == null &&
    flyMin == null
  ) {
    result = [
      ...result,
      ...submitScoringAppendPresentations.value.map((t) => ({ ...t })),
    ];
  }
  return result;
}

const displayWordSlotPresentations = computed(() => resolveWordDragTargetPresentations());

function syncWordDragLayoutFromHover(prev) {
  if (!tileDragActive.value) {
    wordDragPhExit.value = null;
    lastWordDragPresentations = null;
    return;
  }

  const zone = tileDragHoverZone.value;
  const src = tileDragSource.value;
  const srcZone = src?.zone;
  const slotIndex = src?.slotIndex;
  const hoverIdx = tileDragHoverWordIndex.value;
  const prevZone = prev?.[1];
  const prevHover = prev?.[4] ?? -1;

  if (srcZone === "word" && slotIndex != null) {
    if (zone === "grid" && prevZone !== "grid") {
      wordDragPhExit.value = { slotIndex };
      ensureSlotPhScale(slotIndex, 1);
    } else if (zone === "word" && prevZone === "grid") {
      wordDragPhExit.value = null;
    } else if (zone !== "grid" && zone !== "word" && wordDragPhExit.value?.slotIndex === slotIndex) {
      wordDragPhExit.value = null;
    }
  } else if (srcZone === "grid") {
    if (prevZone === "word" && zone !== "word") {
      const base = presentation.getWordSlotTilePresentations();
      const exitSlot = resolveGridInsertHoverIndex(prevHover, base.length);
      wordDragPhExit.value = { slotIndex: exitSlot };
      ensureSlotPhScale(exitSlot, 1);
    } else if (zone === "word" && prevZone !== "word") {
      wordDragPhExit.value = null;
    }
  }

  const nextPres = displayWordSlotPresentations.value;
  if (lastWordDragPresentations) {
    remapSlotPositionsAfterShuffleAndSync(lastWordDragPresentations, nextPres);
  }
  lastWordDragPresentations = nextPres;

  if (zone === "word" && prevZone === "word" && hoverIdx >= 0 && prevHover !== hoverIdx) {
    if (slotPhPrevActive.length > hoverIdx) slotPhPrevActive[hoverIdx] = false;
  }

  ensureSlotRafRunning();
}

watch(
  () => [
    tileDragActive.value,
    tileDragHoverZone.value,
    tileDragSource.value?.zone,
    tileDragSource.value?.slotIndex,
    tileDragHoverWordIndex.value,
  ],
  (curr, prev) => {
    syncWordDragLayoutFromHover(prev);
  },
  { flush: "sync" },
);

watch(
  () => [
    tileDragActive.value,
    displayWordSlotPresentations.value.length,
    tileDragHoverWordIndex.value,
    tileDragHoverZone.value,
    wordDragReturnAnimSlot.value,
    wordDragPhExit.value,
  ],
  () => ensureSlotRafRunning(),
);

function onGridTileContextMenu(e, row, col, tile) {
  detail.clearTileLongPressArm();
  if (!detail.canOpenTileDetail()) return;
  if (!tile || tile.selected || isTileFlying(row, col)) return;
  const p = detail.buildTileDetailPayloadFromTile(tile);
  const origin =
    detail.tileOriginRectFromElement(e?.currentTarget) ?? detail.tileOriginRectFromElement(getGridTileElByIndex(row * COLS + col));
  if (p) detail.openTileDetail(p, origin);
}

function onGridTileCombinedPointerDown(e, row, col, tile) {
  if (ui.isFirstWordTutorialBlockingInput() && !fwt.allowsTileClick(row, col)) return;
  onTileDragGridPointerDown(row, col, e);
  onGridTileDetailPointerDown(e, row, col, tile);
}

function onGridTileDetailPointerDown(e, row, col, tile) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (!tile || gates.dictFatalError.value) return;
  if (ui.isFirstWordTutorialBlockingInput() && !fwt.allowsTileClick(row, col)) return;
  if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return;
  if (gates.scoringAnimating.value || gates.gridRefillAnimating.value) return;
  if (tile.selected || isTileFlying(row, col)) return;
  detail.armTilePrimaryTap(e, () => onTileClick(row, col, tile));
  detail.armTileLongPressFromPointer(e, () => {
    if (!detail.canOpenTileDetail()) return;
    const t = grid.value[row]?.[col];
    if (!t || t.selected || isTileFlying(row, col)) return;
    const p = detail.buildTileDetailPayloadFromTile(t);
    if (p) {
      const origin = detail.tileOriginRectFromElement(getGridTileElByIndex(row * COLS + col));
      detail.openTileDetail(p, origin);
    }
  });
}

/** @param {PointerEvent} e */
function onGridTilePointerUp(e, row, col, tile) {
  detail.clearTileLongPressArm();
  if (!tile) return;
  detail.tryCompleteTilePrimaryTap(e);
}

function onWordSlotContextMenu(e, i) {
  detail.clearTileLongPressArm();
  if (!detail.canOpenTileDetail()) return;
  const p = detail.buildWordSlotTileDetailPayload(i);
  const slotEl = wordSlotRefs[i];
  const inner = slotEl?.querySelector?.(".word-slot-content");
  const origin = detail.tileOriginRectFromElement(inner ?? slotEl);
  if (p) detail.openTileDetail(p, origin, detail.buildWordSlotPreviewNav(i));
}

function orderIndexForWordSlotEntry(entry) {
  if (!entry?.id) return -1;
  return presentation.getWordSlotTilePresentations().findIndex((p) => p?.id === entry.id);
}

function onWordSlotCombinedPointerDown(e, displayIndex) {
  const entry = displayWordSlotPresentations.value[displayIndex];
  const orderIndex = entry ? orderIndexForWordSlotEntry(entry) : displayIndex;
  if (orderIndex < 0) return;
  onTileDragWordPointerDown(orderIndex, e);
  onWordSlotDetailPointerDown(e, orderIndex);
}

function onWordSlotDetailPointerDown(e, i) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (ui.isFirstWordTutorialBlockingInput()) return;
  if (gates.dictFatalError.value) return;
  if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return;
  if (gates.scoringAnimating.value) return;
  const order = selectedOrder.value;
  if (i < 0 || i >= order.length) return;
  detail.armTilePrimaryTap(e, () => onSlotClick(i));
  detail.armTileLongPressFromPointer(e, () => {
    if (!detail.canOpenTileDetail()) return;
    const order2 = selectedOrder.value;
    if (i < 0 || i >= order2.length) return;
    const p = detail.buildWordSlotTileDetailPayload(i);
    if (p) {
      const slotEl = wordSlotRefs[i];
      const inner = slotEl?.querySelector?.(".word-slot-content");
      const origin = detail.tileOriginRectFromElement(inner ?? slotEl);
      detail.openTileDetail(p, origin, detail.buildWordSlotPreviewNav(i));
    }
  });
}

/** @param {PointerEvent} e */
function onWordSlotPointerUp(e, i) {
  detail.clearTileLongPressArm();
  detail.tryCompleteTilePrimaryTap(e);
}

function onTileClick(row, col, tile) {
    if (!tile) return;
  if (ui.isFirstWordTutorialBlockingInput()) {
    if (!fwt.allowsTileClick(row, col)) return;
  }
  if (tileDragMoved.value) {
    tileDragMoved.value = false;
    return;
  }
  if (gates.suppressTilePrimaryClick.value) {
    gates.suppressTilePrimaryClick.value = false;
    return;
  }
  if (gates.dictFatalError.value) return;
  if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return;
  if (gates.scoringAnimating.value || gates.gridRefillAnimating.value) return;
  if (gates.wordSelectionSwapBusy.value) return;
  if (tile.selected) return;
  if (tile.ceruleanBellLocked === true) return;
  if (isTileFlying(row, col)) return;
  startOneMoveIn(row, col, tile);
}

function onSlotClick(i) {
  if (ui.isFirstWordTutorialBlockingInput()) return;
  if (tileDragMoved.value) {
    tileDragMoved.value = false;
    return;
  }
  if (gates.suppressTilePrimaryClick.value) {
    gates.suppressTilePrimaryClick.value = false;
    return;
  }
  if (gates.dictFatalError.value) return;
  if (gates.transitionBusy.value || gates.showShop.value || ui.isRunFlowOverlayOpen()) return;
  if (gates.scoringAnimating.value) return;
  if (gates.wordSelectionSwapBusy.value) return;
  const order = selectedOrder.value;
  if (i < 0 || i >= order.length) return;
  startOneMoveOut(i);
}

function disposeSlotRaf() {
    if (slotRafId) {
      cancelAnimationFrame(slotRafId);
      slotRafId = 0;
    }
    slotRafLastTime = 0;
  }

  const gridRender = createPlayfieldGridRender({
    grid,
    COLS,
    isGridTilePlaceholder,
    tileDragActive,
    tileDragSource,
    gridPlaceholderFrozenPresentation,
    gridTileLetterForRender: render.gridTileLetterForRender,
    gridTileRarityForRender: render.gridTileRarityForRender,
    gridTileVowelGhostForRender: render.gridTileVowelGhostForRender,
  });

  const wordAux = createPlayfieldWordAux({
    grid,
    selectedOrder,
    ceruleanBellSlotIndex,
    ROWS,
    COLS,
    touchGrid,
    scheduleRunAutoSave: callbacks.scheduleRunAutoSave,
    onCeruleanBellNewGridLock: callbacks.onCeruleanBellNewGridLock,
    ensureCeruleanBellMarkedOnGrid,
    findCeruleanBellLockedTileOnGrid,
    finalizeCeruleanBellSlotIndex,
    selectTile,
    startOneMoveIn,
    startOneMoveOut,
    cancelAllFlyingIn,
    finalizeFlyingBackBatchesImmediately,
    waitForFlyingInIdle,
    waitForFlyingBackIdle,
    getFlyingBackMinSlotIndex,
    syncFlyingInTargets,
    updateSlotPositions,
    isTileFlying,
    isTileInFlyingBackFromWord: presentation.isTileInFlyingBackFromWord,
    flyingLetters,
    gridTileRefs,
    getGridTileElByIndex,
    getWordSlotsWrapRef,
    dictFatalError: gates.dictFatalError,
    transitionBusy: gates.transitionBusy,
    showShop: gates.showShop,
    scoringAnimating: gates.scoringAnimating,
    gridRefillAnimating: gates.gridRefillAnimating,
    wordSelectionSwapBusy: gates.wordSelectionSwapBusy,
    isRunFlowOverlayOpen: ui.isRunFlowOverlayOpen,
    firstWordTutorialActive,
    showToast: ui.showToast,
    triggerHaptic: ui.triggerHaptic,
  });

  const wordHint = createPlayfieldWordHint({
    grid,
    selectedOrder,
    ceruleanBellSlotIndex,
    hintRemaining,
    getHintMaxThisLevel: () => resolveHintMaxPerLevel(hintDeps.runPresetId.value),
    ROWS,
    COLS,
    dictFatalError: gates.dictFatalError,
    dictionaryReady: gates.dictionaryReady,
    getCandidateWordsByLength,
    resolveWordPattern: (pattern) =>
      resolveWordPattern(
        pattern,
        "?",
        hintDeps.rarityLevelsByRarity.value,
        hintDeps.buildBossWildcardResolveContext(),
      ),
    buildBossResolveContext: () => hintDeps.buildBossWildcardResolveContext(),
    getSpellCountsByLength: () => hintDeps.spellCountsByLength.value,
    getHintLengthWeightShift: () => getPresetHintLengthWeightShift(hintDeps.runPresetId.value),
    getJudgedLengthTableLenForRun: hintDeps.judgedLengthTableLenForRun,
    getLengthLevelsByLength: () => hintDeps.lengthLevelsByLength.value,
    findCeruleanBellLockedTileOnGrid,
    getWordHintMode,
    getGridTileElByIndex,
    transitionBusy: gates.transitionBusy,
    showShop: gates.showShop,
    scoringAnimating: gates.scoringAnimating,
    gridRefillAnimating: gates.gridRefillAnimating,
    wordSelectionSwapBusy: gates.wordSelectionSwapBusy,
    isRunFlowOverlayOpen: ui.isRunFlowOverlayOpen,
    firstWordTutorialActive,
    getFirstWordTutorialPhase: () => fwt.phase.value,
    scheduleTutorialSpotlightUpdate: callbacks.scheduleTutorialSpotlightUpdate,
    showToast: ui.showToast,
    triggerHaptic: ui.triggerHaptic,
    cancelAllFlyingIn,
    finalizeFlyingBackBatchesImmediately,
    startOneMoveOut,
    startOneMoveIn,
    waitForFlyingInIdle,
    waitForFlyingBackIdle,
    updateSlotPositions,
    flyingLetters,
  });

  async function tryCeruleanBellFlyInAfterGridStable() {
    await wordAux.tryCeruleanBellFlyInAfterGridStable();
    wordHint.refreshWordHintAfterGridStable();
  }

  async function tryCeruleanBellMarkAfterGridStable() {
    await wordAux.tryCeruleanBellMarkAfterGridStable();
    wordHint.refreshWordHintAfterGridStable();
  }

  /** @type {Record<string, unknown> | null} */
  let playfieldViewExtras = null;

  /** @param {Record<string, unknown>} extras */
  function initViewContext(extras) {
    playfieldViewExtras = extras;
  }

  function buildViewContext() {
    if (!playfieldViewExtras) {
      throw new Error("usePlayfieldController: initViewContext must be called before buildViewContext");
    }
    return createPlayfieldViewContext(
      assemblePlayfieldViewContext(playfieldViewExtras, {
        ROWS,
        COLS,
        displayWordSlotPresentations,
        tileDragActive,
        wordSlotPlaceholderKey,
        setWordSlotRef,
        isSlotOutOfFlow,
        onSlotClick,
        onWordSlotContextMenu,
        onWordSlotCombinedPointerDown,
        onWordSlotPointerUp,
        onTilePointerCancel: detail.onTilePointerCancel,
        tileDragGhostPresentation,
        tileDragGhostVisible,
        tileDragGhostStyle,
        flyingLettersForRender,
        setFlyingInRef,
        isSlotContentHidden,
        flatGrid: gridRender.flatGrid,
        isGridTilePlaceholder,
        gridTileRenderMemoDeps: gridRender.gridTileRenderMemoDeps,
        gridTileRenderLetter: gridRender.gridTileRenderLetter,
        gridTileRenderRarity: gridRender.gridTileRenderRarity,
        gridPlaceholderFrozenPresentation,
        gridTileRenderVowelGhostPrev: gridRender.gridTileRenderVowelGhostPrev,
        gridTileRenderVowelGhostNext: gridRender.gridTileRenderVowelGhostNext,
        setGridTileRef,
        isTileFlying,
        onTileClick,
        onGridTileContextMenu,
        onGridTileCombinedPointerDown,
        onGridTilePointerUp,
        tileDragGridPlaceholderVisible,
        tileDragGridPlaceholderStyle,
        showMarkButtonInRun: wordAux.showMarkButtonInRun,
        showSwapWordButtonInRun: wordAux.showSwapWordButtonInRun,
        canUseMarkButton: wordAux.canUseMarkButton,
        markButtonTitle: wordAux.markButtonTitle,
        onMarkButtonClick: wordAux.onMarkButtonClick,
        showMarkSendArrow: wordAux.showMarkSendArrow,
        canSwapWordSelection: wordAux.canSwapWordSelection,
        swapWordButtonTitle: wordAux.swapWordButtonTitle,
        onSwapWordSelectionClick: wordAux.onSwapWordSelectionClick,
        showHintButtonInRun: wordHint.showHintButtonInRun,
        hintButtonMuted: wordHint.hintButtonMuted,
        hintWordAlreadyActive: wordHint.hintWordAlreadyActive,
        hintButtonDimmed: wordHint.hintButtonDimmed,
        canUseHintButton: wordHint.canUseHintButton,
        hintButtonTitle: wordHint.hintButtonTitle,
        onHintButtonClick: wordHint.onHintButtonClick,
        flyingLetters,
        flyingBackBatches,
      }),
    );
  }

  return {
    initViewContext,
    buildViewContext,
    flyingLetters,
    flyingBackBatches,
    flyingLettersForRender,
    flyingBackList,
    gridTileRefs,
    wordSlotRefs,
    wordDragReturnAnimSlot,
    wordDragPhExit,
    tileDragActive,
    tileDragSource,
    tileDragHoverWordIndex,
    tileDragHoverZone,
    tileDragMoved,
    tileDragGhostVisible,
    tileDragGridPlaceholderVisible,
    tileDragGhostStyle,
    tileDragGridPlaceholderStyle,
    tileDragGhostPresentation,
    displayWordSlotPresentations,
    setSubmitScoringAppendPresentation,
    setSubmitScoringAppendPresentations,
    setSubmitScoringAppendScaleLocked,
    setGridTileRef,
    getGridTileElByIndex,
    setWordSlotRef,
    clearGridTileGsapAfterDrop,
    clearWordSlotGsapAfterSubmitLeave,
    beginSubmitWordLeaveHide,
    endSubmitWordLeaveHide,
    onWordSlotsLayoutResize,
    disposeSlotRaf,
    onTileClick,
    onSlotClick,
    startOneMoveIn,
    startOneMoveOut,
    setFlyingInRef,
    cancelAllFlyingIn,
    onGridTileContextMenu,
    onGridTileCombinedPointerDown,
    onGridTilePointerUp,
    onWordSlotContextMenu,
    onWordSlotCombinedPointerDown,
    onWordSlotPointerUp,
    onTilePointerCancel: detail.onTilePointerCancel,
    onTileDragGridPointerDown,
    onTileDragWordPointerDown,
    buildWordDragPreviewSlots,
    clearTileLongPressArm: detail.clearTileLongPressArm,
    armTileLongPressFromPointer: detail.armTileLongPressFromPointer,
    isTileFlying,
    isGridTilePlaceholder,
    isSlotContentHidden,
    isSlotOutOfFlow,
    wordSlotPlaceholderKey,
    gridPlaceholderFrozenPresentation,
    patchGridPlaceholderFreezeFromTile,
    syncGridPlaceholderFreezeCaptures,
    updateSlotPositions,
    ensureSlotRafRunning,
    setSlotRafLastTime,
    syncFlyingInTargets,
    waitForFlyingInIdle,
    waitForFlyingBackIdle,
    getFlyingBackMinSlotIndex,
    finalizeFlyingBackBatchesImmediately,
    animateWordTileReturnToGrid,
    getSelectedGridCellElsInOrder,
    getSelectedGridTileElsInOrder,
    refToDom,
    ...gridRender,
    ...wordAux,
    tryCeruleanBellFlyInAfterGridStable,
    tryCeruleanBellMarkAfterGridStable,
    refreshWordHintAfterGridStable: wordHint.refreshWordHintAfterGridStable,
    notifyWordSubmitStarted: wordHint.notifyWordSubmitStarted,
    tryConsumeHintOnSuccessfulSubmit: wordHint.tryConsumeHintOnSuccessfulSubmit,
    showHintButtonInRun: wordHint.showHintButtonInRun,
    hintButtonMuted: wordHint.hintButtonMuted,
    hintWordAlreadyActive: wordHint.hintWordAlreadyActive,
    hintButtonDimmed: wordHint.hintButtonDimmed,
    canUseHintButton: wordHint.canUseHintButton,
    hintButtonTitle: wordHint.hintButtonTitle,
    onHintButtonClick: wordHint.onHintButtonClick,
  };
}
