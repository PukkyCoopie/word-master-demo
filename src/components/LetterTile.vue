<script setup>
/**
 * 局内字母块统一入口：宝石 + 字母，按 variant 挂对应布局类。
 * 后续状态/动效可集中加 props 或插槽，避免各处复制 DOM。
 */
import { computed, useAttrs } from "vue";
import TileFireRegl from "./TileFireRegl.vue";
import TileGoldRegl from "./TileGoldRegl.vue";
import TileIceRegl from "./TileIceRegl.vue";
import TileLuckyRegl from "./TileLuckyRegl.vue";
import TileSteelRegl from "./TileSteelRegl.vue";
import TileWildcardRegl from "./TileWildcardRegl.vue";
import TileWaterRegl from "./TileWaterRegl.vue";
import { getTileAccessoryChipVisual } from "../game/tileAccessories";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  variant: {
    type: String,
    required: true,
    validator: (v) =>
      ["grid", "wordSlotContent", "deck", "fly", "menu"].includes(v),
  },
  letter: { type: String, required: true },
  rarity: { type: String, default: "common" },
  /** 字母块自带平面额外分（左上角角标；0 不显示） */
  tileScoreBonus: { type: Number, default: 0 },
  /** 字母块自带倍率加（右上角角标；0 不显示） */
  tileMultBonus: { type: Number, default: 0 },
  /** wordSlotContent：飞字时隐藏槽内字母 */
  contentHidden: { type: Boolean, default: false },
  /** menu：追逐动画周期（秒），写入 --menu-logo-cycle */
  menuCycleSec: { type: Number, default: null },
  /** 材质，如 "gold" */
  materialId: { type: String, default: null },
  /** 配饰 id，如 level_upgrade */
  accessoryId: { type: String, default: null },
});

const attrs = useAttrs();

const rootTag = computed(() => (props.variant === "wordSlotContent" ? "span" : "div"));

const variantClass = computed(() => {
  switch (props.variant) {
    case "grid":
      return "grid-tile";
    case "wordSlotContent":
      return ["word-slot-content", props.contentHidden ? "word-slot-content-hidden" : ""];
    case "deck":
      return "deck-layer-tile";
    case "fly":
      return "fly-letter";
    case "menu":
      return "menu-logo-tile";
    default:
      return "";
  }
});

