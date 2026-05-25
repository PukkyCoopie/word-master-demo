import { ref } from "vue";

const REMIXICON_FAMILY = "remixicon";
const REMIXICON_PROBE = `16px "${REMIXICON_FAMILY}"`;

/** @type {import('vue').Ref<boolean>} */
const remixIconReady = ref(false);
/** @type {Promise<void> | null} */
let inFlightLoad = null;

/**
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
async function loadOnce(options = {}) {
  const { shouldAbort } = options;
  if (typeof document === "undefined") {
    remixIconReady.value = true;
    return;
  }

  const fonts = document.fonts;
  if (!fonts?.load) {
    remixIconReady.value = true;
    return;
  }

  try {
    await fonts.load(REMIXICON_PROBE);
    if (shouldAbort?.()) return;
    await fonts.ready;
    if (shouldAbort?.()) return;
    if (!fonts.check(REMIXICON_PROBE)) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    } else {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  } catch {
    /* 字体加载失败时不永久阻塞 */
  }

  if (!shouldAbort?.()) {
    remixIconReady.value = true;
  }
}

export function useRemixIconFont() {
  /**
   * @param {{ shouldAbort?: () => boolean }} [options]
   */
  async function loadRemixIconFont(options = {}) {
    if (remixIconReady.value) return;
    if (inFlightLoad) return inFlightLoad;

    inFlightLoad = loadOnce(options).finally(() => {
      inFlightLoad = null;
    });
    return inFlightLoad;
  }

  return {
    remixIconReady,
    loadRemixIconFont,
  };
}

/** 入口尽早触发字体加载（main.js，紧接 remixicon.css 之后） */
export function startRemixIconFontLoad(options = {}) {
  return useRemixIconFont().loadRemixIconFont(options);
}
