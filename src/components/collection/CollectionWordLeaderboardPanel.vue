<template>
  <div class="collection-word-panel">
    <SettingsSegmentControl
      v-model="subTab"
      class="collection-word-panel__tabs"
      aria-label="单词榜分类"
      :options="WORD_SUB_TABS"
    />
    <CollectionWordLeaderboard
      :sort-key="subTab"
      :records="activeRecords"
      @select-tile="$emit('select-tile', $event)"
      @select-treasure="$emit('select-treasure', $event)"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import SettingsSegmentControl from "../SettingsSegmentControl.vue";
import CollectionWordLeaderboard from "./CollectionWordLeaderboard.vue";

const WORD_SUB_TABS = Object.freeze([
  { id: "score", label: "单词得分" },
  { id: "length", label: "单词长度" },
]);

const props = defineProps({
  scoreRecords: { type: Array, default: () => [] },
  lengthRecords: { type: Array, default: () => [] },
});

const emit = defineEmits(["select-tile", "select-treasure", "sub-tab-change"]);

const subTab = ref("score");

const activeRecords = computed(() =>
  subTab.value === "length" ? props.lengthRecords : props.scoreRecords,
);

watch(subTab, () => {
  emit("sub-tab-change");
});
</script>

<style scoped>
.collection-word-panel {
  display: flex;
  flex-direction: column;
  gap: calc(16 * var(--rpx));
}

.collection-word-panel__tabs {
  flex: 0 0 auto;
  width: 100%;
  max-width: none;
}

.collection-word-panel__tabs :deep(.settings-segment) {
  --seg-pad: calc(5 * var(--rpx));
  max-width: none;
}

.collection-word-panel__tabs :deep(.settings-segment-btn) {
  padding: calc(12 * var(--rpx)) calc(10 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  line-height: 1.25;
}
</style>
