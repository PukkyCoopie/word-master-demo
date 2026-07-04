import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { flushCloudUploadOnBackground } from "../save/cloudSave/cloudSaveSync.js";
import { flushRunSaveOnAppBackground } from "../save/runSaveExitFlush.js";

/** @type {import('@capacitor/core').PluginListenerHandle | null} */
let appStateListener = null;

function onPageHidden() {
  flushRunSaveOnAppBackground();
  if (Capacitor.isNativePlatform()) {
    void flushCloudUploadOnBackground();
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    onPageHidden();
  }
}

export async function initAppLifecycle() {
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (!Capacitor.isNativePlatform()) return;
  if (appStateListener) return;
  appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      onPageHidden();
    }
  });
}

export async function disposeAppLifecycle() {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (appStateListener) {
    await appStateListener.remove();
    appStateListener = null;
  }
}
