import { Capacitor } from "@capacitor/core";

/** Capacitor 原生壳（APK 等）：词库随包明文，不走 Brotli 解压。 */
export function isCapacitorNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
  }
}
