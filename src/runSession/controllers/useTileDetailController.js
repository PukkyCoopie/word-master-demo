import { computed, ref } from "vue";
import {
  buildAccessoryTileDetailPayload,
  buildMaterialTileDetailPayload,
} from "../../collection/collectionPreview.js";
import {
  buildTileDetailPayloadFromDeckCard,
  buildTileDetailPayloadFromTile,
  buildWordSlotTileDetailPayload,
} from "../../game/tileDetailPayload.js";
import {
  createPreviewNavGroup,
  previewNavIndex,
  previewNavTotal,
  stepPreviewNavGroup,
  withPreviewNavKind,
} from "../../preview/previewGroupNav.js";

const TILE_LONG_PRESS_MS = 480;
const TILE_LONG_PRESS_MOVE_PX = 14;

/**
 * @param {unknown} el
 * @param {(el: unknown) => HTMLElement | undefined} refToDom
 */
function tileOriginRectFromElement(el, refToDom) {
  const node = refToDom(el) ?? (el instanceof HTMLElement ? el : null);
  if (!node || typeof node.getBoundingClientRect !== "function") return null;
  const r = node.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * @param {Object} options
 * @param {import('vue').Ref<boolean>} options.dictFatalError
 * @param {import('vue').Ref<boolean>} options.transitionBusy
 * @param {import('vue').Ref<boolean>} options.scoringAnimating
 * @param {import('vue').Ref<boolean>} options.gridRefillAnimating
 * @param {() => boolean} options.isRunFlowOverlayOpen
 * @param {(kind: string) => void} options.triggerHaptic
 * @param {(el: unknown) => HTMLElement | undefined} options.refToDom
 * @param {() => { playClose?: () => Promise<void> } | null | undefined} options.getTileDetailLayer
 * @param {() => void} [options.onOpenRunEndTileDetail]
 * @param {() => { resolveDeckStackEntryDetail: (entry: unknown) => object | null } | null} [options.getDeckPreview]
 * @param {import('../../game/tileDetailPayload.js').TileDetailPayloadContext & {
 *   getSelectedOrder: () => { row: number, col: number }[],
 *   getGrid: () => unknown[][],
 *   getWordSlotPresentations: () => object[],
 * }} options.payloadCtx
 */
export function useTileDetailController(options) {
  const tileDetailPayload = ref(null);
  const tileDetailOriginRect = ref(/** @type {{ left: number, top: number, width: number, height: number } | null} */ (null));
  /** @type {import('vue').Ref<import('../../preview/previewGroupNav.js').PreviewNavGroup<unknown> | null>} */
  const tileDetailPreviewNav = ref(null);
  const suppressTilePrimaryClick = ref(false);

  let tileLongPressTimer = null;
  let tileLongPressCleanup = null;
  /** @type {Map<number, { x: number, y: number, time: number, fire: () => void, consumed: boolean }>} */
  const tilePrimaryTapPending = new Map();

  const tileDetailPreviewNavTotal = computed(() => previewNavTotal(tileDetailPreviewNav.value));
  const tileDetailPreviewNavIndex = computed(() => previewNavIndex(tileDetailPreviewNav.value));

  function clearTileLongPressArm() {
    if (tileLongPressTimer != null) {
      clearTimeout(tileLongPressTimer);
      tileLongPressTimer = null;
    }
    if (tileLongPressCleanup) {
      tileLongPressCleanup();
      tileLongPressCleanup = null;
    }
  }

  /** @param {number} pointerId */
  function markTilePrimaryTapConsumed(pointerId) {
    const s = tilePrimaryTapPending.get(pointerId);
    if (s) s.consumed = true;
  }

  /** @param {number} pointerId */
  function clearTilePrimaryTap(pointerId) {
    tilePrimaryTapPending.delete(pointerId);
  }

  /** @param {PointerEvent} e */
  function isTouchLikePointer(e) {
    return e.pointerType === "touch" || e.pointerType === "pen";
  }

  /** @param {PointerEvent} e @param {() => void} fire */
  function armTilePrimaryTap(e, fire) {
    tilePrimaryTapPending.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      fire,
      consumed: false,
    });
  }

  /** @param {PointerEvent} e */
  function tryCompleteTilePrimaryTap(e) {
    if (!isTouchLikePointer(e)) return;
    const s = tilePrimaryTapPending.get(e.pointerId);
    tilePrimaryTapPending.delete(e.pointerId);
    if (!s || s.consumed) return;
    const dt = performance.now() - s.time;
    const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (dt >= TILE_LONG_PRESS_MS || dist > TILE_LONG_PRESS_MOVE_PX) return;
    e.preventDefault();
    suppressTilePrimaryClick.value = true;
    s.fire();
  }

  /** @param {PointerEvent} e */
  function onTilePointerCancel(e) {
    clearTileLongPressArm();
    clearTilePrimaryTap(e.pointerId);
  }

  function canOpenTileDetail() {
    if (options.dictFatalError.value) return false;
    if (options.transitionBusy.value) return false;
    if (options.isRunFlowOverlayOpen()) return false;
    if (options.scoringAnimating.value) return false;
    if (options.gridRefillAnimating.value) return false;
    return true;
  }

  function openTileDetail(payload, originRect = null, previewNav = null) {
    if (!payload) return;
    options.triggerHaptic("previewOpen");
    if (previewNav?.kind === "run-end-tile") {
      options.onOpenRunEndTileDetail?.();
    }
    tileDetailPayload.value = payload;
    const o = originRect;
    tileDetailOriginRect.value =
      o &&
      typeof o.left === "number" &&
      typeof o.top === "number" &&
      o.width > 2 &&
      o.height > 2
        ? { left: o.left, top: o.top, width: o.width, height: o.height }
        : null;
    tileDetailPreviewNav.value = previewNav;
  }

  function closeTileDetail() {
    tileDetailPayload.value = null;
    tileDetailOriginRect.value = null;
    tileDetailPreviewNav.value = null;
    suppressTilePrimaryClick.value = false;
  }

  async function dismissTileDetailLayer() {
    const layer = options.getTileDetailLayer();
    if (tileDetailPayload.value && layer && typeof layer.playClose === "function") {
      await layer.playClose();
    }
    closeTileDetail();
  }

  function buildTileDetailPayloadFromTileBound(tile) {
    return buildTileDetailPayloadFromTile(tile, options.payloadCtx);
  }

  function buildTileDetailPayloadFromDeckCardBound(card) {
    return buildTileDetailPayloadFromDeckCard(card, options.payloadCtx);
  }

  function buildWordSlotTileDetailPayloadBound(slotIndex) {
    return buildWordSlotTileDetailPayload(slotIndex, options.payloadCtx);
  }

  /** @param {number} slotIndex */
  function buildWordSlotPreviewNav(slotIndex) {
    const order = options.payloadCtx.getSelectedOrder();
    return withPreviewNavKind(createPreviewNavGroup(order.map((_, i) => i), slotIndex), "word-slot");
  }

  /** @param {unknown} el */
  function tileOriginRectFromElementBound(el) {
    return tileOriginRectFromElement(el, options.refToDom);
  }

  /** @param {import('../../preview/previewGroupNav.js').PreviewNavGroup<unknown>} nav */
  function applyTileDetailAtPreviewNav(nav) {
    const kind = nav.kind;
    if (kind === "word-slot") {
      const slotIndex = /** @type {number} */ (nav.items[nav.index]);
      const p = buildWordSlotTileDetailPayloadBound(slotIndex);
      if (!p) return;
      openTileDetail(p, null, nav);
      return;
    }
    if (kind === "deck-expand") {
      const entry = nav.items[nav.index];
      const p = options.getDeckPreview?.()?.resolveDeckStackEntryDetail(entry);
      if (!p) return;
      openTileDetail(p, null, nav);
      return;
    }
    if (kind === "run-end-tile") {
      const item = /** @type {import('../../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} */ (
        nav.items[nav.index]
      );
      if (item.kind === "material") {
        const tilePayload = buildMaterialTileDetailPayload(item.materialId);
        if (tilePayload) openTileDetail(tilePayload, null, nav);
        return;
      }
      if (item.kind === "accessory") {
        const tilePayload = buildAccessoryTileDetailPayload(item.accessoryId);
        if (tilePayload) openTileDetail(tilePayload, null, nav);
      }
    }
  }

  /** @param {number} delta */
  function onTilePreviewNav(delta) {
    const nav = stepPreviewNavGroup(tileDetailPreviewNav.value, delta);
    if (!nav || nav.index === tileDetailPreviewNav.value?.index) return;
    applyTileDetailAtPreviewNav(nav);
  }

  function armTileLongPressFromPointer(e, openFn) {
    clearTileLongPressArm();
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (ev) => {
      if (tileLongPressTimer == null) return;
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > TILE_LONG_PRESS_MOVE_PX) {
        clearTileLongPressArm();
      }
    };
    const up = () => {
      clearTileLongPressArm();
    };
    tileLongPressCleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    const pointerId = e.pointerId;
    tileLongPressTimer = window.setTimeout(() => {
      tileLongPressTimer = null;
      if (tileLongPressCleanup) {
        tileLongPressCleanup();
        tileLongPressCleanup = null;
      }
      markTilePrimaryTapConsumed(pointerId);
      suppressTilePrimaryClick.value = true;
      openFn();
    }, TILE_LONG_PRESS_MS);
  }

  function dispose() {
    clearTileLongPressArm();
    tilePrimaryTapPending.clear();
  }

  return {
    tileDetailPayload,
    tileDetailOriginRect,
    tileDetailPreviewNav,
    suppressTilePrimaryClick,
    tileDetailPreviewNavTotal,
    tileDetailPreviewNavIndex,
    canOpenTileDetail,
    openTileDetail,
    closeTileDetail,
    dismissTileDetailLayer,
    buildTileDetailPayloadFromTile: buildTileDetailPayloadFromTileBound,
    buildTileDetailPayloadFromDeckCard: buildTileDetailPayloadFromDeckCardBound,
    buildWordSlotTileDetailPayload: buildWordSlotTileDetailPayloadBound,
    buildWordSlotPreviewNav,
    tileOriginRectFromElement: tileOriginRectFromElementBound,
    onTilePreviewNav,
    armTileLongPressFromPointer,
    clearTileLongPressArm,
    markTilePrimaryTapConsumed,
    armTilePrimaryTap,
    clearTilePrimaryTap,
    tryCompleteTilePrimaryTap,
    onTilePointerCancel,
    dispose,
  };
}