const showGoldMaterial = computed(
  () => props.materialId === "gold" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const showSteelMaterial = computed(
  () => props.materialId === "steel" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const showIceMaterial = computed(
  () => props.materialId === "ice" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const showWaterMaterial = computed(
  () => props.materialId === "water" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const showFireMaterial = computed(
  () => props.materialId === "fire" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const showWildcardMaterial = computed(
  () => props.materialId === "wildcard" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const showLuckyMaterial = computed(
  () => props.materialId === "lucky" && ["grid", "wordSlotContent", "fly", "deck"].includes(props.variant),
);

const mergedClass = computed(() => {
  const matClass = showGoldMaterial.value
    ? "tile-material-gold"
    : showSteelMaterial.value
      ? "tile-material-steel"
      : showIceMaterial.value
        ? "tile-material-ice"
        : showWaterMaterial.value
          ? "tile-material-water"
          : showFireMaterial.value
            ? "tile-material-fire"
            : showWildcardMaterial.value
              ? "tile-material-wildcard"
              : showLuckyMaterial.value
                ? "tile-material-lucky"
      : "";
  return [variantClass.value, props.letter === "Qu" ? "letter-qu" : "", matClass, attrs.class].filter(
    Boolean,
  );
});

const restAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});

const mergedStyle = computed(() => {
  const s = {};
  if (
    props.variant === "menu" &&
    props.menuCycleSec != null &&
    Number.isFinite(props.menuCycleSec)
  ) {
    s["--menu-logo-cycle"] = `${props.menuCycleSec}s`;
  }
  const ext = attrs.style;
  if (ext && typeof ext === "object" && !Array.isArray(ext)) {
    Object.assign(s, ext);
  }
  return Object.keys(s).length ? s : undefined;
});

const scoreBadge = computed(() => Math.max(0, Math.round(Number(props.tileScoreBonus) || 0)));

const multBadge = computed(() => Math.max(0, Math.round(Number(props.tileMultBonus) || 0)));

const showAugmentBadges = computed(() =>
  ["grid", "wordSlotContent", "deck"].includes(props.variant),
);

const accessoryChipVisual = computed(() => {
  const v = props.variant;
  if (!["grid", "wordSlotContent", "fly", "deck"].includes(v)) return null;
  return getTileAccessoryChipVisual(props.accessoryId);
});
</script>

<template>
  <component :is="rootTag" :class="mergedClass" :style="mergedStyle" v-bind="restAttrs">
    <TileGoldRegl v-if="showGoldMaterial" class="tile-material-gold-canvas" />
    <TileSteelRegl v-if="showSteelMaterial" class="tile-material-steel-canvas" />
    <TileIceRegl v-if="showIceMaterial" class="tile-material-ice-canvas" />
    <TileWaterRegl v-if="showWaterMaterial" class="tile-material-water-canvas" />
    <TileFireRegl v-if="showFireMaterial" class="tile-material-fire-canvas" />
    <TileWildcardRegl v-if="showWildcardMaterial" class="tile-material-wildcard-canvas" />
    <TileLuckyRegl v-if="showLuckyMaterial" class="tile-material-lucky-canvas" />
    <template v-if="showAugmentBadges">
      <span v-if="scoreBadge > 0" class="tile-bonus-pill tile-bonus-pill--score" aria-hidden="true"
        >+{{ scoreBadge }}</span
      >
      <span v-if="multBadge > 0" class="tile-bonus-pill tile-bonus-pill--mult" aria-hidden="true"
        >+{{ multBadge }}</span
      >
    </template>
    <span class="letter-gem" :class="`gem-${rarity}`" aria-hidden="true" />
    <span class="letter-tile-char">{{ letter }}</span>
    <span
      v-if="accessoryChipVisual"
      class="tile-accessory-chip"
      :class="accessoryChipVisual.chipClass"
      aria-hidden="true"
    >
      <span class="tile-accessory-chip-ripple" aria-hidden="true" />
      <i class="tile-accessory-chip-icon" :class="accessoryChipVisual.iconClass" aria-hidden="true" />
    </span>
  </component>
</template>

<style scoped>
/* ----- variant: menu（主菜单 Logo；局内 grid / slot / deck / fly 用全局 game.css 等） ----- */
.menu-logo-tile {
  position: relative;
  width: calc(88 * var(--rpx));
  height: calc(88 * var(--rpx));
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bright);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  font-size: calc(40 * var(--rpx));
  font-weight: 700;
  color: var(--text);
  /* 装饰性 infinite，animation-easing 规则不强制 expo.out */
  animation: menu-logo-chase var(--menu-logo-cycle, 8s) ease-in-out infinite;
  will-change: transform, filter;
}

.menu-logo-tile .letter-tile-char {
  position: relative;
  z-index: 1;
}

.menu-logo-tile .letter-gem {
  position: absolute;
  left: calc(7 * var(--rpx));
  bottom: calc(7 * var(--rpx));
  width: calc(19 * var(--rpx));
  height: calc(19 * var(--rpx));
  border-radius: 50%;
  box-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.menu-logo-tile .letter-gem.gem-common {
  background: #e8e4dc;
  border: calc(1 * var(--rpx)) solid #9c8b7a;
  box-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.menu-logo-tile .letter-gem.gem-rare {
  background: #5b9bd5;
}

.menu-logo-tile .letter-gem.gem-epic {
  background: #9b59b6;
}

.menu-logo-tile .letter-gem.gem-legendary {
  background: #e67e22;
}

@keyframes menu-logo-chase {
  0%,
  100% {
    transform: translateY(0);
    filter: brightness(1);
  }
  5% {
    transform: translateY(calc(-6 * var(--rpx)));
    filter: brightness(1.09);
  }
  11% {
    transform: translateY(0);
    filter: brightness(1);
  }
}
</style>
