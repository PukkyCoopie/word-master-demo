<template>
  <div
    v-if="bossDef"
    class="boss-tape-wrap"
    :class="{
      'boss-tape-wrap--violate': showViolatePreview,
      'boss-tape-wrap--suppressed': mechanicsSuppressed,
      'boss-tape-wrap--trigger-impact': triggerImpactFx && !mechanicsSuppressed,
    }"
  >
    <div
      v-if="(showViolatePreview || triggerImpactFx) && !mechanicsSuppressed"
      class="boss-tape-ripples"
      aria-hidden="true"
    >
      <span class="boss-tape-ripple" />
      <span class="boss-tape-ripple" />
      <span class="boss-tape-ripple" />
    </div>
    <div
      class="boss-tape"
      :class="{
        'boss-tape--attention': attentionPulse && !mechanicsSuppressed,
        'boss-tape--wobble': wobble && !mechanicsSuppressed,
        'boss-tape--suppressed': mechanicsSuppressed,
      }"
    >
      <div class="boss-tape-body">
        <div class="boss-tape-title">{{ bossDef.nameZh }}</div>
        <div class="boss-tape-desc">{{ subLine }}</div>
      </div>
      <span
        v-if="mechanicsSuppressed"
        class="boss-tape-suppressed-x letter-tile-boss-x"
        aria-hidden="true"
      >×</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { getBossDef } from "../../game/bossBlindDefinitions.js";
import { buildBossTapeSubLine } from "../../game/bossTapeUi.js";
import { useBossTapeCue } from "../../composables/useBossTapeCue.js";

const props = defineProps({
  activeBossSlug: { type: String, default: "" },
  clubRequiredKey: { type: String, default: "" },
  mouthLockedLength: { type: Number, default: null },
  softPreview: { type: Boolean, default: false },
  /** 盾牌 / 钥匙等：Boss 机制本关或本局被屏蔽 */
  mechanicsSuppressed: { type: Boolean, default: false },
});

const showViolatePreview = computed(
  () => props.softPreview && !props.mechanicsSuppressed,
);

const bossDef = computed(() => {
  const slug = String(props.activeBossSlug ?? "").trim();
  return slug ? getBossDef(slug) : null;
});

const subLine = computed(() =>
  buildBossTapeSubLine(bossDef.value, {
    clubRequiredKey: props.clubRequiredKey,
    mouthLockedLength: props.mouthLockedLength,
  }),
);

const {
  attentionPulse,
  wobble,
  triggerImpactFx,
  playTriggerCue,
  playAttentionPulse,
  playViolationWobble,
  resetSubmitToothCue,
  tryPlaySubmitToothCue,
} = useBossTapeCue();

defineExpose({
  playTriggerCue,
  playAttentionPulse,
  playViolationWobble,
  resetSubmitToothCue,
  tryPlaySubmitToothCue,
});
</script>
