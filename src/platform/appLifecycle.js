import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { flushCloudUploadOnBackground } from "../save/cloudSave/cloudSaveSync.js";

/** @type {import('@capacitor/core').PluginListenerHandle | null} */
let appStateListener = null;

export async function initAppLifecycle() {
  if (!Capacitor.isNativePlatform()) return;
  if (appStateListener) return;
  appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      void flushCloudUploadOnBackground();
    }
  });
}

export async function disposeAppLifecycle() {
  if (appStateListener) {
    await appStateListener.remove();
    appStateListener = null;
  }
}
