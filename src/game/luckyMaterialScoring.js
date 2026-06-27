/**
 * 幸运块字后 multAdd 步：逐字动画在 `runSingleLetterScoringStep` 播放；
 * 存在字后 ×倍率时公式区数值仍在字后步累加（与碎冰同理，字后循环跳过动效）。
 */

/**
 * @param {{ materialLucky?: boolean } | null | undefined} step
 */
export function isLuckyMaterialPostLetterStep(step) {
  return step?.materialLucky === true;
}
