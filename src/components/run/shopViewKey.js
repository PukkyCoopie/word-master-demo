import { reactive } from "vue";

/** inject / provide 键（任务 5.3：InRunShopPhase 视图绑定） */
export const SHOP_VIEW_KEY = Symbol("word_master_shop_view");

/**
 * GamePanel provide 的商店阶段视图上下文（refs / computed / handlers）。
 * @typedef {Record<string, unknown>} ShopViewContext
 */

/**
 * 用 reactive 包装 provide 对象，使 inject 方模板/脚本访问嵌套 ref 时自动解包。
 * @template {ShopViewContext} T
 * @param {T} raw
 * @returns {T}
 */
export function createShopViewContext(raw) {
  return reactive(raw);
}
