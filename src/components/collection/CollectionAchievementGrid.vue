<template>
  <div class="collection-grid collection-grid--achievements">
    <article
      v-for="entry in entries"
      :key="entry.id"
      class="collection-achievement-cell"
      :class="{ 'collection-achievement-cell--locked': !entry.unlocked }"
    >
      <div class="collection-achievement-cell__content">
        <img
          class="collection-achievement-cell__icon"
          :src="entry.iconUrl"
          :alt="entry.name"
          width="256"
          height="256"
          decoding="async"
          loading="lazy"
        />
        <div class="collection-achievement-cell__body">
          <h3 class="collection-achievement-cell__name">{{ entry.name }}</h3>
          <p class="collection-achievement-cell__desc">
            <TreasureDescSegmentList :segments="entry.descriptionSegments" />
          </p>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  ACHIEVEMENT_DEFINITIONS,
  getAchievementIconUrl,
} from "../../achievements/achievementDefinitions.js";
import { getAchievementDescriptionSegments } from "../../achievements/achievementRichDesc.js";
import TreasureDescSegmentList from "../TreasureDescSegmentList.vue";

const props = defineProps({
  unlockedAchievementIds: { type: Array, default: () => [] },
});

const unlockedSet = computed(() => new Set((props.unlockedAchievementIds ?? []).map(String)));

const entries = computed(() =>
  ACHIEVEMENT_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    descriptionSegments: getAchievementDescriptionSegments(def),
    iconUrl: getAchievementIconUrl(def),
    unlocked: unlockedSet.value.has(def.id),
  })),
);
</script>

<style scoped>
.collection-grid--achievements {
  width: 100%;
  display: flex;
  flex-direction: column;
  --achievement-row-bg-dark: rgba(24, 22, 19, 0.98);
  --achievement-row-bg-light: rgba(36, 34, 30, 0.96);
  --achievement-fg: rgba(248, 244, 238, 0.9);
  --achievement-fg-strong: rgba(252, 248, 242, 0.98);
  border-radius: calc(12 * var(--rpx));
  overflow: hidden;
  border: calc(1 * var(--rpx)) solid rgba(255, 255, 255, 0.09);
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.05);
  background: var(--achievement-row-bg-dark);
}

.collection-achievement-cell {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  background: var(--achievement-row-bg-dark);
}

.collection-achievement-cell:nth-child(even) {
  background: var(--achievement-row-bg-light);
}

.collection-achievement-cell:not(:first-child) {
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.05);
}

.collection-achievement-cell__content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: calc(16 * var(--rpx));
  width: 100%;
  min-width: 0;
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  box-sizing: border-box;
}

.collection-achievement-cell--locked .collection-achievement-cell__content {
  opacity: 0.55;
}

.collection-achievement-cell__icon {
  width: calc(68 * var(--rpx));
  height: calc(68 * var(--rpx));
  flex-shrink: 0;
  border-radius: calc(12 * var(--rpx));
  object-fit: cover;
}

.collection-achievement-cell__body {
  flex: 1 1 auto;
  min-width: 0;
  padding: calc(2 * var(--rpx)) 0;
}

.collection-achievement-cell--locked .collection-achievement-cell__icon {
  filter: grayscale(1);
}

.collection-achievement-cell__name {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  line-height: 1.25;
  color: var(--achievement-fg-strong);
}

.collection-achievement-cell__desc {
  margin: 0;
  font-size: calc(22 * var(--rpx));
  line-height: 1.5;
  color: var(--achievement-fg);
  word-break: break-word;
}

.collection-achievement-cell__desc :deep(.td-desc-chip) {
  display: inline;
  margin: 0 0.12em;
  font-weight: 400;
  white-space: nowrap;
}

.collection-achievement-cell__desc :deep(.td-desc-gain),
.collection-achievement-cell__desc :deep(.td-desc-gain-block) {
  font-weight: 900;
  color: var(--achievement-fg-strong);
}

.collection-achievement-cell__desc :deep(.td-desc-mult) {
  color: var(--treasure-desc-mult);
}

.collection-achievement-cell__desc :deep(.td-desc-mult--times) {
  background: var(--mult-accent);
  color: #fff;
  border-radius: calc(6 * var(--rpx));
  padding: calc(2 * var(--rpx)) calc(8 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.collection-achievement-cell__desc :deep(.td-desc-score) {
  color: var(--treasure-desc-score);
}

.collection-achievement-cell__desc :deep(.td-desc-money) {
  color: var(--shop-reroll-price-accent, #ffe566);
  font-weight: 700;
}

.collection-achievement-cell__desc :deep(.td-desc-prob) {
  color: var(--treasure-desc-prob);
  font-weight: 700;
}
</style>
