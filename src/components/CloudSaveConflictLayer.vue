<template>
  <Transition name="cloud-save-conflict">
    <div
      v-if="open"
      class="cloud-save-conflict-backdrop portal-overlay-fill"
      :style="backdropStackStyle"
      role="presentation"
    >
      <div class="cloud-save-conflict-scrim" aria-hidden="true" />
      <div
        class="cloud-save-conflict-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cloud-save-conflict-title"
        @click.stop
      >
        <h2 id="cloud-save-conflict-title" class="cloud-save-conflict-title">发现云存档冲突</h2>
        <p class="cloud-save-conflict-message">
          本机与 TapTap 云端都有存档，请选择要保留的版本。
        </p>

        <div class="cloud-save-conflict-columns">
          <section class="cloud-save-conflict-panel">
            <h3 class="cloud-save-conflict-panel-title">本机存档</h3>
            <p class="cloud-save-conflict-time">{{ localTimeLabel }}</p>
            <div class="cloud-save-conflict-slots">
              <div
                v-for="entry in localSlotEntries"
                :key="`local-${entry.index}`"
                class="cloud-save-conflict-slot"
              >
                <span class="cloud-save-conflict-slot-title">槽位 {{ entry.index + 1 }}</span>
                <div class="cloud-save-conflict-slot-stats">
                  <span
                    v-for="row in entry.rows"
                    :key="row.label"
                    class="cloud-save-conflict-stat"
                  >
                    {{ row.label }} {{ row.value }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section class="cloud-save-conflict-panel">
            <h3 class="cloud-save-conflict-panel-title">云端存档</h3>
            <p class="cloud-save-conflict-time">{{ cloudTimeLabel }}</p>
            <div class="cloud-save-conflict-slots">
              <div
                v-for="entry in cloudSlotEntries"
                :key="`cloud-${entry.index}`"
                class="cloud-save-conflict-slot"
              >
                <span class="cloud-save-conflict-slot-title">槽位 {{ entry.index + 1 }}</span>
                <div class="cloud-save-conflict-slot-stats">
                  <span
                    v-for="row in entry.rows"
                    :key="row.label"
                    class="cloud-save-conflict-stat"
                  >
                    {{ row.label }} {{ row.value }}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="cloud-save-conflict-actions">
          <button
            type="button"
            class="cloud-save-conflict-btn cloud-save-conflict-btn--primary"
            @click="emit('use-cloud')"
          >
            使用云端存档
          </button>
          <button
            type="button"
            class="cloud-save-conflict-btn cloud-save-conflict-btn--secondary"
            @click="emit('use-local')"
          >
            使用本地存档
          </button>
          <button
            type="button"
            class="cloud-save-conflict-btn cloud-save-conflict-btn--ghost"
            @click="emit('defer')"
          >
            稍后决定
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { getBundleExportedAt, getBundleSlotSummaries } from "../save/cloudSave/cloudSaveBundle.js";
import { formatCloudSaveTimestamp } from "../save/cloudSave/cloudSaveMetadata.js";
import { getSlotCareerSummaryRows, normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import { createEmptySlotCareerStats } from "../save/runSaveSchema.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  localBundle: { type: Object, default: null },
  cloudBundle: { type: Object, default: null },
});

const emit = defineEmits(["use-cloud", "use-local", "defer"]);

const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : {}));

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) stackZ.value = bumpOverlayZ();
  },
  { immediate: true },
);

const localTimeLabel = computed(() =>
  formatCloudSaveTimestamp(getBundleExportedAt(props.localBundle)),
);
const cloudTimeLabel = computed(() =>
  formatCloudSaveTimestamp(getBundleExportedAt(props.cloudBundle)),
);

function buildSlotEntries(bundle) {
  if (!bundle) return [];
  return getBundleSlotSummaries(bundle).map((entry) => ({
    index: entry.index,
    rows: getSlotCareerSummaryRows(
      normalizeSlotCareerStats(entry.career ?? createEmptySlotCareerStats()),
    ).slice(0, 3),
  }));
}

const localSlotEntries = computed(() => buildSlotEntries(props.localBundle));
const cloudSlotEntries = computed(() => buildSlotEntries(props.cloudBundle));
</script>

<style scoped>
.cloud-save-conflict-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cloud-save-conflict-scrim {
  position: absolute;
  inset: 0;
  background: rgba(18, 28, 38, 0.52);
  box-shadow: 0 0 0 100vmax rgba(18, 28, 38, 0.52);
}

.cloud-save-conflict-card {
  position: relative;
  width: min(calc(680 * var(--rpx)), 92vw);
  max-height: min(82vh, calc(980 * var(--rpx)));
  overflow: auto;
  padding: calc(28 * var(--rpx));
  border-radius: calc(16 * var(--rpx));
  background: #f4f7fa;
  color: #2f4050;
}

.cloud-save-conflict-title {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(34 * var(--rpx));
}

.cloud-save-conflict-message {
  margin: 0 0 calc(20 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  color: #5a7082;
}

.cloud-save-conflict-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(16 * var(--rpx));
}

.cloud-save-conflict-panel {
  padding: calc(16 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: #fff;
}

.cloud-save-conflict-panel-title {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(26 * var(--rpx));
}

.cloud-save-conflict-time {
  margin: 0 0 calc(12 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  color: #6b8194;
}

.cloud-save-conflict-slot + .cloud-save-conflict-slot {
  margin-top: calc(10 * var(--rpx));
  padding-top: calc(10 * var(--rpx));
  border-top: calc(1 * var(--rpx)) solid #e3eaf0;
}

.cloud-save-conflict-slot-title {
  display: block;
  margin-bottom: calc(6 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  font-weight: 600;
}

.cloud-save-conflict-slot-stats {
  display: flex;
  flex-wrap: wrap;
  gap: calc(8 * var(--rpx));
}

.cloud-save-conflict-stat {
  font-size: calc(20 * var(--rpx));
  color: #607487;
}

.cloud-save-conflict-actions {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  margin-top: calc(24 * var(--rpx));
}

.cloud-save-conflict-btn {
  min-height: calc(72 * var(--rpx));
  border: none;
  border-radius: calc(12 * var(--rpx));
  font-size: calc(26 * var(--rpx));
}

.cloud-save-conflict-btn--primary {
  background: #5a8fb8;
  color: #fff;
}

.cloud-save-conflict-btn--secondary {
  background: #dce8f2;
  color: #2f4050;
}

.cloud-save-conflict-btn--ghost {
  background: transparent;
  color: #607487;
}
</style>
