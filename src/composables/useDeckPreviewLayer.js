import { computed, nextTick, ref, watch } from "vue";
import gsap from "gsap";
import { usePanelScrollbar } from "./usePanelScrollbar.js";
import {
  killDeckLayerEnter,
  playDeckLayerEnter,
  prepareDeckLayerEnter,
} from "../game/deckLayerEnterAnim.js";
import {
  countDeckStackMaterialTiles,
  deckExpandHitRestingOpacity,
  deckStackMaterialAnimateEnabled,
  deckStackPileCellStyle,
  deckStackPileRotationDeg,
} from "../game/deckStackPileLayout.js";
import {
  DECK_LAYER_SCROLLBAR_GAP_RPX,
  DECK_LAYER_SCROLLBAR_MIN_THUMB_RPX,
  DECK_LAYER_SCROLLBAR_OVERFLOW_PX,
  DECK_LAYER_SCROLLBAR_THUMB_INSET_RPX,
  DECK_LAYER_SCROLLBAR_TRACK_RPX,
} from "../game/deckLayerScrollMetrics.js";
import { repaintUnpaintedMaterialCanvasesIn } from "../lib/reglMaterialHub.js";
import {
  createPreviewNavGroupFromItems,
  withPreviewNavKind,
} from "../preview/previewGroupNav.js";

/**
 * @typedef {Object} DeckPreviewLayerDeps
 * @property {import('vue').Ref<boolean>} [showDeckLayer]
 * @property {import('vue').Ref<object[][]>} grid
 * @property {import('vue').ComputedRef<unknown[]>} deckStacksView
 * @property {import('vue').Ref<number>} deckCount
 * @property {import('vue').Ref<unknown[]>} initialDeckSnapshot
 * @property {import('vue').Ref<Map<unknown, string>>} gridTileLetterForRender
 * @property {import('vue').Ref<Map<unknown, string>>} gridTileRarityForRender
 * @property {import('../runSession/controllers/useOverlayStackController.js').OverlayStackController} overlayStack
 * @property {() => boolean} canOpenTileDetail
 * @property {(payload: object, originRect?: DOMRect | null, previewNav?: object | null) => void} openTileDetail
 * @property {(tile: object) => object} buildTileDetailPayloadFromTile
 * @property {(card: object) => object} buildTileDetailPayloadFromDeckCard
 * @property {(el: unknown) => DOMRect | null | undefined} tileOriginRectFromElement
 * @property {(e: PointerEvent, fn: () => void) => void} armTileLongPressFromPointer
 * @property {() => void} clearTileLongPressArm
 * @property {import('vue').Ref<boolean>} suppressTilePrimaryClick
 * @property {import('vue').Ref<boolean>} dictFatalError
 * @property {(card: object) => string} deckCardRaw
 * @property {(raw: string) => string} resolveLetterFromRaw
 * @property {(raw: string) => string} getRarityForLetter
 * @property {(accessoryId: unknown, treasureAccessoryId: unknown) => object} normalizeExclusiveTileAccessoryPair
 */

function readDeckLayerRpx() {
  if (typeof document === "undefined") return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx")) || 1;
}

/**
 * 字母库浮层：scroll/expand/enter anim + 堆叠展开 FLIP（S.2 / 任务 6.4）。
 *
 * @param {DeckPreviewLayerDeps} deps
 */
