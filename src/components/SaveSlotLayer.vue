<template>
  <Transition name="save-slot-layer">
    <div v-if="open" class="save-slot-layer-backdrop" role="presentation">
      <div class="save-slot-layer-scrim" aria-hidden="true" @click="onBackdropClick" />
      <div
        class="save-slot-layer-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <h2 :id="titleId" class="save-slot-layer-title">{{ titleText }}</h2>

        <div class="save-slot-list">
          <div
            v-for="(entry, index) in slotEntries"
            :key="index"
            class="save-slot-row"
            :class="{
              'save-slot-row--confirm': pendingDeleteIndex === index || pendingOverwriteIndex === index,
            }"
          >
            <div v-if="pendingDeleteIndex === index" class="save-slot-confirm save-slot-confirm--row">
              <p class="save-slot-confirm-text">确定删除？此操作不可恢复</p>
              <div class="save-slot-confirm-actions">
                <button type="button" class="save-slot-btn save-slot-btn--danger" @click="confirmDelete(index)">
                  确认删除
                </button>
                <button type="button" class="save-slot-btn save-slot-btn--muted" @click="pendingDeleteIndex = null">
                  取消
                </button>
              </div>
            </div>

            <div v-else-if="pendingOverwriteIndex === index" class="save-slot-confirm save-slot-confirm--row">
              <p class="save-slot-confirm-text">将覆盖栏位 {{ index + 1 }} 的进度</p>
              <div class="save-slot-confirm-actions">
                <button type="button" class="save-slot-btn save-slot-btn--primary" @click="confirmSelect(index)">
                  确认覆盖
                </button>
                <button type="button" class="save-slot-btn save-slot-btn--muted" @click="pendingOverwriteIndex = null">
                  取消
                </button>
              </div>
            </div>

            <template v-else>
              <div
                class="save-slot-card"
                :class="{
                  'save-slot-card--active': index === activeSlot,
                  'save-slot-card--empty': !slotCountsAsOccupied(index, entry),
                }"
              >
                <div class="save-slot-card-head">
                  <span
                    class="save-slot-avatar"
                    :class="{ 'save-slot-avatar--empty': !slotCountsAsOccupied(index, entry) }"
                    :style="getOccupiedSlotAvatarStyle(index, slotCountsAsOccupied(index, entry))"
                  >
                    <img
                      v-if="slotCountsAsOccupied(index, entry) && getSlotAvatarUrl(index)"
                      :src="getSlotAvatarUrl(index)"
                      alt=""
                      class="save-slot-avatar-img"
                    />
                    <span v-else-if="slotCountsAsOccupied(index, entry)" class="save-slot-avatar-letter">{{
                      getProfileInitialLetter(index)
                    }}</span>
                    <span v-else class="save-slot-avatar-placeholder" aria-hidden="true">?</span>
                  </span>
                  <div class="save-slot-card-head-text">
                    <span class="save-slot-index">{{ slotTitle(index, entry) }}</span>
                    <span
                      v-if="entry.hasSave && entry.meta"
                      class="save-slot-phase"
                      :class="`save-slot-phase--${entry.meta.phase}`"
                    >{{ formatSavePhaseLabel(entry.meta.phase) }}</span>
                  </div>
                </div>

                <div class="save-slot-stats-grid">
                  <div
                    v-for="row in getCareerSummaryRows(entry.career)"
                    :key="row.label"
                    class="save-slot-stat-cell"
                  >
                    <span class="save-slot-stat-value">{{ row.value }}</span>
                    <span class="save-slot-stat-label">{{ row.label }}</span>
                  </div>
                </div>

                <p v-if="entry.hasSave && entry.meta" class="save-slot-time">
                  {{ formatRelativeSaveTime(entry.meta.savedAt) }}
                </p>
              </div>

              <div class="save-slot-row-actions">
                <span
                  v-if="index === activeSlot && mode === 'select'"
                  class="save-slot-current"
                  aria-current="true"
                >当前</span>
                <button
                  v-else
                  type="button"
                  class="save-slot-side-btn save-slot-side-btn--switch"
                  :aria-label="switchAriaLabel(index)"
                  @click="onSwitchSlot(index)"
                >
                  {{ switchButtonLabel(index) }}
                </button>
                <button
                  v-if="entry.hasSave"
                  type="button"
                  class="save-slot-side-btn save-slot-side-btn--delete"
                  aria-label="删除存档"
                  @click="pendingDeleteIndex = index"
                >
                  删除
                </button>
              </div>
            </template>
          </div>
        </div>

        <button type="button" class="save-slot-close" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { getProfileInitialLetter, getSlotProfile, isSlotProfileActivated } from "../profile/playerProfile.js";
