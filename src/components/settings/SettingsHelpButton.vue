<template>
  <button
    type="button"
    class="settings-help-btn"
    :class="{ 'settings-help-btn--active': dialogOpen }"
    :aria-label="ariaLabel"
    @click.stop="openDialog"
  >
    <i class="ri-question-line" aria-hidden="true" />
  </button>
  <Teleport to="body">
    <SettingsHelpDialog
      :open="dialogOpen"
      :title="helpContent.title"
      :paragraphs="helpContent.paragraphs"
      :demo-variant="helpContent.demoVariant"
      @close="closeDialog"
    />
  </Teleport>
</template>

<script setup>
import { computed, ref } from "vue";
import { getSettingsHelpContent } from "../../settings/settingsHelpCopy.js";
import SettingsHelpDialog from "./SettingsHelpDialog.vue";

const props = defineProps({
  /** @type {import('vue').PropType<import('../../settings/settingsHelpCopy.js').SettingsHelpId>} */
  helpId: {
    type: String,
    required: true,
    validator: (v) => ["mark", "swap", "markOnSwap", "highRisk", "confirmButtonSide"].includes(String(v)),
  },
  ariaLabel: { type: String, default: "查看说明" },
});

const dialogOpen = ref(false);

const helpContent = computed(() => getSettingsHelpContent(props.helpId));

function openDialog() {
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
}
</script>

<style scoped>
.settings-help-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: calc(6 * var(--rpx));
  padding: calc(4 * var(--rpx));
  border: none;
  border-radius: 0;
  background: transparent;
  color: #d4954a;
  font-size: calc(30 * var(--rpx));
  line-height: 1;
  cursor: pointer;
  transition: color 0.12s ease, opacity 0.12s ease;
}

.settings-help-btn:hover,
.settings-help-btn--active {
  color: #c0823a;
  opacity: 1;
}

.settings-help-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid #d4954a;
  outline-offset: calc(2 * var(--rpx));
  border-radius: calc(4 * var(--rpx));
}
</style>
