import { reactive } from "vue";

/** inject / provide 键（任务 2.3：InRunPlayfield 视图绑定） */
export const PLAYFIELD_VIEW_KEY = Symbol("word_master_playfield_view");

/**
 * GamePanel provide 的 playfield 视图上下文（refs / computed / handlers）。
 * @typedef {Record<string, unknown>} PlayfieldViewContext
 */

/**
 * 用 reactive 包装 provide 对象，使 inject 方模板/脚本访问嵌套 ref 时自动解包。
 * @template {PlayfieldViewContext} T
 * @param {T} raw
 * @returns {T}
 */
export function createPlayfieldViewContext(raw) {
  return reactive(raw);
}
