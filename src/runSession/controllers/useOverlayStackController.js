import { computed, ref } from "vue";
import { bumpOverlayZ as bumpOverlayZGlobal } from "../../game/overlayStack.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../../platform/haptics.js";
import { createOverlayViewContext } from "../../components/run/overlayViewKey.js";
import { assembleOverlayViewContext } from "../viewContext/assembleOverlayViewContext.js";

/** @typedef {import('../runSessionTypes.js').OverlayStackController} OverlayStackController */

const DEFAULT_PRESENT_MS = 280;
const DEFAULT_DISMISS_MS = 240;

/**
 * RunOverlayHost 浮层 z-index 与 portal present/dismiss（任务 6.3）。
 *
 * @param {{
 *   bumpOverlayZ?: typeof bumpOverlayZGlobal,
 *   overlayPresentMs?: number,
 *   overlayDismissMs?: number,
 * }} [options]
 * @returns {OverlayStackController}
 */
export function useOverlayStackController(options = {}) {
  const bumpOverlayZ = options.bumpOverlayZ ?? bumpOverlayZGlobal;
  const overlayPresentMs = options.overlayPresentMs ?? DEFAULT_PRESENT_MS;
  const overlayDismissMs = options.overlayDismissMs ?? DEFAULT_DISMISS_MS;

  const deckPortalZ = ref(0);
  const deckExpandPortalZ = ref(0);
  const pauseOptionsPortalZ = ref(0);
  const dictFatalPortalZ = ref(0);
  const toastPortalZ = ref(0);
  const toast = ref("");

  /** @param {import('vue').Ref<number>} zRef */
  function portalStackStyle(zRef) {
    return computed(() => (zRef.value > 0 ? { zIndex: zRef.value } : undefined));
  }

  const deckPortalStackStyle = portalStackStyle(deckPortalZ);
  const deckExpandPortalStackStyle = portalStackStyle(deckExpandPortalZ);
  const pauseOptionsPortalStackStyle = portalStackStyle(pauseOptionsPortalZ);
  const dictFatalPortalStackStyle = portalStackStyle(dictFatalPortalZ);
  const toastPortalStackStyle = portalStackStyle(toastPortalZ);

  /** @type {import('vue').ComputedRef<boolean> | null} */
  let dictFatalOpen = null;
  /** @type {import('vue').ComputedRef<string> | null} */
  let dictFatalMessage = null;
  /** @type {(() => void) | null} */
  let onDictFatalReload = null;

  /**
   * @param {{
   *   dictFatalOpen: import('vue').ComputedRef<boolean>,
   *   dictFatalMessage: import('vue').ComputedRef<string>,
   *   onDictFatalReload: () => void,
   * }} deps
   */
  function initGlobalOverlays(deps) {
    dictFatalOpen = deps.dictFatalOpen;
    dictFatalMessage = deps.dictFatalMessage;
    onDictFatalReload = deps.onDictFatalReload;
  }

  function bumpDictFatalPortal() {
    dictFatalPortalZ.value = bumpOverlayZ();
  }

  function bumpToastPortal() {
    toastPortalZ.value = bumpOverlayZ();
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let toastClearTimer = null;

  /**
   * @param {string} msg
   * @param {number} [ms]
   */
  function showToast(msg, ms = 2000) {
    if (toastClearTimer) {
      clearTimeout(toastClearTimer);
      toastClearTimer = null;
    }
    toast.value = msg;
    bumpToastPortal();
    toastClearTimer = setTimeout(() => {
      toast.value = "";
      toastClearTimer = null;
    }, ms);
  }

  function openDeckPortal() {
    scheduleOverlayPresent(overlayPresentMs);
    deckPortalZ.value = bumpOverlayZ();
  }

  function closeDeckPortal() {
    scheduleOverlayDismiss(overlayDismissMs);
  }

  function openPauseOptionsPortal() {
    pauseOptionsPortalZ.value = bumpOverlayZ();
  }

  function bumpDeckExpandPortal() {
    deckExpandPortalZ.value = bumpOverlayZ();
  }

  /** @type {Record<string, unknown> | null} */
  let overlayViewDeps = null;

  /** @param {Record<string, unknown>} deps */
  function initViewContext(deps) {
    overlayViewDeps = deps;
  }

  function buildViewContext() {
    if (!overlayViewDeps) {
      throw new Error("useOverlayStackController: initViewContext must be called before buildViewContext");
    }
    return createOverlayViewContext(assembleOverlayViewContext(overlayViewDeps));
  }

  return {
    initViewContext,
    initGlobalOverlays,
    buildViewContext,
    get dictFatalOpen() {
      if (!dictFatalOpen) {
        throw new Error("useOverlayStackController: initGlobalOverlays must be called first");
      }
      return dictFatalOpen;
    },
    get dictFatalMessage() {
      if (!dictFatalMessage) {
        throw new Error("useOverlayStackController: initGlobalOverlays must be called first");
      }
      return dictFatalMessage;
    },
    onDictFatalReload: () => {
      if (!onDictFatalReload) {
        throw new Error("useOverlayStackController: initGlobalOverlays must be called first");
      }
      onDictFatalReload();
    },
    toast,
    showToast,
    deckPortalZ,
    deckExpandPortalZ,
    pauseOptionsPortalZ,
    dictFatalPortalZ,
    toastPortalZ,
    deckPortalStackStyle,
    deckExpandPortalStackStyle,
    pauseOptionsPortalStackStyle,
    dictFatalPortalStackStyle,
    toastPortalStackStyle,
    openDeckPortal,
    closeDeckPortal,
    openPauseOptionsPortal,
    bumpDeckExpandPortal,
    bumpDictFatalPortal,
    bumpToastPortal,
    bumpOverlayZ,
  };
}
