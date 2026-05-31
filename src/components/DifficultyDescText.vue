<template>
  <div class="difficulty-desc-text" :class="sizeClass">
    <p class="difficulty-desc-line">
      <template v-for="(seg, i) in mainSegments" :key="`m-${i}`">
        <span v-if="seg.type === 'text'">{{ seg.v }}</span>
        <span v-else-if="seg.type === 'money'" class="difficulty-desc-money">
          <span class="difficulty-desc-money-dollar">$</span>{{ seg.v }}
        </span>
      </template>
    </p>
    <p v-if="parenSegments.length" class="difficulty-desc-line difficulty-desc-line--paren">
      <template v-for="(seg, i) in parenSegments" :key="`p-${i}`">
        <span v-if="seg.type === 'text'">{{ seg.v }}</span>
        <span v-else-if="seg.type === 'money'" class="difficulty-desc-money">
          <span class="difficulty-desc-money-dollar">$</span>{{ seg.v }}
        </span>
      </template>
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { parsePlainEffectCopyToSegments } from "../treasures/treasureDescription.js";

const props = defineProps({
  description: { type: String, default: "" },
  /** normal | medium | long */
  size: { type: String, default: "normal" },
});

/** @param {string} text */
function splitDescriptionParts(text) {
  const s = String(text ?? "").trim();
  const idx = s.search(/[（(]/);
  if (idx <= 0) return { main: s, paren: "" };
  return {
    main: s.slice(0, idx).trim(),
    paren: s.slice(idx).trim(),
  };
}

const descParts = computed(() => splitDescriptionParts(props.description));
const mainSegments = computed(() => parsePlainEffectCopyToSegments(descParts.value.main));
const parenSegments = computed(() =>
  descParts.value.paren ? parsePlainEffectCopyToSegments(descParts.value.paren) : [],
);

const sizeClass = computed(() => {
  if (props.size === "long") return "difficulty-desc-text--long";
  if (props.size === "medium") return "difficulty-desc-text--medium";
  return "";
});
</script>

<style scoped>
.difficulty-desc-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(2 * var(--rpx));
  width: 100%;
  min-width: 0;
}

.difficulty-desc-line {
  margin: 0;
  font-size: calc(20 * var(--rpx));
  line-height: 1.35;
  color: var(--text-dark, #3c3a32);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  width: 100%;
}

.difficulty-desc-line--paren {
  -webkit-line-clamp: 1;
  opacity: 0.88;
}

.difficulty-desc-text--medium .difficulty-desc-line {
  font-size: calc(18 * var(--rpx));
  line-height: 1.32;
}

.difficulty-desc-text--long .difficulty-desc-line {
  font-size: calc(16 * var(--rpx));
  line-height: 1.3;
}

.difficulty-desc-money {
  color: var(--money-gold, #b8860b);
  font-weight: 700;
}

.difficulty-desc-money-dollar {
  font-weight: 700;
}
</style>
