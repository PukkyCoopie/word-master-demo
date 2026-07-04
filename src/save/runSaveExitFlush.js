import { flushSaveStorageSync } from "./runSaveStorage.js";

/** @type {(() => void) | null} */
let flushHandler = null;

/** @param {() => void} handler */
export function registerRunSaveFlushOnBackground(handler) {
  flushHandler = handler;
}

export function unregisterRunSaveFlushOnBackground() {
  flushHandler = null;
}

/** App 切后台或进程即将挂起：先尝试写入局内进度，再同步落盘。 */
export function flushRunSaveOnAppBackground() {
  try {
    flushHandler?.();
  } finally {
    flushSaveStorageSync();
  }
}
