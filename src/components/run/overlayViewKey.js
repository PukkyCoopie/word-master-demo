import { reactive } from "vue";

/** inject / provide 键（任务 6.3：RunOverlayHost 视图绑定） */
export const OVERLAY_VIEW_KEY = Symbol("word_master_overlay_view");

/**
 * GamePanel provide 的浮层视图上下文（牌库层、详情/暂停/信息模态等）。
 * @typedef {Record<string, unknown>} OverlayViewContext
 */

/**
 * @template {OverlayViewContext} T
 * @param {T} raw
 * @returns {T}
 */
export function createOverlayViewContext(raw) {
  return reactive(raw);
}
