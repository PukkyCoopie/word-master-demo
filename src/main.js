import { createApp } from "vue";
import "remixicon/fonts/remixicon.css";
import "../css/game.css";
import "../css/game.layout.css";
import App from "./App.vue";
import { warmupAllReglMaterialHubs } from "./lib/reglMaterialWarmup.js";
import { deferReglMaterialWarmupAtBoot } from "./lib/reglMaterialPerf.js";
import { startRemixIconFontLoad } from "./composables/useRemixIconFont.js";
import { initAnimationSpeedSettings } from "./settings/animationSpeed.js";
import { initAndroidBackButton } from "./platform/androidBackButton.js";
import { applyBorderlessLayoutHtmlClass } from "./settings/displayLayoutMode.js";
import { getViewportSize } from "./composables/viewportSize.js";
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
}

document.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });

const app = createApp(App);
initAnimationSpeedSettings();
void initAndroidBackButton();
app.mount("#app");
