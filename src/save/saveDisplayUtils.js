/** @type {Record<string, string>} */
export const PHASE_LABELS = {
  playing: "游戏中",
  settlement: "结算",
  shop: "商店",
  run_end_win: "胜利",
  run_end_fail: "失败",
};

/** @param {string} phase */
export function formatSavePhaseLabel(phase) {
  return PHASE_LABELS[phase] ?? "游戏中";
}

/** @param {number} ts */
export function formatRelativeSaveTime(ts) {
  const n = Math.floor(Number(ts) || 0);
  if (!n) return "—";
  const diff = Date.now() - n;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}
