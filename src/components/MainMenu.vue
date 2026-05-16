<template>
  <div class="main-menu">
    <div class="main-menu-inner">
      <TileLetterShowcase
        class="menu-letter-showcase"
        aria-label="Word Master"
        :rows="showcaseRows"
      />

      <nav class="menu-actions" aria-label="主菜单">
        <button type="button" class="menu-btn menu-btn--start" @click="$emit('request-start')">
          <i class="ri-play-fill menu-btn-icon" aria-hidden="true"></i>
          <span>开始游戏</span>
        </button>
        <button type="button" class="menu-btn menu-btn--options" @click.prevent>
          <i class="ri-settings-3-line menu-btn-icon" aria-hidden="true"></i>
          <span>选项</span>
        </button>
        <button type="button" class="menu-btn menu-btn--favorites" @click.prevent>
          <i class="ri-star-line menu-btn-icon" aria-hidden="true"></i>
          <span>收藏</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import TileLetterShowcase from "./TileLetterShowcase.vue";

defineEmits(["request-start"]);

const showcaseRows = [
  [
    { letter: "W", rarity: "legendary" },
    { letter: "O", rarity: "epic" },
    { letter: "R", rarity: "rare" },
    { letter: "D", rarity: "common" },
  ],
  [
    { letter: "M", rarity: "legendary" },
    { letter: "A", rarity: "epic" },
    { letter: "S", rarity: "rare" },
    { letter: "T", rarity: "common" },
    { letter: "E", rarity: "rare" },
    { letter: "R", rarity: "epic" },
  ],
];
</script>

<style scoped>
.main-menu {
  width: 100%;
  height: 100%;
  background: var(--card);
  border-radius: calc(12 * var(--rpx));
  box-shadow: var(--shadow);
  padding: calc(56 * var(--rpx)) calc(22 * var(--rpx));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.main-menu-inner {
  width: 100%;
  max-width: calc(620 * var(--rpx));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* 宽度随字母区内容收缩，避免 max-width 小于第二行总宽时左右 padding 被挤没 */
.menu-letter-showcase {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: calc(96 * var(--rpx));
  box-sizing: border-box;
}

/* 按钮：2048 式扁平纯色块，少用渐变 */
.menu-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  padding-bottom: calc(4 * var(--rpx));
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--rpx));
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(18 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: #f9f6f2;
  transition: filter 0.12s ease;
}

.menu-btn-icon {
  font-size: calc(32 * var(--rpx));
  opacity: 1;
}

.menu-btn:hover {
  filter: brightness(1.05);
}

.menu-btn:active {
  filter: brightness(0.92);
}

/* 与游戏内 action / 主题色同一调性的纯色 */
.menu-btn--start {
  background: #5a8fb8;
}

.menu-btn--options {
  background: #d4954a;
}

.menu-btn--favorites {
  background: var(--btn-green);
}
</style>