import { listAllSlotEntries } from "../save/runSaveStorage.js";
import { formatRelativeSaveTime, formatSavePhaseLabel } from "../save/saveDisplayUtils.js";
import { getSlotCareerStatRows } from "../save/slotCareerStats.js";

/** @typedef {'select' | 'load' | 'new'} SaveSlotMode */

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: "select" },
  activeSlot: { type: Number, default: 0 },
  refreshKey: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "select"]);

const titleId = "save-slot-layer-title";
const pendingDeleteIndex = ref(/** @type {number | null} */ (null));
const pendingOverwriteIndex = ref(/** @type {number | null} */ (null));

const slotEntries = computed(() => {
  void props.refreshKey;
  return listAllSlotEntries();
});

const titleText = computed(() => {
  if (props.mode === "load") return "读取存档";
  if (props.mode === "new") return "选择栏位";
  return "切换存档";
});

watch(
  () => props.open,
  (v) => {
    if (v) {
      pendingDeleteIndex.value = null;
      pendingOverwriteIndex.value = null;
    }
  },
);

/** @param {number} index @param {{ hasSave: boolean }} entry */
function slotTitle(index, entry) {
  if (slotCountsAsOccupied(index, entry)) {
    return getSlotProfile(index).displayName || "Player";
  }
  return `栏位 ${index + 1}`;
}

/** @param {number} index */
function getSlotAvatarUrl(index) {
  return getSlotProfile(index).avatarDataUrl;
}

/** @param {number} index @param {{ hasSave: boolean }} entry */
function slotCountsAsOccupied(index, entry) {
  return entry.hasSave || isSlotProfileActivated(index);
}

