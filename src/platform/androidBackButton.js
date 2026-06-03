import { Capacitor } from "@capacitor/core";

/** @typedef {() => boolean} AndroidBackHandler */

/** @type {Map<symbol, { priority: number, handler: AndroidBackHandler }>} */
const handlers = new Map();

let listenerHandle = null;

/**
 * 注册 Android 系统返回处理（数值越大越先执行）。
 * @param {number} priority
 * @param {AndroidBackHandler} handler 返回 true 表示已消费，不再向下传递
 * @returns {() => void} 卸载函数
 */
export function registerAndroidBackHandler(priority, handler) {
  const id = Symbol("androidBack");
  handlers.set(id, { priority, handler });
  return () => {
    handlers.delete(id);
  };
}

/** @returns {boolean} 是否有处理器消费了本次返回 */
export function dispatchAndroidBack() {
  const sorted = [...handlers.values()].sort((a, b) => b.priority - a.priority);
  for (const { handler } of sorted) {
    try {
      if (handler() === true) return true;
    } catch (err) {
      console.error("[androidBack]", err);
    }
  }
  return false;
}

/**
 * 在原生 Android 壳内监听硬件返回 / 全面屏侧滑返回。
 * 仅注册一次；重复调用无副作用。
 */
export async function initAndroidBackButton() {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
  if (listenerHandle) return;

  const { App } = await import("@capacitor/app");
  listenerHandle = await App.addListener("backButton", () => {
    if (dispatchAndroidBack()) return;
    void App.exitApp();
  });
}
