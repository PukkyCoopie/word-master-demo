import { createApp } from "vue";
import "remixicon/fonts/remixicon.css";
import "../css/game.css";
import "../css/game.layout.css";
import App from "./App.vue";
import { warmupAllReglMaterialHubs } from "./lib/reglMaterialWarmup.js";
import { startRemixIconFontLoad } from "./composables/useRemixIconFont.js";
import { initAnimationSpeedSettings } from "./settings/animationSpeed.js";
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
warmupAllReglMaterialHubs();

document.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });

const app = createApp(App);
initAnimationSpeedSettings();
app.mount("#app");
