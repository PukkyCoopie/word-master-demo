/**
 * 飞入详情起点：与 ShopPanel / 收藏页一致，优先 icon 框；叠放优惠券用整组 stack 量尺寸。
 * @param {HTMLElement | null | undefined} root
 * @returns {HTMLElement | null}
 */
export function resolveOfferFlyOriginEl(root) {
  if (!root || !(root instanceof HTMLElement)) return null;
  return (
    root.querySelector(".shop-shelf-letter-tile") ??
    root.querySelector(".shop-treasure-frame") ??
    root.querySelector(".voucher-stamp-stack--stacked") ??
    root.querySelector(".voucher-stamp-stack__front .voucher-stamp__frame") ??
    root.querySelector(".voucher-stamp-stack .voucher-stamp__frame") ??
    root.querySelector(".voucher-stamp__frame") ??
    root.querySelector(".treasure-slot") ??
    root
  );
}

/**
 * @param {HTMLElement | null | undefined} el
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 */
export function offerFlyOriginRectFromEl(el) {
  const node = resolveOfferFlyOriginEl(el instanceof HTMLElement ? el : null);
  if (!node || typeof node.getBoundingClientRect !== "function") return null;
  const r = node.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}
