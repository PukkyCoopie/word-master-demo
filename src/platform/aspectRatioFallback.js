/**
 * 旧 WebView 无 aspect-ratio 时：对流式/自撑内容的比例盒按宽度同步 height。
 * （绝对定位铺满类盒子走 css/legacy-aspect-ratio.css 的 padding 回退。）
 */
import { getSupportsAspectRatio } from "./webViewCapabilities.js";

/** @type {ResizeObserver | null} */
let observer = null;
/** @type {WeakMap<Element, number>} */
const ratioByEl = new WeakMap();

/**
 * 宽:高 → height/width 比值（height = width * ratio）。
 * @type {{ selector: string, ratio: number }[]}
 */
const SYNC_TARGETS = [
  { selector: ".spell-target-offer-cell", ratio: 1 },
  {
    selector: ".shop-deck-offer-product-stack .shop-shelf-letter-tile--detail",
    ratio: 1,
  },
  {
    selector:
      ".treasure-detail-fly-clone-root--shelf-visual .shop-treasure-frame.shop-treasure-frame--detail",
    ratio: 1,
  },
  {
    selector: ".treasure-detail-fly-clone-root .shop-shelf-letter-tile--detail",
    ratio: 1,
  },
  {
    selector:
      ".treasure-detail-fly-clone-root.shop-deck-offer-product-stack .shop-shelf-letter-tile",
    ratio: 1,
  },
  { selector: ".info-stage-block--tile", ratio: 1 },
  { selector: ".settings-control-demo", ratio: 1 },
  { selector: ".taptap-poster-layer-poster-loading", ratio: 1100 / 640 },
];

/**
 * @param {Element} el
 * @param {number} ratio
 */
function applyHeightFromWidth(el, ratio) {
  if (!(el instanceof HTMLElement)) return;
  const w = el.getBoundingClientRect().width;
  if (!(w > 0) || !(ratio > 0)) return;
  const next = `${w * ratio}px`;
  if (el.style.height !== next) el.style.height = next;
}

/**
 * @param {Element} el
 */
function syncOne(el) {
  const ratio = ratioByEl.get(el);
  if (ratio == null) return;
  applyHeightFromWidth(el, ratio);
}

function ensureObserver() {
  if (observer || typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      syncOne(entry.target);
    }
  });
}

/**
 * @param {ParentNode} [root]
 */
function collectAndObserve(root = document) {
  ensureObserver();
  if (!observer) {
    // 无 ResizeObserver：至少做一次布局
    for (const { selector, ratio } of SYNC_TARGETS) {
      root.querySelectorAll?.(selector)?.forEach((el) => {
        ratioByEl.set(el, ratio);
        applyHeightFromWidth(el, ratio);
      });
    }
    return;
  }
  for (const { selector, ratio } of SYNC_TARGETS) {
    root.querySelectorAll?.(selector)?.forEach((el) => {
      if (ratioByEl.has(el)) return;
      ratioByEl.set(el, ratio);
      observer.observe(el);
      applyHeightFromWidth(el, ratio);
    });
  }
}

/** @type {MutationObserver | null} */
let mutationObserver = null;

/** 启动宽高同步；支持 aspect-ratio 时为 no-op */
export function initAspectRatioFallback() {
  if (getSupportsAspectRatio()) return;
  if (typeof document === "undefined") return;

  collectAndObserve(document);

  if (typeof MutationObserver !== "undefined" && !mutationObserver) {
    mutationObserver = new MutationObserver((records) => {
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (!(node instanceof Element)) continue;
          collectAndObserve(node);
          // 自身若匹配选择器
          for (const { selector, ratio } of SYNC_TARGETS) {
            if (node.matches?.(selector) && !ratioByEl.has(node)) {
              ratioByEl.set(node, ratio);
              ensureObserver();
              observer?.observe(node);
              applyHeightFromWidth(node, ratio);
            }
          }
        }
      }
    });
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}
