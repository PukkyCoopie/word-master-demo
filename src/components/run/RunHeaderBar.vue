<template>
  <div class="run-header-bar">
    <div class="header">
      <div
        ref="levelTitleBoxRef"
        class="header-box header-box-level-title header-box-level-title--clickable"
        role="button"
        tabindex="0"
        title="查看关卡进度"
        :aria-label="`${levelTitleLabel}，点击查看关卡进度`"
        :class="{ 'header-box-level-title--tutorial-blocked': firstWordTutorialActive }"
        @click="!firstWordTutorialActive && emit('open-stage-info')"
        @keydown.enter.prevent="!firstWordTutorialActive && emit('open-stage-info')"
        @keydown.space.prevent="!firstWordTutorialActive && emit('open-stage-info')"
      >
        <span class="header-level-title-text">{{ levelTitleLabel }}</span>
        <DifficultyPill
          v-if="runDifficultyIndex > 0"
          class="header-level-difficulty-pill"
          :index="runDifficultyIndex"
        />
      </div>
      <div
        class="header-box header-box-split header-box-reward-dollars"
        :title="`本关通关基础奖励 ${stageRewardYuan} 元`"
      >
        <span class="header-split-label">奖励</span>
        <span class="header-reward-marks">{{ rewardDollarMarks }}</span>
      </div>
      <div class="header-box header-box-split header-box-wallet" title="当前钱包余额">
        <span class="header-split-label">钱包</span>
        <span
          ref="headerWalletMarksRef"
          class="header-wallet-marks"
          :class="{ 'money-tone--debt': walletHeaderShown < 0 }"
        >
          <span class="money-dollar-char">$</span
          ><span class="header-wallet-amount">{{ walletAmountText }}</span>
        </span>
      </div>
    </div>
    <div ref="scoresHeaderRef" class="scores">
      <div ref="targetScoreCardRef" class="score-card score-target">
        <div class="score-label">至少得分</div>
        <ScoreCardValue :value="targetScoreValue" />
      </div>
      <div class="score-card score-round">
        <div class="score-label">关卡得分</div>
        <ScoreCardValue :value="roundScoreValue" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import DifficultyPill from "../DifficultyPill.vue";
import ScoreCardValue from "../ScoreCardValue.vue";

defineProps({
  levelTitleLabel: { type: String, required: true },
  runDifficultyIndex: { type: Number, default: 0 },
  stageRewardYuan: { type: Number, default: 0 },
  rewardDollarMarks: { type: String, default: "" },
  walletHeaderShown: { type: Number, default: 0 },
  walletAmountText: { type: String, required: true },
  targetScoreValue: { type: [Number, String], default: 0 },
  roundScoreValue: { type: [Number, String], default: 0 },
  firstWordTutorialActive: { type: Boolean, default: false },
});

const emit = defineEmits(["open-stage-info"]);

const levelTitleBoxRef = ref(/** @type {HTMLElement | null} */ (null));
const headerWalletMarksRef = ref(/** @type {HTMLElement | null} */ (null));
const scoresHeaderRef = ref(/** @type {HTMLElement | null} */ (null));
const targetScoreCardRef = ref(/** @type {HTMLElement | null} */ (null));

defineExpose({
  levelTitleBoxRef,
  headerWalletMarksRef,
  scoresHeaderRef,
  targetScoreCardRef,
});
</script>

<style scoped>
.run-header-bar {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
}

/* 关卡标题：进关动效用 GSAP 写 scale/阴影，此处保证变换原点 */
.header-box-level-title {
  transform-origin: 50% 50%;
  position: relative;
}

.header-box-level-title--clickable {
  cursor: pointer;
}

.header-box-level-title--clickable::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: transparent;
  transition: background 0.1s ease;
}

.header-box-level-title--clickable:hover::after {
  background: rgba(255, 255, 255, 0.06);
}

.header-box-level-title--clickable:active::after {
  background: rgba(0, 0, 0, 0.05);
}

.header-box-level-title--clickable:focus-visible {
  outline: calc(2 * var(--rpx)) solid #edc22e;
  outline-offset: calc(2 * var(--rpx));
}
</style>
