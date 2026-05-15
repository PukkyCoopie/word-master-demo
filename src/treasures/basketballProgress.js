/**
 * 篮球「每 5 词一充」规则下的槽位充能外观（与记分 active 判定一致）。
 * @param {number} wordsSubmittedSoFar 本局已成功结算的拼词次数（下一词提交前不计入当前这次）
 * @returns {'inactive' | 'active'}
 */
export function getBasketballChargeVisualState(wordsSubmittedSoFar) {
  const n = Math.max(0, Math.round(Number(wordsSubmittedSoFar) || 0));
  if ((n + 1) % 5 === 0) return "active";
  return "inactive";
}

/**
 * 篮球充能进度 0~1：inactive 按 1/5 台阶；下一词将 active 时视为已满。
 * @param {number} wordsSubmittedSoFar
 */
export function getBasketballChargeProgress(wordsSubmittedSoFar) {
  const n = Math.max(0, Math.round(Number(wordsSubmittedSoFar) || 0));
  if ((n + 1) % 5 === 0) return 1;
  return (n % 5) / 5;
}

/**
 * 篮球宝藏（treasureId: 20）简介括号文案。
 * @param {number} wordsSubmittedSoFar 本局已成功结算的拼词次数（下一词提交前不计入当前这次）
 */
export function getBasketballProgressBracketLine(wordsSubmittedSoFar) {
  const n = Math.max(0, Math.round(Number(wordsSubmittedSoFar) || 0));
  if ((n + 1) % 5 === 0) return "（就是本次）";
  const toGo = 5 - (n % 5);
  return `（还需${toGo}次）`;
}
