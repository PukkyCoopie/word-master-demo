<template>
  <div class="favorite-words-list">
    <p v-if="!groupedSections.length" class="favorite-words-list__empty">
      还没有收藏的单词
    </p>
    <p v-if="!groupedSections.length" class="favorite-words-list__hint">
      拼词时点星标即可添加
    </p>
    <section
      v-for="group in groupedSections"
      :key="group.key"
      class="collection-group favorite-words-list__group"
    >
      <div class="collection-group-divider" aria-hidden="true">
        <span class="collection-group-divider__label">{{ group.label }}</span>
      </div>
      <article
        v-for="entry in group.entries"
        :key="entry.word"
        class="favorite-words-entry"
      >
        <header class="favorite-words-entry__head">
          <h3 class="favorite-words-entry__word">{{ displayWord(entry.word) }}</h3>
          <WordFavoriteButton
            v-if="showUnfavorite"
            :favorited="isEntryFavorited(entry.word)"
            :word="entry.word"
            @toggle="onToggleFavorite(entry.word)"
          />
        </header>
        <div v-if="entry.definitionLines.length" class="favorite-words-entry__lines">
          <p
            v-for="(line, idx) in entry.definitionLines"
            :key="`${entry.word}-${idx}`"
            class="favorite-words-entry__line"
          >
            <span v-if="parsePosPrefix(line).prefix" class="favorite-words-entry__pos">{{
              parsePosPrefix(line).prefix
            }}</span>
            <span class="favorite-words-entry__meaning">{{ parsePosPrefix(line).body }}</span>
          </p>
        </div>
        <p v-else class="favorite-words-entry__no-def">暂无释义</p>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import WordFavoriteButton from "./WordFavoriteButton.vue";
import { normalizeFavoriteWordKey } from "../vocabulary/wordFavorites.js";

const props = defineProps({
  entries: { type: Array, default: () => [] },
  showUnfavorite: { type: Boolean, default: true },
  pendingUnfavoriteKeys: { type: Array, default: () => [] },
});

const emit = defineEmits(["toggle-favorite"]);

const sortedEntries = computed(() => {
  const list = Array.isArray(props.entries) ? props.entries : [];
  return [...list].sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
});

const groupedSections = computed(() => {
  /** @type {Map<string, { key: string, label: string, sortKey: number, entries: typeof sortedEntries.value }>} */
  const groups = new Map();
  for (const entry of sortedEntries.value) {
    const meta = resolveDateGroup(entry.favoritedAt);
    let group = groups.get(meta.key);
    if (!group) {
      group = { key: meta.key, label: meta.label, sortKey: meta.sortKey, entries: [] };
      groups.set(meta.key, group);
    }
    group.entries.push(entry);
  }
  return [...groups.values()].sort((a, b) => b.sortKey - a.sortKey);
});

const pendingKeySet = computed(
  () => new Set(props.pendingUnfavoriteKeys.map((key) => normalizeFavoriteWordKey(key)).filter(Boolean)),
);

/** @param {string} word */
function isEntryFavorited(word) {
  const key = normalizeFavoriteWordKey(word);
  if (!key) return false;
  return !pendingKeySet.value.has(key);
}

/** @param {string} word */
function onToggleFavorite(word) {
  emit("toggle-favorite", word);
}

/** @param {string} word */
function displayWord(word) {
  return String(word ?? "").trim().toUpperCase();
}

/**
 * @param {number} ts
 * @returns {{ key: string, label: string, sortKey: number }}
 */
function resolveDateGroup(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) {
    return { key: "unknown", label: "未记录日期", sortKey: 0 };
  }
  const d = new Date(n);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const now = new Date();
  const label =
    year === now.getFullYear()
      ? `${month}月${day}日`
      : `${year}年${month}月${day}日`;
  const sortKey = Date.UTC(year, month - 1, day);
  return { key, label, sortKey };
}

/**
 * @param {string} line
 */
function parsePosPrefix(line) {
  const text = String(line ?? "").trim();
  const m = text.match(/^((?:n|v|vi|vt|adj|adv|a|prep|conj|pron|num|art|interj|aux|det|abbr)\.\s*)/i);
  if (!m) return { prefix: "", body: text };
  return { prefix: m[1], body: text.slice(m[1].length).trim() };
}
</script>

<style scoped>
.favorite-words-list {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
}

.favorite-words-list__group {
  gap: calc(14 * var(--rpx));
}

.favorite-words-list__empty {
  margin: calc(8 * var(--rpx)) 0 0;
  text-align: center;
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.favorite-words-list__hint {
  margin: 0 0 calc(8 * var(--rpx));
  text-align: center;
  font-size: calc(24 * var(--rpx));
  line-height: 1.5;
  color: rgba(74, 66, 56, 0.62);
}

.favorite-words-entry {
  box-sizing: border-box;
  padding: calc(18 * var(--rpx)) calc(20 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: var(--card-bright, #fff);
  box-shadow: var(--shadow);
  border: calc(1 * var(--rpx)) solid rgba(155, 89, 182, 0.14);
}

.favorite-words-entry__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(10 * var(--rpx));
}

.favorite-words-entry__word {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  letter-spacing: calc(0.04 * 1em);
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}

.favorite-words-entry__lines {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
}

.favorite-words-entry__line {
  margin: 0;
  font-size: calc(24 * var(--rpx));
  line-height: 1.5;
  color: var(--text, #4a4238);
}

.favorite-words-entry__pos {
  font-weight: 700;
  color: #9b59b6;
  margin-right: calc(4 * var(--rpx));
}

.favorite-words-entry__meaning {
  font-weight: 400;
}

.favorite-words-entry__no-def {
  margin: 0;
  font-size: calc(22 * var(--rpx));
  color: rgba(74, 66, 56, 0.55);
}
</style>
