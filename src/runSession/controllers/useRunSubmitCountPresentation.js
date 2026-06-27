import { ref } from "vue";

/** 次数 -1 动效：与 CSS `actionCountDeltaPop` 时长一致（约 0.92s） */
export const ACTION_COUNT_DELTA_ANIM_MS = 920;
/** 动效在总时间轴上占一拍，之后再进入记分 / 棋盘下落 */
export const ACTION_COUNT_DELTA_BEAT_MS = 400;

/**
 * 剩余次数旁「-1」提交计数动效（R7）。
 */
export function useRunSubmitCountPresentation() {
  const submitDeltaKey = ref(0);
  /** @type {ReturnType<typeof setTimeout> | null} */
  let submitDeltaClearTimer = null;

  function flashSubmitCountDelta() {
    submitDeltaKey.value += 1;
    const cur = submitDeltaKey.value;
    if (submitDeltaClearTimer) clearTimeout(submitDeltaClearTimer);
    submitDeltaClearTimer = setTimeout(() => {
      if (submitDeltaKey.value === cur) submitDeltaKey.value = 0;
      submitDeltaClearTimer = null;
    }, ACTION_COUNT_DELTA_ANIM_MS + 120);
  }

  function disposeSubmitCountDeltaTimer() {
    if (submitDeltaClearTimer) clearTimeout(submitDeltaClearTimer);
    submitDeltaClearTimer = null;
  }

  return {
    submitDeltaKey,
    flashSubmitCountDelta,
    disposeSubmitCountDeltaTimer,
  };
}