/** @param {number} index @param {boolean} occupied */
function getOccupiedSlotAvatarStyle(index, occupied) {
  if (!occupied || getSlotAvatarUrl(index)) return undefined;
  const ch = getProfileInitialLetter(index).charCodeAt(0) || 80;
  const hue = (ch * 17) % 360;
  return { background: `hsl(${hue} 42% 62%)` };
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career */
function getCareerSummaryRows(career) {
  return getSlotCareerStatRows(career).slice(0, 3);
}

/** @param {number} index */
function switchButtonLabel(index) {
  const occupied = slotEntries.value[index]?.hasSave === true;
  if (props.mode === "load") return "读取";
  if (props.mode === "new") return occupied ? "覆盖" : "开新局";
  return "切换";
}

/** @param {number} index */
function switchAriaLabel(index) {
  return `${switchButtonLabel(index)}栏位 ${index + 1}`;
}

/** @param {number} index */
function onSwitchSlot(index) {
  const occupied = slotEntries.value[index]?.hasSave === true;
  if (props.mode === "new" && occupied) {
    pendingOverwriteIndex.value = index;
    return;
  }
  if (props.mode === "load" && !occupied) return;
  confirmSelect(index);
}

/** @param {number} index */
function confirmSelect(index) {
  pendingOverwriteIndex.value = null;
  emit("select", { index, mode: props.mode });
}

/** @param {number} index */
function confirmDelete(index) {
  pendingDeleteIndex.value = null;
  emit("select", { index, mode: "delete" });
}

function onBackdropClick() {
  if (props.mode === "select") emit("close");
}
</script>

<style scoped>
.save-slot-layer-backdrop {
  position: absolute;
  inset: 0;
  z-index: 290;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(20 * var(--rpx));
  box-sizing: border-box;
}

.save-slot-layer-scrim {
  position: absolute;
  inset: 0;
  background: rgba(60, 58, 50, 0.45);
  border-radius: calc(12 * var(--rpx));
}

.save-slot-layer-card {
  position: relative;
  width: 100%;
  max-width: calc(700 * var(--rpx));
  max-height: 92%;
  overflow-y: auto;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(24 * var(--rpx)) calc(20 * var(--rpx)) calc(18 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.save-slot-layer-title {
  margin: 0 0 calc(16 * var(--rpx));
  font-size: calc(36 * var(--rpx));
  font-weight: 800;
  text-align: center;
  color: var(--text-dark, #3c3a32);
}

.save-slot-list {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  background: var(--card);
  border-radius: var(--radius);
  padding: calc(10 * var(--rpx));
  box-sizing: border-box;
}

.save-slot-row {
  display: flex;
  align-items: stretch;
  gap: calc(10 * var(--rpx));
}

.save-slot-row--confirm {
  display: block;
}

.save-slot-card {
  flex: 1;
  min-width: 0;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(14 * var(--rpx));
  box-shadow: var(--shadow);
  border: calc(2 * var(--rpx)) solid transparent;
  box-sizing: border-box;
}

.save-slot-card--active {
  border-color: #5a8fb8;
}

.save-slot-card--empty {
  opacity: 0.96;
}

.save-slot-row-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: calc(8 * var(--rpx));
  min-width: calc(72 * var(--rpx));
  align-self: center;
}

.save-slot-card-head {
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  margin-bottom: calc(10 * var(--rpx));
}

.save-slot-avatar {
  flex-shrink: 0;
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5a8fb8;
}

.save-slot-avatar--empty {
  background: #b0a89c;
}

.save-slot-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.save-slot-avatar-letter {
  font-size: calc(24 * var(--rpx));
  font-weight: 800;
  color: #f9f6f2;
  line-height: 1;
}

.save-slot-avatar-placeholder {
  font-size: calc(26 * var(--rpx));
  font-weight: 800;
  color: #f9f6f2;
  line-height: 1;
}

.save-slot-card-head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(8 * var(--rpx));
}

.save-slot-index {
  font-size: calc(24 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
}

.save-slot-phase {
  font-size: calc(18 * var(--rpx));
  font-weight: 700;
  padding: calc(4 * var(--rpx)) calc(10 * var(--rpx));
  border-radius: calc(6 * var(--rpx));
  color: #f9f6f2;
  background: #5a8fb8;
}

.save-slot-phase--shop {
  background: #d4954a;
}

.save-slot-phase--settlement {
  background: #8b7355;
}

.save-slot-phase--run_end_win {
  background: #7cb342;
}

.save-slot-phase--run_end_fail {
  background: #c85a54;
}

.save-slot-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: calc(8 * var(--rpx));
}

.save-slot-stat-cell {
  background: var(--card);
  border-radius: calc(8 * var(--rpx));
  padding: calc(10 * var(--rpx));
  display: flex;
  flex-direction: column;
  gap: calc(4 * var(--rpx));
  min-width: 0;
}

.save-slot-stat-value {
  font-size: calc(20 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}

.save-slot-stat-label {
  font-size: calc(16 * var(--rpx));
  color: var(--text-muted, #776e65);
}

.save-slot-time {
  margin: calc(10 * var(--rpx)) 0 0;
  font-size: calc(18 * var(--rpx));
  color: var(--text-muted, #776e65);
}

.save-slot-current {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(44 * var(--rpx));
  padding: 0 calc(8 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  font-weight: 800;
  color: #5a8fb8;
}

.save-slot-side-btn {
  border: none;
  border-radius: calc(8 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(8 * var(--rpx));
  font-family: inherit;
  font-size: calc(20 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  box-shadow: var(--shadow);
  transition: filter 0.12s ease;
}

.save-slot-side-btn:hover {
  filter: brightness(1.05);
}

.save-slot-side-btn:active {
  filter: brightness(0.92);
}

.save-slot-side-btn--switch {
  background: #5a8fb8;
  color: #f9f6f2;
}

.save-slot-side-btn--delete {
  background: transparent;
  color: #c85a54;
  border: calc(2 * var(--rpx)) solid #c85a54;
  box-shadow: none;
}

.save-slot-confirm {
  background: #f5e6e5;
  border-radius: calc(8 * var(--rpx));
  padding: calc(10 * var(--rpx));
}

.save-slot-confirm--row {
  width: 100%;
  box-sizing: border-box;
}

.save-slot-confirm-actions {
  display: flex;
  gap: calc(8 * var(--rpx));
  flex-wrap: wrap;
}

.save-slot-confirm-text {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(20 * var(--rpx));
  color: #8b3a34;
  font-weight: 700;
}

.save-slot-btn {
  flex: 1;
  min-width: calc(100 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  color: #f9f6f2;
}

.save-slot-btn--primary {
  background: #5a8fb8;
}

.save-slot-btn--danger {
  background: #c85a54;
}

.save-slot-btn--muted {
  background: #b0a89c;
}

.save-slot-close {
  margin-top: calc(14 * var(--rpx));
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(14 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  background: #d4954a;
  color: #f9f6f2;
  box-shadow: var(--shadow);
}

.save-slot-layer-enter-active,
.save-slot-layer-leave-active {
  transition: opacity 0.18s ease;
}

.save-slot-layer-enter-from,
.save-slot-layer-leave-to {
  opacity: 0;
}
</style>
