/**
 * 合并 GamePanel assembly 分域绑定（R7：自 GamePanel 迁出键列表）。
 * @param {Record<string, Record<string, unknown>>} chunks
 */
export function buildGamePanelAssemblyBinding(chunks) {
  return Object.assign({}, ...Object.values(chunks));
}
