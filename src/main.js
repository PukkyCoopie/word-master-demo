import { createApp } from "vue";
import "remixicon/fonts/remixicon.css";
import "../css/game.css";
import "../css/game.layout.css";
import App from "./App.vue";
import { warmupAllReglMaterialHubs } from "./lib/reglMaterialWarmup.js";
import { deferReglMaterialWarmupAtBoot, initMaterialAnimationSettings } from "./lib/reglMaterialPerf.js";
import { startRemixIconFontLoad } from "./composables/useRemixIconFont.js";
import { initAnimationSpeedSettings } from "./settings/animationSpeed.js";
import { initConfirmButtonSideSettings } from "./settings/confirmButtonSide.js";
import { initAndroidBackButton } from "./platform/androidBackButton.js";
import { initUIButtonHaptics } from "./platform/haptics.js";
import { applyBorderlessLayoutHtmlClass } from "./settings/displayLayoutMode.js";
import { getViewportSize } from "./composables/viewportSize.js";
import {
  getMeetsMinimumWebView,
  initWebViewCapabilities,
} from "./platform/webViewCapabilities.js";
import { applyMaterialAnimationCapabilityConstraints } from "./settings/materialAnimationAvailability.js";

function disableNativeWebNotificationPrompt() {
  if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform?.()) {
    return;
  }
  const denied = () => Promise.resolve("denied");
  try {
    if (typeof window.Notification !== "undefined") {
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
          permission: "denied",
          requestPermission: denied,
        },
      });
    } else {
      Object.defineProperty(window, "Notification", {
        configurable: true,
        writable: true,
        value: {
          permission: "denied",
          requestPermission: denied,
        },
      });
    }
  } catch {
    /* WebView 不可覆写时忽略 */
  }
}

initWebViewCapabilities();
applyMaterialAnimationCapabilityConstraints();

if (typeof window !== "undefined" && window.__WM_BOOT_BLOCKED__ === true) {
  // index.html 内联脚本已展示提示，避免继续启动
} else if (!getMeetsMinimumWebView()) {
  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.innerHTML =
      '<div class="dict-boot-gate"><div class="dict-boot-panel"><p class="dict-boot-error-msg">系统 WebView 版本过低，请更新 Android System WebView 后重试。</p></div></div>';
  }
} else {
  disableNativeWebNotificationPrompt();
  startRemixIconFontLoad();

  if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
    document.documentElement.classList.add("platform-native");
  }
  {
    const { w, h } = getViewportSize();
    applyBorderlessLayoutHtmlClass(w, h);
  }
  if (!deferReglMaterialWarmupAtBoot()) {
    warmupAllReglMaterialHubs();
  } else if (typeof window !== "undefined") {
    const runWarmup = () => warmupAllReglMaterialHubs();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(runWarmup, { timeout: 2500 });
    } else {
      setTimeout(runWarmup, 100);
    }
  }

  document.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });
  if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
    initUIButtonHaptics();
  }

  const app = createApp(App);
  initAnimationSpeedSettings();
  initMaterialAnimationSettings();
  initConfirmButtonSideSettings();
  void initAndroidBackButton();
  app.mount("#app");
}
