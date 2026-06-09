import { ref } from "vue";
import { collectBootImageUrls } from "../assets/collectBootImageUrls.js";

/** @type {import('vue').Ref<boolean>} */
const bootImagesReady = ref(false);
/** 0～1，启动图预加载进度 */
const bootImageLoadProgress = ref(0);

/** @type {Promise<void> | null} */
let inFlightLoad = null;
/** 单次加载内单调递增，避免进度回跳 */
let loadProgressFloor = 0;

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function resetLoadProgress() {
  loadProgressFloor = 0;
  bootImageLoadProgress.value = 0;
}

/** @param {number} p */
function bumpLoadProgress(p) {
  const next = clamp01(p);
  if (next <= loadProgressFloor) return;
  loadProgressFloor = next;
  bootImageLoadProgress.value = next;
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
function preloadOneImage(url) {
  if (typeof Image === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    const finish = () => resolve();
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
  });
}

/**
 * @param {string[]} urls
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void, concurrency?: number }} [options]
 */
async function preloadImages(urls, options = {}) {
  const { shouldAbort, onProgress, concurrency = 4 } = options;
  const list = urls.filter(Boolean);
  const total = list.length;
  if (total === 0) {
    onProgress?.(1);
    return;
  }

  let done = 0;
  const bumpDone = () => {
    done += 1;
    onProgress?.(done / total);
  };

  /** @type {number[]} */
  const queue = list.map((_, index) => index);
  const workerCount = Math.max(1, Math.min(concurrency, total));

  async function worker() {
    while (queue.length > 0) {
      if (shouldAbort?.()) return;
      const index = queue.shift();
      if (index == null) break;
      await preloadOneImage(list[index]);
      bumpDone();
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

/**
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
async function loadOnce(options = {}) {
  const { shouldAbort } = options;
  const urls = collectBootImageUrls();
  await preloadImages(urls, {
    shouldAbort,
    concurrency: 4,
    onProgress: bumpLoadProgress,
  });
  if (shouldAbort?.()) return;
  bumpLoadProgress(1);
}

export function useBootImages() {
  /**
   * @param {{ shouldAbort?: () => boolean }} [options]
   */
  async function loadBootImages(options = {}) {
    if (bootImagesReady.value) {
      loadProgressFloor = 1;
      bootImageLoadProgress.value = 1;
      return;
    }
    if (inFlightLoad) return inFlightLoad;

    inFlightLoad = (async () => {
      resetLoadProgress();
      try {
        await loadOnce(options);
      } catch {
        /* 单张失败已在 preloadOneImage 内忽略；此处兜底不永久阻塞启动 */
      } finally {
        if (!options.shouldAbort?.()) {
          bootImagesReady.value = true;
          bumpLoadProgress(1);
        }
      }
    })();

    try {
      await inFlightLoad;
    } finally {
      inFlightLoad = null;
    }
  }

  return {
    bootImagesReady,
    bootImageLoadProgress,
    loadBootImages,
  };
}
