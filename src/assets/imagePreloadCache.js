/** 常驻引用，避免预加载图被 GC 后解码结果丢失 */
/** @type {Map<string, HTMLImageElement>} */
const preloadedImages = new Map();

/**
 * @param {HTMLImageElement} img
 */
async function decodeImageElement(img) {
  if (!img.complete || img.naturalWidth <= 0) return;
  if (typeof img.decode !== "function") return;
  try {
    await img.decode();
  } catch {
    /* 解码失败不阻塞启动 */
  }
}

/**
 * 下载并解码图片，结果保留在缓存中供后续同 URL 展示复用。
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function preloadImageToCache(url) {
  const key = String(url ?? "").trim();
  if (!key) return;

  if (typeof Image === "undefined") return;

  const cached = preloadedImages.get(key);
  if (cached?.complete && cached.naturalWidth > 0) {
    await decodeImageElement(cached);
    return;
  }

  const img = cached ?? new Image();
  preloadedImages.set(key, img);

  if (!img.complete || img.naturalWidth <= 0) {
    await new Promise((resolve) => {
      const finish = () => resolve();
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      if (img.src !== key) img.src = key;
      else if (img.complete) finish();
    });
  }

  await decodeImageElement(img);
}

/** @param {string} url */
export function getPreloadedImage(url) {
  return preloadedImages.get(String(url ?? "").trim()) ?? null;
}

/** @param {string} url */
export function isImagePreloaded(url) {
  const img = getPreloadedImage(url);
  return Boolean(img?.complete && img.naturalWidth > 0);
}
