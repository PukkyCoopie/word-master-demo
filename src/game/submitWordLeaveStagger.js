/** 提交后词槽/棋盘格依次消失：单格 duration 不变，仅缩短 stagger；词越长间隔越小 */
export function submitWordLeaveStagger(letterCount) {
  const n = Math.max(1, Math.min(24, Math.round(Number(letterCount) || 1)));
  const extra = Math.max(0, n - 3);
  const base = 0.082;
  const taper = 0.0042;
  return Math.max(0.03, base - extra * taper);
}
