<template>
  <div class="run-end-discovery-strip">
    <div ref="rowRef" class="run-end-discovery-strip__row">
      <div ref="stripRef" class="run-end-discovery-strip__scroll">
        <button
          v-for="item in items"
          :key="item.key"
          ref="chipRefs"
          type="button"
          class="run-end-discovery-chip"
          :aria-label="item.ariaLabel"
          @click="onChipClick(item, $event)"
        >
          <VoucherStampStack
            v-if="item.kind === 'voucher'"
            class="run-end-discovery-chip__voucher"
            :stamps="item.stamps"
            compact
          />
          <LetterTile
            v-else-if="item.kind === 'material'"
            variant="grid"
            class="run-end-discovery-chip__material grid-tile"
            :letter="item.materialId === 'wildcard' ? '?' : '·'"
            :hide-letter="item.materialId !== 'wildcard'"
            hide-rarity-gem
            :material-id="item.materialId"
          />
          <span
            v-else-if="item.kind === 'accessory'"
            class="run-end-discovery-chip__accessory"
            :class="item.scopeClass"
          >
            <span
              :class="
                item.scopeClass === 'treasure-accessory-chip'
                  ? 'treasure-accessory-chip-ripple'
                  : 'tile-accessory-chip-ripple'
              "
              aria-hidden="true"
            />
            <i
              :class="[
                item.scopeClass === 'treasure-accessory-chip'
                  ? 'treasure-accessory-chip-icon'
                  : 'tile-accessory-chip-icon',
                item.iconClass,
              ]"
              aria-hidden="true"
            />
          </span>
          <div
            v-else
            class="run-end-discovery-chip__frame shop-treasure-frame"
            :class="{
              'shop-treasure-frame--spell-offer': item.kind === 'spell',
              'shop-treasure-frame--length-offer':
                item.kind === 'upgrade' && item.upgradeKind !== 'rarity' && upgradeBadge(item),
              'shop-treasure-frame--pack-rarity':
                item.kind === 'upgrade' && item.upgradeKind === 'rarity',
            }"
          >
            <template v-if="item.kind === 'treasure'">
              <span class="letter-gem" :class="'gem-' + (item.rarity || 'common')" aria-hidden="true" />
              <span class="shop-treasure-emoji" role="img" :aria-label="item.name">{{ item.emoji }}</span>
            </template>
            <template v-else-if="item.kind === 'spell' || item.kind === 'upgrade'">
              <i
                v-if="item.iconClass"
                class="shop-treasure-emoji shop-treasure-emoji--icon"
                :class="item.iconClass"
                aria-hidden="true"
              />
              <span
                v-if="item.kind === 'upgrade' && item.upgradeKind === 'rarity' && upgradeBadge(item)"
                class="shop-pack-rarity-caption"
                >{{ upgradeBadge(item) }}</span
              >
              <span
                v-else-if="item.kind === 'upgrade' && upgradeBadge(item)"
                class="shop-upgrade-length"
                :class="{ 'shop-upgrade-length--single-digit': isSingleDigitLabel(upgradeBadge(item)) }"
                >{{ upgradeBadge(item) }}</span
              >
            </template>
          </div>
        </button>
      </div>
      <span
        v-if="hiddenCount > 0"
        ref="pillRef"
        class="run-end-discovery-strip__overflow-pill"
        aria-hidden="true"
      >
        +{{ hiddenCount }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import LetterTile from "./LetterTile.vue";
import VoucherStampStack from "./VoucherStampStack.vue";
import { isSingleDigitLabel } from "./detailLayerFormatters.js";

const props = defineProps({
  /** @type {import('vue').PropType<import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem[]>} */
  items: { type: Array, default: () => [] },
});

const emit = defineEmits(["select"]);

const rowRef = ref(null);
const stripRef = ref(null);
const pillRef = ref(null);
const chipRefs = ref([]);
const visibleCount = ref(0);

const hiddenCount = computed(() => Math.max(0, props.items.length - visibleCount.value));

/** @type {ResizeObserver | null} */
let resizeObserver = null;

/** @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} item */
function upgradeBadge(item) {
  if (item.kind !== "upgrade") return "";
  return String(item.lengthBadgeLabel || item.lengthLabel || "").trim();
}

/** @param {HTMLElement[]} chips @param {number} available @param {number} gap */
function countFitChips(chips, available, gap) {
  let used = 0;
  let count = 0;
  for (const el of chips) {
    const w = el.offsetWidth;
    const nextUsed = count === 0 ? w : used + gap + w;
    if (nextUsed > available + 0.5) break;
    used = nextUsed;
    count += 1;
  }
  return count;
}

function measureVisibleCount() {
  const row = rowRef.value;
  const chips = chipRefs.value.filter((el) => el instanceof HTMLElement);
  if (!row || chips.length === 0) {
    visibleCount.value = props.items.length;
    return;
  }

  const rowWidth = row.clientWidth;
  const gap = readGapPx(stripRef.value);
  const fitAll = countFitChips(chips, rowWidth, gap);
  if (fitAll >= props.items.length) {
    visibleCount.value = props.items.length;
    return;
  }

  const pillWidth = pillRef.value?.offsetWidth ?? estimatePillWidth(row);
  const rowGap = readGapPx(rowRef.value);
  const available = Math.max(0, rowWidth - pillWidth - rowGap);
  visibleCount.value = countFitChips(chips, available, gap);
}

/** @param {HTMLElement | null | undefined} el */
function readGapPx(el) {
  if (!(el instanceof HTMLElement)) return 0;
  const gap = getComputedStyle(el).columnGap || getComputedStyle(el).gap || "0";
  const n = parseFloat(gap);
  return Number.isFinite(n) ? n : 0;
}

/** @param {HTMLElement} rowEl */
function estimatePillWidth(rowEl) {
  const fs = parseFloat(getComputedStyle(rowEl).fontSize || "0");
  return Math.max(Math.ceil(fs * 2.4), 44);
}

async function scheduleMeasure() {
  visibleCount.value = props.items.length;
  await nextTick();
  measureVisibleCount();
  if (hiddenCount.value > 0) {
    await nextTick();
    measureVisibleCount();
  }
}

/** @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} item @param {MouseEvent} event */
function onChipClick(item, event) {
  const el = event.currentTarget;
  emit("select", {
    item,
    originEl: el instanceof HTMLElement ? el : null,
  });
}

watch(
  () => props.items,
  () => {
    scheduleMeasure();
  },
  { deep: true },
);

onMounted(() => {
  scheduleMeasure();
  if (typeof ResizeObserver !== "undefined" && rowRef.value) {
    resizeObserver = new ResizeObserver(() => scheduleMeasure());
    resizeObserver.observe(rowRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<style scoped>
.run-end-discovery-strip {
  --run-end-discovery-chip-size: calc(var(--desc-inline-sample-size) * 0.75);
  width: 100%;
  min-width: 0;
}

.run-end-discovery-strip__row {
  display: flex;
  align-items: center;
  gap: calc(8 * var(--rpx));
  width: 100%;
  min-width: 0;
}

.run-end-discovery-strip__scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: calc(8 * var(--rpx));
  overflow: hidden;
}

.run-end-discovery-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: calc(6 * var(--rpx));
  transition: filter 0.1s ease;
}

.run-end-discovery-chip:hover {
  filter: brightness(1.05);
}

.run-end-discovery-chip:active {
  filter: brightness(0.94);
}

.run-end-discovery-chip__frame {
  width: var(--run-end-discovery-chip-size);
  height: var(--run-end-discovery-chip-size);
  min-width: var(--run-end-discovery-chip-size);
  min-height: var(--run-end-discovery-chip-size);
  box-sizing: border-box;
}

.run-end-discovery-chip__voucher {
  width: var(--run-end-discovery-chip-size);
}

.run-end-discovery-chip__voucher :deep(.voucher-stamp__frame) {
  width: 100%;
  height: var(--run-end-discovery-chip-size);
}

.run-end-discovery-chip__material {
  width: var(--run-end-discovery-chip-size);
  height: var(--run-end-discovery-chip-size);
  min-width: var(--run-end-discovery-chip-size);
  min-height: var(--run-end-discovery-chip-size);
}

.run-end-discovery-chip__accessory {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--run-end-discovery-chip-size);
  height: var(--run-end-discovery-chip-size);
  border-radius: calc(8 * var(--rpx));
  transform: scale(0.92);
  transform-origin: center;
}

.run-end-discovery-strip__overflow-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(44 * var(--rpx));
  height: calc(36 * var(--rpx));
  padding: 0 calc(10 * var(--rpx));
  border-radius: calc(999 * var(--rpx));
  background: var(--card, #eee4da);
  color: var(--text-soft);
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  box-sizing: border-box;
}
</style>
