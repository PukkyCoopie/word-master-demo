<template>
  <div class="game-wrap">
    <div class="game-scaler">
      <div class="game-surface" :class="{ 'game-surface--menu': screen === 'menu' }">
        <!-- 须始终在 DOM 中且早于 GamePanel，避免 Teleport 挂载时 querySelector 找不到目标 -->
        <div id="game-view-portal" class="game-view-portal" />
        <MainMenu v-if="screen === 'menu'" @start="onMenuStart" />
        <div v-else class="game-session-stack">
          <GamePanel :key="gameSessionKey" />
        </div>
        <IrisTransition ref="irisFxRef" :color="IRIS_COLOR" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { provide, ref } from "vue";
import MainMenu from "./components/MainMenu.vue";
import GamePanel from "./components/GamePanel.vue";
import { useScale } from "./composables/useScale";
import IrisTransition from "./components/IrisTransition.vue";

useScale();

const screen = ref("menu");
const gameSessionKey = ref(0);

/** 与「开始游戏」按钮一致的转场色 */
const IRIS_COLOR = "#5a8fb8";
const irisFxRef = ref(null);
const transitionBusy = ref(false);

provide("irisTransition", {
  play: (event, opts) => irisFxRef.value?.play(event, opts),
});

async function onMenuStart(event) {
  if (transitionBusy.value) return;
  transitionBusy.value = true;
  await irisFxRef.value?.play(event, {
    onCovered: () => {
      gameSessionKey.value += 1;
      screen.value = "game";
    },
  });
  transitionBusy.value = false;
}
</script>

<style scoped>
/* 与 .game-container 同圆角，用于裁剪转场层；菜单与游戏均包在内 */
.game-surface {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(12 * var(--rpx));
}

.game-session-stack {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}
</style>
