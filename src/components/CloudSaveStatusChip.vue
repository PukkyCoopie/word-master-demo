<template>
  <div
    v-if="visible"
    class="cloud-save-status-chip"
    :class="`cloud-save-status-chip--${syncState}`"
    :title="statusLabel"
    aria-live="polite"
  >
    <i class="ri-cloud-line cloud-save-status-chip__icon" aria-hidden="true"></i>
    <span class="cloud-save-status-chip__label">{{ statusLabel }}</span>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Capacitor } from "@capacitor/core";
import { cloudSaveUiState, getCloudSaveStatusLabel } from "../save/cloudSave/cloudSaveState.js";
import { isTapTapAccount } from "../taptap/tapTapPlugin.js";

const props = defineProps({
  account: { type: Object, default: null },
});

const visible = computed(
  () => Capacitor.isNativePlatform() && isTapTapAccount(props.account),
);

const syncState = computed(() => cloudSaveUiState.syncState);
const statusLabel = computed(() => getCloudSaveStatusLabel());
</script>

<style scoped>
.cloud-save-status-chip {
  display: inline-flex;
  align-items: center;
  gap: calc(6 * var(--rpx));
  padding: calc(6 * var(--rpx)) calc(12 * var(--rpx));
  border-radius: calc(999 * var(--rpx));
  background: var(--card);
  color: #4a6075;
  font-size: calc(20 * var(--rpx));
  font-weight: 600;
  line-height: 1.2;
  pointer-events: none;
  flex-shrink: 0;
}

.cloud-save-status-chip__icon {
  font-size: calc(22 * var(--rpx));
}

.cloud-save-status-chip--pending {
  color: #8a6d3b;
}

.cloud-save-status-chip--syncing {
  color: #3d6f96;
}

.cloud-save-status-chip--error {
  color: #a94442;
}

.cloud-save-status-chip--conflict {
  color: #8a6d3b;
}
</style>
