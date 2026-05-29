/**
 * @param {{
 *   idle?: boolean,
 *   transitionBusy?: boolean,
 *   scoringAnimating?: boolean,
 *   gridRefillAnimating?: boolean,
 *   flyingLettersCount?: number,
 *   flyingBackBatchesCount?: number,
 *   submitWordBusy?: boolean,
 * }} snapshot
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canSaveNow(snapshot) {
  if (!snapshot?.idle) {
    if (snapshot?.scoringAnimating) return { ok: false, reason: "记分动画进行中" };
    if (snapshot?.gridRefillAnimating) return { ok: false, reason: "棋盘补牌中" };
    if ((snapshot?.flyingLettersCount ?? 0) > 0) return { ok: false, reason: "飞字动画进行中" };
    if ((snapshot?.flyingBackBatchesCount ?? 0) > 0) return { ok: false, reason: "飞回动画进行中" };
    if (snapshot?.submitWordBusy) return { ok: false, reason: "提交处理中" };
    if (snapshot?.transitionBusy) return { ok: false, reason: "转场中" };
    return { ok: false, reason: "当前无法保存" };
  }
  return { ok: true };
}
