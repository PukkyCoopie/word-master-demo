<template>
  <header
    class="tile-letter-showcase"
    :class="{ 'tile-letter-showcase--start': contentAlign === 'start' }"
    :aria-label="ariaLabel || undefined"
  >
    <div class="tile-letter-strip">
      <div
        v-for="(row, rowIndex) in rows"
        :key="rowIndex"
        class="tile-letter-row"
      >
        <LetterTile
          v-for="(item, colIndex) in row"
          :key="`${rowIndex}-${item.letter}-${colIndex}`"
          variant="menu"
          :letter="item.letter"
          :rarity="item.rarity"
          :menu-cycle-sec="pulseCycleSec"
          :style="{ animationDelay: `${showcaseAnimDelay(rowIndex, colIndex)}s` }"
        />
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import LetterTile from "./LetterTile.vue";

const props = defineProps({
  /** 每行一组 { letter, rarity }，与主菜单 WORD / MASTER 同款 tile */
  rows: { type: Array, required: true },
  ariaLabel: { type: String, default: "" },
  pulseStaggerSec: { type: Number, default: 0.28 },
  /** center：主菜单；start：商店等左上角招牌 */
  contentAlign: {
    type: String,
    default: "center",
    validator: (v) => v === "center" || v === "start",
  },
});

function showcaseAnimDelay(rowIndex, colIndex) {
  let index = colIndex;
  for (let r = 0; r < rowIndex; r++) index += props.rows[r].length;
  return index * props.pulseStaggerSec;
}

const pulseCycleSec = computed(() =>
  props.rows.reduce((n, row) => n + row.length, 0) * props.pulseStaggerSec,
);
</script>

<style scoped>
.tile-letter-showcase {
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
}

.tile-letter-showcase--start .tile-letter-row {
  justify-content: flex-start;
}

.tile-letter-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(12 * var(--rpx));
  padding: calc(24 * var(--rpx)) calc(28 * var(--rpx));
  background: var(--letter-grid-bg);
  border-radius: calc(14 * var(--rpx));
  box-shadow: inset 0 calc(2 * var(--rpx)) calc(6 * var(--rpx)) rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.tile-letter-showcase--start .tile-letter-strip {
  align-items: flex-start;
}

.tile-letter-row {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: calc(8 * var(--rpx));
}
</style>
