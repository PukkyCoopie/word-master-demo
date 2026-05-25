<template>
  <div class="main-menu">
    <div class="main-menu-inner">
      <TileLetterShowcase
        class="menu-letter-showcase"
        aria-label="Word Master"
        :rows="showcaseRows"
      />

      <div v-if="showAuthBusy" class="menu-auth-status" aria-live="polite">
        <span class="menu-auth-spinner" aria-hidden="true"></span>
        <span>{{ authBusyLabel }}</span>
      </div>

      <div v-else-if="showAuthBlocked || phase === 'error'" class="menu-auth-status menu-auth-status--blocked">
        <p class="menu-auth-message">{{ authMessage || "暂时无法进入游戏。" }}</p>
        <button
          v-if="phase === 'error'"
          type="button"
          class="menu-btn menu-btn--settings menu-auth-retry"
          @click="retryAuth"
        >
          重试
        </button>
      </div>

      <nav v-else-if="showLoginButton" class="menu-actions menu-actions--login" aria-label="TapTap 登录">
        <TapTapLoginButton :disabled="loginBusy" @click="loginWithTapTap" />
        <p v-if="loginBusy" class="menu-auth-hint">登录中…</p>
        <p v-else-if="authMessage" class="menu-auth-hint">{{ authMessage }}</p>
      </nav>

      <nav v-else-if="showMenuActions" class="menu-actions" aria-label="主菜单">
        <button type="button" class="menu-btn menu-btn--start" @click="$emit('request-start')">
          <i class="ri-play-fill menu-btn-icon" aria-hidden="true"></i>
          <span>开始游戏</span>
        </button>
        <button type="button" class="menu-btn menu-btn--settings" @click="$emit('open-settings')">
          <i class="ri-settings-3-line menu-btn-icon" aria-hidden="true"></i>
          <span>设置</span>
        </button>
        <button type="button" class="menu-btn menu-btn--about" @click="$emit('open-about')">
          <i class="ri-information-line menu-btn-icon" aria-hidden="true"></i>
          <span>关于</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import TileLetterShowcase from "./TileLetterShowcase.vue";
import TapTapLoginButton from "./TapTapLoginButton.vue";
import { useTapTapAuth } from "../composables/useTapTapAuth.js";

defineEmits(["request-start", "open-settings", "open-about"]);

const {
  phase,
  authMessage,
  loginBusy,
  showMenuActions,
  showLoginButton,
  showAuthBusy,
  showAuthBlocked,
  loginWithTapTap,
  retryAuth,
} = useTapTapAuth();

const authBusyLabel = computed(() =>
  phase.value === "compliance" ? "正在验证…" : "正在检查登录…"
);

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

.menu-letter-showcase {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: calc(96 * var(--rpx));
  box-sizing: border-box;
}

.menu-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  padding-bottom: calc(4 * var(--rpx));
}

.menu-actions--login {
  align-items: center;
  width: 100%;
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

.menu-btn:disabled {
  cursor: wait;
  filter: brightness(0.95);
}

.menu-btn-icon {
  font-size: calc(32 * var(--rpx));
  opacity: 1;
}

.menu-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.menu-btn:active:not(:disabled) {
  filter: brightness(0.92);
}

.menu-btn--start {
  background: #5a8fb8;
}

.menu-btn--settings {
  background: #d4954a;
}

.menu-btn--about {
  background: var(--btn-green);
}

.menu-auth-status {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(16 * var(--rpx));
  min-height: calc(120 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  color: var(--text-muted, #776e65);
  text-align: center;
}

.menu-auth-status--blocked {
  gap: calc(20 * var(--rpx));
}

.menu-auth-message,
.menu-auth-hint {
  margin: 0;
  font-size: calc(24 * var(--rpx));
  line-height: 1.45;
  color: var(--text-muted, #776e65);
}

.menu-auth-retry {
  max-width: calc(320 * var(--rpx));
}

.menu-auth-spinner {
  width: calc(36 * var(--rpx));
  height: calc(36 * var(--rpx));
  border-radius: 50%;
  border: calc(4 * var(--rpx)) solid rgba(90, 143, 184, 0.22);
  border-top-color: #5a8fb8;
  animation: menu-auth-spin 0.8s linear infinite;
}

@keyframes menu-auth-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
