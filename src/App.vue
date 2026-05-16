<template>
  <div class="game-wrap">
    <div class="game-scaler">
      <div class="game-surface" :class="{ 'game-surface--menu': showMenu }">
        <!-- 须始终在 DOM 中且早于 GamePanel，避免 Teleport 挂载时 querySelector 找不到目标 -->
        <div id="game-view-portal" class="game-view-portal" />
        <div v-if="dictGate" class="dict-boot-gate">
          <div
            class="dict-boot-bar"
            :class="{ 'dict-boot-bar--error': dictBootError, 'dict-boot-bar--clickable': dictBootError }"
            :title="dictBootError ? '点击重试' : undefined"
            role="progressbar"
            :aria-valuenow="dictBarPct"
            aria-valuemin="0"
            aria-valuemax="100"
            @click="onDictBootBarClick"
          >
            <div class="dict-boot-bar-fill" :style="{ width: dictBarPct + '%' }" />
          </div>
        </div>
        <MainMenu v-if="showMenu" @request-start="onMenuRequestStart" />
        <div v-else-if="showGame" class="game-session-stack">
          <GamePanel
            :key="gameSessionKey"
            :run-seed="sessionRunSeed"
            :run-seed-display="sessionRunSeedDisplay"
          />
        </div>
        <IrisTransition ref="irisFxRef" :color="IRIS_COLOR" />
        <RunStartDialog
          :open="showRunStartDialog"
          @confirm="onRunStartConfirm"
          @cancel="onRunStartCancel"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, provide, ref } from "vue";
import MainMenu from "./components/MainMenu.vue";
import GamePanel from "./components/GamePanel.vue";
import RunStartDialog from "./components/RunStartDialog.vue";
import { useScale } from "./composables/useScale";
import { useDictionary } from "./composables/useDictionary";
import IrisTransition from "./components/IrisTransition.vue";
import { coerceRunSeedNumeric } from "./game/runRng.js";

useScale();

const { loadDictionary, dictionaryReady, loading: dictLoading, error: dictError, loadProgress } = useDictionary();

const screen = ref("menu");
const gameSessionKey = ref(0);
const showRunStartDialog = ref(false);
/** @type {import('vue').Ref<'menu' | 'restart'>} */
const runStartMode = ref("menu");
const sessionRunSeed = ref(0);
const sessionRunSeedDisplay = ref("");

/** 与「开始游戏」按钮一致的转场色 */
const IRIS_COLOR = "#5a8fb8";
const irisFxRef = ref(null);
const transitionBusy = ref(false);

provide("irisTransition", {
  play: (event, opts) => irisFxRef.value?.play(event, opts),
});

/** 暂停菜单「重新开始」等：打开同一开局弹层（暂停 UI 未做时亦可 inject 调用） */
provide("requestNewRun", () => {
  if (transitionBusy.value) return;
  runStartMode.value = "restart";
  showRunStartDialog.value = true;
});

const showMenu = computed(() => dictionaryReady.value && screen.value === "menu");
const showGame = computed(() => dictionaryReady.value && screen.value === "game");
const dictGate = computed(() => !dictionaryReady.value);
const dictBootError = computed(() => !dictLoading.value && !!dictError.value);
const dictBarPct = computed(() =>
  Math.round((dictBootError.value ? 1 : loadProgress.value) * 100),
);

let appAlive = true;

onMounted(() => {
  loadDictionary({ shouldAbort: () => !appAlive });
});

onBeforeUnmount(() => {
  appAlive = false;
});

function onDictBootBarClick() {
  if (!dictBootError.value) return;
  loadDictionary({ shouldAbort: () => !appAlive });
}

function onMenuRequestStart() {
  if (transitionBusy.value) return;
  runStartMode.value = "menu";
  showRunStartDialog.value = true;
}

async function onRunStartConfirm(payload) {
  if (transitionBusy.value) return;
  sessionRunSeed.value = coerceRunSeedNumeric(payload.seedNumeric);
  sessionRunSeedDisplay.value = String(payload.seedDisplay ?? "");
  showRunStartDialog.value = false;

  transitionBusy.value = true;
  const mode = runStartMode.value;
  await irisFxRef.value?.play(null, {
    onCovered: () => {
      gameSessionKey.value += 1;
      if (mode === "menu") screen.value = "game";
    },
  });
  transitionBusy.value = false;
}

function onRunStartCancel() {
  showRunStartDialog.value = false;
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

.dict-boot-gate {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  pointer-events: none;
}

.dict-boot-bar {
  width: min(78%, calc(560 * var(--rpx)));
  height: calc(14 * var(--rpx));
  border-radius: calc(7 * var(--rpx));
  background: var(--card-bright);
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.dict-boot-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: #5a8fb8;
  transition: width 0.12s ease-out, background 0.2s ease;
}

.dict-boot-bar--error .dict-boot-bar-fill {
  background: var(--btn-red);
}

.dict-boot-bar--clickable {
  pointer-events: auto;
  cursor: pointer;
}
</style>
