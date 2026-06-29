import { nextTick, ref } from "vue";
import { triggerHaptic } from "../platform/haptics.js";
import { BOSS_TAPE_TRIGGER_RIPPLE_MS, BOSS_TAPE_WOBBLE_MS } from "../game/bossTapeUi.js";

/**
 * Boss 条带触发 cue：wobble、强 ripple、attention pulse；供 `BossTapeStrip` 与 GamePanel 回调。
 */
export function useBossTapeCue() {
  const attentionPulse = ref(false);
  const wobble = ref(false);
  const triggerImpactFx = ref(false);
  /** @type {ReturnType<typeof setTimeout> | null} */
  let wobbleClearTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let triggerRippleClearTimer = null;
  /** 本手计分：獠牙 Boss 条带动效仅播一次 */
  let submitToothCuePlayed = false;

  function playTriggerCue() {
    triggerHaptic("warning");
    triggerHaptic("wobble");
    if (wobbleClearTimer) clearTimeout(wobbleClearTimer);
    if (triggerRippleClearTimer) clearTimeout(triggerRippleClearTimer);
    triggerImpactFx.value = false;
    wobble.value = false;
    void nextTick().then(() => {
      triggerImpactFx.value = true;
      wobble.value = true;
      wobbleClearTimer = setTimeout(() => {
        wobble.value = false;
        wobbleClearTimer = null;
      }, BOSS_TAPE_WOBBLE_MS);
      triggerRippleClearTimer = setTimeout(() => {
        triggerImpactFx.value = false;
        triggerRippleClearTimer = null;
      }, BOSS_TAPE_TRIGGER_RIPPLE_MS);
    });
  }

  function playAttentionPulse() {
    attentionPulse.value = true;
    nextTick(() => {
      attentionPulse.value = false;
    });
  }

  function playViolationWobble() {
    wobble.value = true;
    setTimeout(() => {
      wobble.value = false;
    }, BOSS_TAPE_WOBBLE_MS);
  }

  function resetSubmitToothCue() {
    submitToothCuePlayed = false;
  }

  /** @returns {boolean} 是否本次新播了 cue */
  function tryPlaySubmitToothCue() {
    if (submitToothCuePlayed) return false;
    submitToothCuePlayed = true;
    playTriggerCue();
    return true;
  }

  function playSuppressedDeactivateCue(playBubble) {
    triggerHaptic("wobble");
    if (wobbleClearTimer) clearTimeout(wobbleClearTimer);
    wobble.value = true;
    wobbleClearTimer = setTimeout(() => {
      wobble.value = false;
      wobbleClearTimer = null;
    }, BOSS_TAPE_WOBBLE_MS);
    playBubble?.();
  }

  return {
    attentionPulse,
    wobble,
    triggerImpactFx,
    playTriggerCue,
    playAttentionPulse,
    playViolationWobble,
    playSuppressedDeactivateCue,
    resetSubmitToothCue,
    tryPlaySubmitToothCue,
  };
}
