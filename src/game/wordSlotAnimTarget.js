/**
 * 词槽缩放/离场动画目标：与计分 wobble、棋盘 `.grid-tile` 同级，取 `.word-slot-tile` 外包层。
 * 独立零依赖模块，避免经 gridTileIgniteFx → spellTileAppearanceAnim 的重依赖链影响提交离场路径。
 *
 * @param {HTMLElement | null | undefined} slotWrapper
 * @returns {HTMLElement | null}
 */
export function resolveWordSlotShrinkPopEl(slotWrapper) {
  return slotWrapper instanceof HTMLElement ? slotWrapper : null;
}
