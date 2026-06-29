/**
 * RunOverlayHost 经 defineExpose 暴露的子层 ref；父级经 host ref 读取时可能是组件实例或未解包的 Ref。
 * @param {unknown} exposed
 * @returns {Record<string, unknown> | null}
 */
export function resolveRunOverlayChildLayer(exposed) {
  if (!exposed || typeof exposed !== "object") return null;
  const layer = /** @type {Record<string, unknown>} */ (exposed);
  if (
    typeof layer.playClose === "function" ||
    typeof layer.playConfirmAppearanceAnim === "function" ||
    typeof layer.getOfferTileEl === "function"
  ) {
    return layer;
  }
  if ("value" in layer) {
    const inner = layer.value;
    if (inner && typeof inner === "object") {
      return /** @type {Record<string, unknown>} */ (inner);
    }
  }
  return null;
}
