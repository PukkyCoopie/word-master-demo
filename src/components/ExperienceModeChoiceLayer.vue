<template>
  <Transition name="experience-mode-choice">
    <div
      v-if="open"
      class="experience-mode-choice-backdrop portal-overlay-fill"
      :style="backdropStackStyle"
      role="presentation"
    >
      <div class="experience-mode-choice-scrim" aria-hidden="true" />
      <div
        class="experience-mode-choice-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <h2 :id="titleId" class="experience-mode-choice-title">选择游戏方式</h2>

        <div class="experience-mode-choice-options" role="radiogroup" aria-label="游戏体验模式">
          <button
            type="button"
            class="experience-mode-choice-option"
            :class="{ 'experience-mode-choice-option--selected': selected === 'classic' }"
            role="radio"
            :aria-checked="selected === 'classic'"
            @click="selected = 'classic'"
          >
            <span class="experience-mode-choice-option-heading" aria-hidden="true">✒️</span>
            <span class="experience-mode-choice-option-text">
              字母由你排列，体验原汁原味的单词+肉鸽挑战
            </span>
            <span
              class="experience-mode-choice-check"
              :class="{ 'experience-mode-choice-check--on': selected === 'classic' }"
              aria-hidden="true"
            >
              <i v-if="selected === 'classic'" class="ri-check-line" />
            </span>
          </button>

          <button
            type="button"
            class="experience-mode-choice-option"
            :class="{ 'experience-mode-choice-option--selected': selected === 'casual' }"
            role="radio"
            :aria-checked="selected === 'casual'"
            @click="selected = 'casual'"
          >
            <span class="experience-mode-choice-option-heading" aria-hidden="true">🎉</span>
            <span class="experience-mode-choice-option-text">
              无需手动拼词，没有单词焦虑，直接享受数值狂欢
            </span>
            <span
              class="experience-mode-choice-check"
              :class="{ 'experience-mode-choice-check--on': selected === 'casual' }"
              aria-hidden="true"
            >
              <i v-if="selected === 'casual'" class="ri-check-line" />
            </span>
          </button>
        </div>

        <p class="experience-mode-choice-footnote">之后仍然能体验另一个选项</p>

        <button
          type="button"
          class="experience-mode-choice-continue"
          :disabled="selected == null"
          @click="onContinue"
        >
          继续
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm"]);

const titleId = "experience-mode-choice-title";
const stackZ = ref(0);
/** @type {import('vue').Ref<'classic' | 'casual' | null>} */
const selected = ref(null);

const backdropStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : {},
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      stackZ.value = bumpOverlayZ();
      selected.value = null;
    }
  },
  { immediate: true },
);

function onContinue() {
  if (selected.value == null) return;
  emit("confirm", selected.value);
}
</script>

<style scoped>
.experience-mode-choice-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
}

.experience-mode-choice-scrim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(0, 0, 0, 0.42);
}

.experience-mode-choice-card {
  position: relative;
  width: min(var(--menu-actions-width), calc(100% - 40 * var(--rpx)));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(44 * var(--rpx)) calc(26 * var(--rpx)) calc(40 * var(--rpx));
  box-sizing: border-box;
  box-shadow: var(--shadow);
}

.experience-mode-choice-title {
  margin: 0 0 calc(24 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
  line-height: 1.25;
}

.experience-mode-choice-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(12 * var(--rpx));
}

.experience-mode-choice-option {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: calc(14 * var(--rpx));
  min-height: calc(190 * var(--rpx));
  padding: calc(18 * var(--rpx)) calc(16 * var(--rpx)) calc(16 * var(--rpx));
  border: calc(3 * var(--rpx)) solid rgba(0, 0, 0, 0.08);
  border-radius: calc(12 * var(--rpx));
  background: var(--card, #eee4da);
  cursor: pointer;
  text-align: left;
  font: inherit;
  box-sizing: border-box;
  transition:
    border-color 0.14s ease,
    background-color 0.14s ease;
}

.experience-mode-choice-option--selected {
  border-color: var(--btn-green, #7cb342);
  background: #f9f6f2;
}

.experience-mode-choice-option-heading {
  display: block;
  text-align: center;
  font-size: calc(52 * var(--rpx));
  line-height: 1;
}

.experience-mode-choice-check {
  flex-shrink: 0;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(32 * var(--rpx));
  height: calc(32 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.18);
  background: var(--card-bright, #f9f6f2);
  color: #fff;
  font-size: calc(22 * var(--rpx));
  line-height: 1;
}

.experience-mode-choice-check--on {
  border-color: var(--btn-green, #7cb342);
  background: var(--btn-green, #7cb342);
}

.experience-mode-choice-option-text {
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-dark, #3c3a32);
}

.experience-mode-choice-footnote {
  margin: calc(18 * var(--rpx)) 0 calc(22 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  line-height: 1.45;
  color: rgba(60, 58, 50, 0.62);
  text-align: center;
}

.experience-mode-choice-continue {
  width: 100%;
  min-height: calc(88 * var(--rpx));
  border: none;
  border-radius: calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(32 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  color: #f9f6f2;
  background: var(--btn-green, #7cb342);
  box-shadow: var(--shadow);
}

.experience-mode-choice-continue:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.experience-mode-choice-continue:not(:disabled):active {
  filter: brightness(0.92);
}

.experience-mode-choice-enter-active,
.experience-mode-choice-leave-active {
  transition: opacity calc(0.28s / var(--anim-speed-scale, 1)) ease;
}

.experience-mode-choice-enter-from,
.experience-mode-choice-leave-to {
  opacity: 0;
}
</style>
