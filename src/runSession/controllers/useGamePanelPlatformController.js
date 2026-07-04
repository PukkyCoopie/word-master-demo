import { registerAndroidBackHandler } from "../../platform/androidBackButton.js";

const DEFAULT_ANDROID_BACK_PRIORITY = 100;

/**
 * @param {{
 *   onAndroidBack: () => boolean | void | Promise<boolean | void>,
 *   onViewportResize: () => void,
 *   onRegister?: () => void,
 *   onDispose?: () => void,
 *   androidBackPriority?: number,
 * }} options
 */
export function useGamePanelPlatformController(options) {
  const { onAndroidBack, onViewportResize } = options;
  const androidBackPriority = options.androidBackPriority ?? DEFAULT_ANDROID_BACK_PRIORITY;

  /** @type {(() => void) | null} */
  let unregisterAndroidBack = null;

  async function register() {
    unregisterAndroidBack = registerAndroidBackHandler(androidBackPriority, onAndroidBack);
    window.addEventListener("resize", onViewportResize);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    options.onRegister?.();
  }

  function dispose() {
    options.onDispose?.();
    window.removeEventListener("resize", onViewportResize);
    window.visualViewport?.removeEventListener("resize", onViewportResize);
    unregisterAndroidBack?.();
    unregisterAndroidBack = null;
  }

  return { register, dispose };
}