export function useDeckPreviewLayer(deps) {
  const {
    showDeckLayer: showDeckLayerExternal,
    grid,
    deckStacksView,
    deckCount,
    initialDeckSnapshot,
    gridTileLetterForRender,
    gridTileRarityForRender,
    overlayStack,
    canOpenTileDetail,
    openTileDetail,
    buildTileDetailPayloadFromTile,
    buildTileDetailPayloadFromDeckCard,
    tileOriginRectFromElement,
    armTileLongPressFromPointer,
    clearTileLongPressArm,
    suppressTilePrimaryClick,
    dictFatalError,
    deckCardRaw,
    resolveLetterFromRaw,
    getRarityForLetter,
    normalizeExclusiveTileAccessoryPair,
  } = deps;

  const showDeckLayer = showDeckLayerExternal ?? ref(false);
  const deckLayerRemainingCount = computed(() =>
    Math.max(0, Math.floor(Number(deckCount.value) || 0)),
  );
  const deckLayerTotalCount = computed(() => {
    const snap = initialDeckSnapshot.value;
    return Array.isArray(snap) ? snap.filter((c) => c && typeof c === "object").length : 0;
  });
  const deckLayerInnerRef = ref(/** @type {HTMLElement | null} */ (null));
  const deckLayerEnterBoot = ref(false);
  const deckLayerScrollOuterRef = ref(/** @type {HTMLElement | null} */ (null));
  const deckLayerGridContentRef = ref(/** @type {HTMLElement | null} */ (null));

  const deckLayerScrollChromeStyle = computed(() => ({
    "--dl-scroll-track-w": `calc(${DECK_LAYER_SCROLLBAR_TRACK_RPX} * var(--rpx))`,
    "--dl-scroll-track-gap": `calc(${DECK_LAYER_SCROLLBAR_GAP_RPX} * var(--rpx))`,
    "--dl-scroll-thumb-inset": `calc(${DECK_LAYER_SCROLLBAR_THUMB_INSET_RPX} * var(--rpx))`,
  }));

  const {
    scrollBodyRef: deckLayerScrollBodyRef,
    scrollTrackRef: deckLayerScrollTrackRef,
    scrollbarVisible: deckLayerGridNeedsScroll,
    thumbDragging: deckLayerThumbDragging,
    thumbStyle: deckLayerThumbStyle,
    onScrollBody: onDeckLayerScrollBody,
    onThumbPointerDown: onDeckLayerThumbPointerDown,
    onTrackPointerDown: onDeckLayerTrackPointerDown,
    updateScrollbarMetrics: updateDeckLayerScrollbarMetrics,
    bindResizeObserver: bindDeckLayerScrollbarObserver,
  } = usePanelScrollbar({
    thumbColor: "rgba(255, 255, 255, 0.42)",
    contentRef: deckLayerGridContentRef,
    overflowThreshold: DECK_LAYER_SCROLLBAR_OVERFLOW_PX,
    minThumbPx: () => DECK_LAYER_SCROLLBAR_MIN_THUMB_RPX * readDeckLayerRpx(),
    trackInset: () => DECK_LAYER_SCROLLBAR_THUMB_INSET_RPX * readDeckLayerRpx(),
  });

  function onDeckLayerGridScroll() {
    if (deckLayerGridNeedsScroll.value) onDeckLayerScrollBody();
  }

  function syncDeckLayerScrollbar() {
    updateDeckLayerScrollbarMetrics();
  }

  /** @type {ResizeObserver | null} */
  let deckLayerGridResizeObserver = null;

  function bindDeckLayerGridResizeObserver() {
    deckLayerGridResizeObserver?.disconnect();
    deckLayerGridResizeObserver = null;
    const body = deckLayerScrollBodyRef.value;
    const outer = deckLayerScrollOuterRef.value;
    if (!(body instanceof HTMLElement)) return;
    if (typeof ResizeObserver === "undefined") return;
    deckLayerGridResizeObserver = new ResizeObserver(() => syncDeckLayerScrollbar());
    deckLayerGridResizeObserver.observe(body);
    if (outer instanceof HTMLElement) deckLayerGridResizeObserver.observe(outer);
    const content = deckLayerGridContentRef.value;
    if (content instanceof HTMLElement) deckLayerGridResizeObserver.observe(content);
    bindDeckLayerScrollbarObserver();
  }

  function refreshDeckLayerMaterialCanvases() {
    const root = deckLayerInnerRef.value;
    if (root instanceof HTMLElement) repaintUnpaintedMaterialCanvasesIn(root);
  }

  const deckStackExpandRaw = ref(/** @type {string | null} */ (null));
  const deckExpandScrollOuterRef = ref(/** @type {HTMLElement | null} */ (null));
  const deckExpandGridContentRef = ref(/** @type {HTMLElement | null} */ (null));

  const {
    scrollBodyRef: deckExpandScrollBodyRef,
    scrollTrackRef: deckExpandScrollTrackRef,
    scrollbarVisible: deckExpandGridNeedsScroll,
    thumbDragging: deckExpandThumbDragging,
    thumbStyle: deckExpandThumbStyle,
    onScrollBody: onDeckExpandScrollBody,
    onThumbPointerDown: onDeckExpandThumbPointerDown,
    onTrackPointerDown: onDeckExpandTrackPointerDown,
    updateScrollbarMetrics: updateDeckExpandScrollbarMetrics,
    bindResizeObserver: bindDeckExpandScrollbarObserver,
  } = usePanelScrollbar({
    thumbColor: "rgba(255, 255, 255, 0.42)",
    contentRef: deckExpandGridContentRef,
    overflowThreshold: DECK_LAYER_SCROLLBAR_OVERFLOW_PX,
    minThumbPx: () => DECK_LAYER_SCROLLBAR_MIN_THUMB_RPX * readDeckLayerRpx(),
    trackInset: () => DECK_LAYER_SCROLLBAR_THUMB_INSET_RPX * readDeckLayerRpx(),
  });

  function onDeckExpandGridScroll() {
    if (deckExpandGridNeedsScroll.value) onDeckExpandScrollBody();
  }

  function syncDeckExpandScrollbar() {
    updateDeckExpandScrollbarMetrics();
  }

  function setDeckLayerInnerRef(el) {
    deckLayerInnerRef.value = el;
  }
  function setDeckLayerScrollOuterRef(el) {
    deckLayerScrollOuterRef.value = el;
  }
  function setDeckLayerScrollBodyRef(el) {
    deckLayerScrollBodyRef.value = el;
  }
  function setDeckLayerGridContentRef(el) {
    deckLayerGridContentRef.value = el;
  }
  function setDeckLayerScrollTrackRef(el) {
    deckLayerScrollTrackRef.value = el;
  }
  function setDeckLayerExpandScrollOuterRef(el) {
    deckExpandScrollOuterRef.value = el;
  }
  function setDeckLayerExpandScrollBodyRef(el) {
    deckExpandScrollBodyRef.value = el;
  }
  function setDeckLayerExpandGridContentRef(el) {
    deckExpandGridContentRef.value = el;
  }
  function setDeckLayerExpandScrollTrackRef(el) {
    deckExpandScrollTrackRef.value = el;
  }

  /** @type {ResizeObserver | null} */
  let deckExpandGridResizeObserver = null;

  function bindDeckExpandGridResizeObserver() {
    deckExpandGridResizeObserver?.disconnect();
    deckExpandGridResizeObserver = null;
    const body = deckExpandScrollBodyRef.value;
    const outer = deckExpandScrollOuterRef.value;
    if (!(body instanceof HTMLElement)) return;
    if (typeof ResizeObserver === "undefined") return;
    deckExpandGridResizeObserver = new ResizeObserver(() => syncDeckExpandScrollbar());
    deckExpandGridResizeObserver.observe(body);
    if (outer instanceof HTMLElement) deckExpandGridResizeObserver.observe(outer);
    const content = deckExpandGridContentRef.value;
    if (content instanceof HTMLElement) deckExpandGridResizeObserver.observe(content);
    bindDeckExpandScrollbarObserver();
  }

  const deckExpandFlipSourceBtnRef = ref(/** @type {HTMLElement | null} */ (null));
  const deckExpandFlipFromRects = ref(
    /** @type {Array<{ left: number; top: number; width: number; height: number }> | null} */ (null),
  );
  /** @type {gsap.core.Timeline | null} */
  let deckExpandFlipTl = null;

  const deckExpandedStack = computed(() => {
    const r = deckStackExpandRaw.value;
    if (r == null) return null;
    return deckStacksView.value.find((s) => s.raw === r) ?? null;
  });

  function deckStackMaterialTileCount(stack) {
    return countDeckStackMaterialTiles(stack, deckEntryTileProps);
  }

  function deckStackMaterialAnimate(stack) {
    if (!stack?.raw || deckStackExpandRaw.value !== stack.raw) return false;
    return deckStackMaterialAnimateEnabled(true, deckStackMaterialTileCount(stack));
  }

  const deckExpandedStackMaterialAnimate = computed(() => {
    const stack = deckExpandedStack.value;
    if (!stack) return false;
    return deckStackMaterialAnimateEnabled(true, deckStackMaterialTileCount(stack));
  });

  watch(deckStackExpandRaw, async (raw) => {
    if (raw == null) {
      deckExpandGridResizeObserver?.disconnect();
      deckExpandGridResizeObserver = null;
      deckExpandFlipTl?.kill();
      deckExpandFlipTl = null;
      deckExpandFlipFromRects.value = null;
      deckExpandFlipSourceBtnRef.value = null;
      return;
    }
    await nextTick();
    bindDeckExpandGridResizeObserver();
    syncDeckExpandScrollbar();
    requestAnimationFrame(() => {
      runDeckExpandEnterFlip();
      syncDeckExpandScrollbar();
      refreshDeckLayerMaterialCanvases();
    });
  });

  watch(showDeckLayer, async (open, prev) => {
    if (open) {
      overlayStack.openDeckPortal();
      deckLayerEnterBoot.value = true;
      await nextTick();
      const inner = deckLayerInnerRef.value;
      if (inner) prepareDeckLayerEnter(inner);
      deckLayerEnterBoot.value = false;
      bindDeckLayerGridResizeObserver();
      syncDeckLayerScrollbar();
      requestAnimationFrame(() => {
        if (deckLayerInnerRef.value) playDeckLayerEnter(deckLayerInnerRef.value);
        syncDeckLayerScrollbar();
        refreshDeckLayerMaterialCanvases();
        requestAnimationFrame(refreshDeckLayerMaterialCanvases);
      });
    } else if (prev) {
      deckLayerGridResizeObserver?.disconnect();
      deckLayerGridResizeObserver = null;
      overlayStack.closeDeckPortal();
      killDeckLayerEnter(deckLayerInnerRef.value);
      deckExpandFlipTl?.kill();
      deckExpandFlipTl = null;
      deckStackExpandRaw.value = null;
    }
  });

  watch(deckStacksView, () => {
    if (!showDeckLayer.value) return;
    nextTick(() => {
      syncDeckLayerScrollbar();
      refreshDeckLayerMaterialCanvases();
    });
  });

  function captureDeckStackPileRects(btnEl) {
    const cells = btnEl?.querySelectorAll?.(".deck-stack-pile-cell");
    if (!cells?.length) return /** @type {{ left: number; top: number; width: number; height: number }[]} */ ([]);
    return [...cells].map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
  }

  function applyDeckExpandHitRestingOpacity(hitEl) {
    if (!(hitEl instanceof HTMLElement)) return;
    gsap.set(hitEl, { opacity: deckExpandHitRestingOpacity(hitEl) });
  }

  function runDeckExpandEnterFlip() {
    const scrollEl = deckExpandScrollBodyRef.value;
    const from = deckExpandFlipFromRects.value;
    if (deckStackExpandRaw.value == null || !scrollEl || !from?.length) return;
    const hits = scrollEl.querySelectorAll(".deck-expand-tile-hit");
    if (hits.length !== from.length) {
      deckExpandFlipFromRects.value = null;
      for (const h of hits) applyDeckExpandHitRestingOpacity(h);
      return;
    }
    deckExpandFlipTl?.kill();
    const hitArr = [...hits];
    const tl = gsap.timeline({
      onComplete: () => {
        deckExpandFlipTl = null;
        for (const h of hitArr) {
          gsap.set(h, { clearProps: "transform" });
          applyDeckExpandHitRestingOpacity(h);
        }
      },
    });
    deckExpandFlipTl = tl;
    const nFlip = hitArr.length;
    hitArr.forEach((hit, i) => {
      const fr = from[i];
      const tr = hit.getBoundingClientRect();
      const dx = fr.left - tr.left + (fr.width - tr.width) / 2;
      const dy = fr.top - tr.top + (fr.height - tr.height) / 2;
      const sx = fr.width / Math.max(1e-6, tr.width);
      const sy = fr.height / Math.max(1e-6, tr.height);
      const s = Math.min(sx, sy);
      const fromRot = deckStackPileRotationDeg(nFlip, i);
      const restingOp = deckExpandHitRestingOpacity(hit);
      gsap.set(hit, { transformOrigin: "50% 50%" });
      tl.fromTo(
        hit,
        { x: dx, y: dy, scale: s, rotation: fromRot, opacity: restingOp * 0.88 },
        { x: 0, y: 0, scale: 1, rotation: 0, opacity: restingOp, duration: 0.4, ease: "expo.out" },
        i * 0.006,
      );
    });
  }

  function runDeckExpandLeaveFlip(onDone) {
    const scrollEl = deckExpandScrollBodyRef.value;
    const btn = deckExpandFlipSourceBtnRef.value;
    const fromSaved = deckExpandFlipFromRects.value;
    if (!scrollEl || !btn || !fromSaved?.length) {
      onDone();
      return;
    }
    const hits = scrollEl.querySelectorAll(".deck-expand-tile-hit");
    const cells = btn.querySelectorAll(".deck-stack-pile-cell");
    if (hits.length !== fromSaved.length || cells.length !== hits.length) {
      onDone();
      return;
    }
    const hitArr = [...hits];
    const toRects = [...cells].map((el) => el.getBoundingClientRect());
    deckExpandFlipTl?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        deckExpandFlipTl = null;
        for (const h of hitArr) gsap.killTweensOf(h);
        onDone();
      },
    });
    deckExpandFlipTl = tl;
    const nFlip = hitArr.length;
    hitArr.forEach((hit, i) => {
      const tr = hit.getBoundingClientRect();
      const fr = toRects[i];
      const dx = fr.left - tr.left + (fr.width - tr.width) / 2;
      const dy = fr.top - tr.top + (fr.height - tr.height) / 2;
      const sx = fr.width / Math.max(1e-6, tr.width);
      const sy = fr.height / Math.max(1e-6, tr.height);
      const s = Math.min(sx, sy);
      const toRot = deckStackPileRotationDeg(nFlip, i);
      gsap.set(hit, { transformOrigin: "50% 50%" });
      tl.to(
        hit,
        { x: dx, y: dy, scale: s, rotation: toRot, opacity: 0.22, duration: 0.34, ease: "expo.inOut" },
        i * 0.006,
      );
    });
  }

  function onDeckLayerBackdropClick() {
    if (deckStackExpandRaw.value != null) {
      closeDeckStackDetail();
      return;
    }
    closeDeckLayer();
  }

  function closeDeckLayer() {
    showDeckLayer.value = false;
  }

  function openDeckLayer() {
    showDeckLayer.value = true;
  }

  function openDeckStackDetail(stack, evt) {
    if (!stack || stack.isGhost) return;
    deckExpandFlipTl?.kill();
    deckExpandFlipTl = null;
    const btn = /** @type {HTMLElement | undefined} */ (evt?.currentTarget);
    deckExpandFlipSourceBtnRef.value = btn ?? null;
    deckExpandFlipFromRects.value = btn ? captureDeckStackPileRects(btn) : null;
    deckStackExpandRaw.value = stack.raw;
  }

  function closeDeckStackDetail() {
    if (deckStackExpandRaw.value == null) return;
    runDeckExpandLeaveFlip(() => {
      deckStackExpandRaw.value = null;
    });
  }

  function deckEntryKey(entry, idx) {
    if (entry.kind === "grid") return `g-${entry.row}-${entry.col}-${idx}`;
    const uid = entry.card?._dcUid;
    if (entry.kind === "spent") return `s-${uid ?? entry.raw}-${idx}`;
    return `d-${uid ?? entry.raw}-${idx}`;
  }

  function resolveDeckTileAccessoryFields(accessoryId, treasureAccessoryId) {
    return normalizeExclusiveTileAccessoryPair(accessoryId, treasureAccessoryId);
  }

  function deckEntryTileProps(entry) {
    if (entry.kind === "grid") {
      const t = grid.value[entry.row]?.[entry.col];
      if (!t?.letter) return null;
      const id = t.id;
      const letter =
        id != null && gridTileLetterForRender.value.has(id)
          ? gridTileLetterForRender.value.get(id)
          : t.letter;
      const rarity =
        id != null && gridTileRarityForRender.value.has(id)
          ? gridTileRarityForRender.value.get(id)
          : t.rarity;
      const accessoryFields = resolveDeckTileAccessoryFields(t.accessoryId, t.treasureAccessoryId);
      return {
        letter,
        rarity: String(rarity || "common"),
        materialId: t.materialId ?? null,
        accessoryId: accessoryFields.accessoryId,
        treasureAccessoryId: accessoryFields.treasureAccessoryId,
        tileScoreBonus: Math.max(0, Math.floor(Number(t.tileScoreBonus) || 0)),
        tileMultBonus: Math.max(0, Math.round(Number(t.letterMultBonus) || 0)),
      };
    }
    if ((entry.kind === "deck" || entry.kind === "spent") && entry.card && typeof entry.card === "object") {
      const card = entry.card;
      const raw = deckCardRaw(card);
      const isWc = card.isWildcard === true;
      const letter = isWc ? "?" : resolveLetterFromRaw(raw || "e");
      const rarity =
        card.rarity != null && String(card.rarity).trim() !== ""
          ? String(card.rarity)
          : getRarityForLetter(isWc ? "e" : raw || "a");
      const accessoryFields = resolveDeckTileAccessoryFields(card.accessoryId, card.treasureAccessoryId);
      return {
        letter,
        rarity: String(rarity || "common"),
        materialId: isWc ? "wildcard" : card.materialId ?? null,
        accessoryId: accessoryFields.accessoryId,
        treasureAccessoryId: accessoryFields.treasureAccessoryId,
        tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
        tileMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
      };
    }
    const raw = entry.raw;
    const letter = raw === "?" ? "?" : resolveLetterFromRaw(raw);
    return {
      letter,
      rarity: getRarityForLetter(raw),
      materialId: null,
      accessoryId: null,
      treasureAccessoryId: null,
      tileScoreBonus: 0,
      tileMultBonus: 0,
    };
  }

  function buildDeckMultisetTileDetailPayload(raw) {
    const r = String(raw ?? "").toLowerCase();
    const letter = r === "?" ? "?" : r ? resolveLetterFromRaw(r) : "?";
    return {
      letter,
      rarity: getRarityForLetter(r || "a"),
      tileScoreBonus: 0,
      tileMultBonus: 0,
      materialId: null,
      materialScoreBonus: 0,
      materialMultBonus: 0,
      accessoryId: null,
      foilOverlay: false,
    };
  }

  function resolveDeckStackEntryDetail(entry) {
    if (entry.kind === "grid") {
      const t = grid.value[entry.row]?.[entry.col];
      if (!t?.letter) return null;
      return buildTileDetailPayloadFromTile(t);
    }
    if (
      (entry.kind === "deck" || entry.kind === "spent") &&
      entry.card &&
      typeof entry.card === "object"
    ) {
      return buildTileDetailPayloadFromDeckCard(entry.card);
    }
    return buildDeckMultisetTileDetailPayload(entry.raw);
  }

  function buildDeckExpandPreviewNav(entry) {
    const stack = deckExpandedStack.value;
    if (!stack) return null;
    const items = stack.entries.filter((e) => resolveDeckStackEntryDetail(e));
    return withPreviewNavKind(createPreviewNavGroupFromItems(items, (e) => e === entry), "deck-expand");
  }

  function onDeckExpandedTileClick(entry, e) {
    if (suppressTilePrimaryClick.value) {
      suppressTilePrimaryClick.value = false;
      return;
    }
    if (!canOpenTileDetail()) return;
    const p = resolveDeckStackEntryDetail(entry);
    const hit = e?.currentTarget;
    const face = hit?.querySelector?.(".deck-expand-face-tile");
    const origin = tileOriginRectFromElement(face ?? hit);
    if (p) openTileDetail(p, origin, buildDeckExpandPreviewNav(entry));
  }

  function onDeckExpandedTileContextMenu(e, entry) {
    clearTileLongPressArm();
    if (!canOpenTileDetail()) return;
    const p = resolveDeckStackEntryDetail(entry);
    const hit = e?.currentTarget;
    const face = hit?.querySelector?.(".deck-expand-face-tile");
    const origin = tileOriginRectFromElement(face ?? hit);
    if (p) openTileDetail(p, origin, buildDeckExpandPreviewNav(entry));
  }

  function onDeckExpandedTileDetailPointerDown(e, entry) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (dictFatalError.value) return;
    if (!canOpenTileDetail()) return;
    armTileLongPressFromPointer(e, () => {
      if (!canOpenTileDetail()) return;
      const p = resolveDeckStackEntryDetail(entry);
      if (p) {
        suppressTilePrimaryClick.value = true;
        const hit = e?.currentTarget;
        const face = hit?.querySelector?.(".deck-expand-face-tile");
        const origin = tileOriginRectFromElement(face ?? hit);
        openTileDetail(p, origin, buildDeckExpandPreviewNav(entry));
      }
    });
  }

  function dispose() {
    deckLayerGridResizeObserver?.disconnect();
    deckLayerGridResizeObserver = null;
    deckExpandGridResizeObserver?.disconnect();
    deckExpandGridResizeObserver = null;
    deckExpandFlipTl?.kill();
    deckExpandFlipTl = null;
    killDeckLayerEnter(deckLayerInnerRef.value);
  }

  return {
    showDeckLayer,
    deckStackExpandRaw,
    deckLayerEnterBoot,
    deckLayerScrollChromeStyle,
    deckLayerGridNeedsScroll,
    deckLayerThumbDragging,
    deckLayerThumbStyle,
    deckLayerRemainingCount,
    deckLayerTotalCount,
    deckStacksView,
    deckExpandedStack,
    deckExpandedStackMaterialAnimate,
    deckExpandGridNeedsScroll,
    deckExpandThumbDragging,
    deckExpandThumbStyle,
    setDeckLayerInnerRef,
    setDeckLayerScrollOuterRef,
    setDeckLayerScrollBodyRef,
    setDeckLayerGridContentRef,
    setDeckLayerScrollTrackRef,
    setDeckLayerExpandScrollOuterRef,
    setDeckLayerExpandScrollBodyRef,
    setDeckLayerExpandGridContentRef,
    setDeckLayerExpandScrollTrackRef,
    onDeckLayerBackdropClick,
    onDeckLayerGridScroll,
    onDeckLayerTrackPointerDown,
    onDeckLayerThumbPointerDown,
    onDeckExpandGridScroll,
    onDeckExpandTrackPointerDown,
    onDeckExpandThumbPointerDown,
    openDeckStackDetail,
    closeDeckStackDetail,
    closeDeckLayer,
    openDeckLayer,
    deckEntryKey,
    deckEntryTileProps,
    deckStackPileCellStyle,
    deckStackMaterialAnimate,
    onDeckExpandedTileClick,
    onDeckExpandedTileContextMenu,
    onDeckExpandedTileDetailPointerDown,
    resolveDeckStackEntryDetail,
    dispose,
  };
}
