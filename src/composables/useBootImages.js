import { ref } from "vue";
import { collectBootImageUrls } from "../assets/collectBootImageUrls.js";
import { preloadImageToCache } from "../assets/imagePreloadCache.js";
import {
  isTapTapWebPromoEnabled,
  TAP_TAP_POSTER_SRC,
} from "../taptap/tapTapWebPromo.js";

const bootPosterWebPromo = isTapTapWebPromoEnabled();
const bootImageUrls = collectBootImageUrls();
/** 启动图 + TapTap 海报（仅 Web 推广端）预加载项总数 */
const bootAssetsTotalCount = bootImageUrls.length + (bootPosterWebPromo ? 1 : 0);

/** @type {import('vue').Ref<boolean>} */
const bootImagesReady = ref(false);
/** 0～1，启动图预加载进度（不含 TapTap 海报） */
const bootImageLoadProgress = ref(0);
/** 0～1，TapTap 海报预加载进度；非 Web 推广端恒为 1 */
const bootPosterLoadProgress = ref(bootPosterWebPromo ? 0 : 1);
/** 已完成的启动图 / 海报预加载项数 */
const bootAssetsLoadedCount = ref(0);

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
  bootAssetsLoadedCount.value = 0;
}

/** @param {number} p */
function bumpLoadProgress(p) {
  const next = clamp01(p);
  if (next <= loadProgressFloor) return;
  loadProgressFloor = next;
  bootImageLoadProgress.value = next;
}

/**
 * @param {string[]} urls
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void, onItemDone?: (done: number, total: number) => void, concurrency?: number }} [options]
 */
async function preloadImages(urls, options = {}) {
  const { shouldAbort, onProgress, onItemDone, concurrency = 4 } = options;
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
    onItemDone?.(done, total);
  };

  /** @type {number[]} */
  const queue = list.map((_, index) => index);
  const workerCount = Math.max(1, Math.min(concurrency, total));

  async function worker() {
    while (queue.length > 0) {
      if (shouldAbort?.()) return;
      const index = queue.shift();
      if (index == null) break;
      await preloadImageToCache(list[index]);
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
  await preloadImages(bootImageUrls, {
    shouldAbort,
    concurrency: 4,
    onProgress: bumpLoadProgress,
    onItemDone: (done) => {
      bootAssetsLoadedCount.value = done;
    },
  });
  if (shouldAbort?.()) return;
  bumpLoadProgress(1);
  bootAssetsLoadedCount.value = bootImageUrls.length;

  if (bootPosterWebPromo) {
    await preloadImageToCache(TAP_TAP_POSTER_SRC);
    if (shouldAbort?.()) return;
    bootPosterLoadProgress.value = 1;
    bootAssetsLoadedCount.value = bootAssetsTotalCount;
  }
}

export function useBootImages() {
  /**
   * @param {{ shouldAbort?: () => boolean }} [options]
   */
  async function loadBootImages(options = {}) {
    if (bootImagesReady.value) {
      loadProgressFloor = 1;
      bootImageLoadProgress.value = 1;
      bootPosterLoadProgress.value = 1;
      bootAssetsLoadedCount.value = bootAssetsTotalCount;
      return;
    }
    if (inFlightLoad) return inFlightLoad;

    inFlightLoad = (async () => {
      resetLoadProgress();
      try {
        await loadOnce(options);
      } catch {
        /* 单张失败已在 preloadImageToCache 内忽略；此处兜底不永久阻塞启动 */
      } finally {
        if (!options.shouldAbort?.()) {
          bootImagesReady.value = true;
          bumpLoadProgress(1);
          bootAssetsLoadedCount.value = bootAssetsTotalCount;
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
    bootPosterLoadProgress,
    bootAssetsLoadedCount,
    bootAssetsTotalCount,
    loadBootImages,
  };
}
