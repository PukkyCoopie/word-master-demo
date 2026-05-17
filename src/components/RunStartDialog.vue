<template>
  <div
    v-if="open"
    class="run-start-dialog-backdrop"
    role="presentation"
    @click.self="onCancel"
  >
    <div
      class="run-start-dialog-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-start-dialog-title"
      @click.stop
    >
      <h2 id="run-start-dialog-title" class="run-start-dialog-title">开始游戏</h2>

      <div class="run-start-dialog-body">
        <div class="run-start-dialog__future" aria-hidden="true" />

        <div class="run-start-dialog-seed-row">
          <label class="run-start-dialog-seed-label" for="run-start-seed-input">种子</label>
          <div class="run-start-dialog-seed-field">
            <input
              id="run-start-seed-input"
              ref="seedInputRef"
              v-model="seedDraft"
              type="text"
              class="run-start-dialog-seed-input"
              autocomplete="off"
              spellcheck="false"
              maxlength="8"
              placeholder="留空则随机"
              @input="onSeedInput"
            />
            <button
              type="button"
              class="run-start-dialog-seed-random"
              title="随机种子"
              aria-label="随机种子"
              @click="onRandomSeed"
            >
              <i class="ri-dice-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="run-start-dialog-footer">
        <button
          type="button"
          class="run-start-dialog-btn run-start-dialog-btn--primary"
          @click="onConfirm"
        >
          开始游戏
        </button>
        <button type="button" class="run-start-dialog-btn run-start-dialog-btn--secondary" @click="onCancel">
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from "vue";
import { generateRandomRunSeedString, normalizeRunSeedInput, resolveRunSeedFromDialog } from "../game/runRng.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 打开弹层时预填的种子（失败重开等） */
  initialSeed: { type: String, default: "" },
});

const emit = defineEmits(["confirm", "cancel"]);

const seedDraft = ref("");
const seedInputRef = ref(/** @type {HTMLInputElement | null} */ (null));

watch(
  () => [props.open, props.initialSeed],
  ([isOpen, initial]) => {
    if (!isOpen) return;
    seedDraft.value = initial ? normalizeRunSeedInput(String(initial)) : "";
    nextTick(() => seedInputRef.value?.focus());
  },
);

function onSeedInput() {
  seedDraft.value = normalizeRunSeedInput(seedDraft.value);
}

function onRandomSeed() {
  seedDraft.value = generateRandomRunSeedString();
}

function onConfirm() {
  const { seedNumeric, seedDisplay } = resolveRunSeedFromDialog(seedDraft.value);
  emit("confirm", { seedNumeric, seedDisplay });
}

function onCancel() {
  emit("cancel");
}
</script>

<style scoped>
.run-start-dialog-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  box-sizing: border-box;
  border-radius: inherit;
  background: rgba(0, 0, 0, 0.42);
}

.run-start-dialog-card {
  width: min(100%, calc(520 * var(--rpx)));
  background: var(--card-bright, #faf8ef);
  border-radius: calc(12 * var(--rpx));
  box-shadow: var(--shadow);
  padding: calc(28 * var(--rpx)) calc(24 * var(--rpx)) calc(22 * var(--rpx));
  box-sizing: border-box;
}

.run-start-dialog-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.run-start-dialog-body {
  display: flex;
  flex-direction: column;
  gap: calc(14 * var(--rpx));
}

.run-start-dialog__future {
  display: none;
}

.run-start-dialog-seed-row {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
}

.run-start-dialog-seed-label {
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.run-start-dialog-seed-field {
  display: flex;
  align-items: stretch;
  gap: calc(8 * var(--rpx));
}

.run-start-dialog-seed-input {
  flex: 1;
  min-width: 0;
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  box-sizing: border-box;
}

.run-start-dialog-seed-input::placeholder {
  font-weight: 500;
  letter-spacing: normal;
  opacity: 0.55;
}

.run-start-dialog-seed-random {
  flex-shrink: 0;
  width: calc(52 * var(--rpx));
  border: none;
  border-radius: var(--radius);
  background: #d4954a;
  color: #f9f6f2;
  font-size: calc(28 * var(--rpx));
  cursor: pointer;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
}

.run-start-dialog-seed-random:hover {
  filter: brightness(1.05);
}

.run-start-dialog-seed-random:active {
  filter: brightness(0.92);
}

.run-start-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(12 * var(--rpx));
  margin-top: calc(26 * var(--rpx));
}

.run-start-dialog-btn {
  flex: 1;
  border: none;
  border-radius: var(--radius);
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
}

.run-start-dialog-btn--primary {
  background: #5a8fb8;
  color: #f9f6f2;
}

.run-start-dialog-btn--secondary {
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}

.run-start-dialog-btn:hover {
  filter: brightness(1.05);
}

.run-start-dialog-btn:active {
  filter: brightness(0.92);
}
</style>
