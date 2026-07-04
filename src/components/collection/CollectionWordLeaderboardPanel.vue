<template>
  <div class="collection-word-panel">
    <SettingsSegmentControl
      v-model="subTab"
      class="collection-word-panel__tabs"
      aria-label="单词榜分类"
      :options="wordSubTabs"
    />
    <CollectionWordLeaderboard
      v-if="subTab !== 'favorites'"
      :sort-key="subTab"
      :records="activeRecords"
      @select-tile="$emit('select-tile', $event)"
      @select-treasure="$emit('select-treasure', $event)"
    />
    <FavoriteWordsList
      v-else
      :entries="favoriteWords"
      :pending-unfavorite-keys="pendingUnfavoriteKeys"
      @toggle-favorite="togglePendingUnfavorite"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import SettingsSegmentControl from "../SettingsSegmentControl.vue";
import CollectionWordLeaderboard from "./CollectionWordLeaderboard.vue";
import FavoriteWordsList from "../FavoriteWordsList.vue";
import { gameSettings, getWordFavoriteButtonEnabled } from "../../settings/gameSettings.js";
import { normalizeFavoriteWordKey } from "../../vocabulary/wordFavorites.js";

const props = defineProps({
  scoreRecords: { type: Array, default: () => [] },
  lengthRecords: { type: Array, default: () => [] },
  favoriteWords: { type: Array, default: () => [] },
});

const emit = defineEmits(["select-tile", "select-treasure", "sub-tab-change", "unfavorite"]);

const subTab = ref("score");
/** @type {import('vue').Ref<string[]>} */
const pendingUnfavoriteKeys = ref([]);

const wordSubTabs = computed(() => {
  void gameSettings.wordFavoriteButtonEnabled;
  const tabs = [
    { id: "score", label: "单词得分" },
    { id: "length", label: "单词长度" },
  ];
  if (getWordFavoriteButtonEnabled()) {
    tabs.push({ id: "favorites", label: "已收藏" });
  }
  return tabs;
});

const activeRecords = computed(() =>
  subTab.value === "length" ? props.lengthRecords : props.scoreRecords,
);

function flushPendingUnfavorites() {
  const words = [...pendingUnfavoriteKeys.value];
  pendingUnfavoriteKeys.value = [];
  for (const word of words) {
    emit("unfavorite", word);
  }
}

/** @param {string} word */
function togglePendingUnfavorite(word) {
  const key = normalizeFavoriteWordKey(word);
  if (!key) return;
  const ix = pendingUnfavoriteKeys.value.indexOf(key);
  if (ix >= 0) {
    pendingUnfavoriteKeys.value = pendingUnfavoriteKeys.value.filter((k) => k !== key);
  } else {
    pendingUnfavoriteKeys.value = [...pendingUnfavoriteKeys.value, key];
  }
}

defineExpose({ flushPendingUnfavorites });

watch(
  () => gameSettings.wordFavoriteButtonEnabled,
  () => {
    if (!getWordFavoriteButtonEnabled() && subTab.value === "favorites") {
      flushPendingUnfavorites();
      subTab.value = "score";
    }
  },
);

watch(subTab, (newTab, oldTab) => {
  if (oldTab != null && oldTab !== newTab) {
    flushPendingUnfavorites();
  }
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
