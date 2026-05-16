/**
 * Boss 盲注重掷占位（导演剪辑 / 翻案）；Boss 关未接入时供 UI 或未来逻辑查询。
 * @returns {{ rerollCostDollars: number, unlimited: boolean }}
 */
export function getBossBlindRerollPlaceholderState() {
  return { rerollCostDollars: 10, unlimited: false };
}
