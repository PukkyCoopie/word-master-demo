import { coerceRunSeedNumeric } from "../game/runRng.js";
import { isE2eMode } from "./isE2eMode.js";

/**
 * @param {object} deps
 * @param {import('vue').Ref<string>} deps.screen
 * @param {import('vue').Ref<number>} deps.gameSessionKey
 * @param {import('vue').Ref<number>} deps.sessionRunSeed
 * @param {import('vue').Ref<string>} deps.sessionRunSeedDisplay
 * @param {import('vue').ComputedRef<boolean>} deps.dictionaryReady
 * @param {import('vue').ComputedRef<boolean>} [deps.remixIconReady]
 * @param {import('vue').ComputedRef<boolean>} [deps.bootImagesReady]
 * @param {() => Promise<void>} deps.loadDictionary
 * @param {() => Promise<void>} [deps.loadRemixIconFont]
 * @param {() => Promise<void>} [deps.loadBootImages]
 */
export function registerAppTestHarness(deps) {
  if (!isE2eMode()) return () => {};

  const {
    screen,
    gameSessionKey,
    sessionRunSeed,
    sessionRunSeedDisplay,
    dictionaryReady,
    remixIconReady,
    bootImagesReady,
    loadDictionary,
    loadRemixIconFont,
    loadBootImages,
  } = deps;

  async function waitForAppBoot(timeoutMs = 120_000) {
    if (!dictionaryReady.value) {
      await loadDictionary();
    }
    loadRemixIconFont?.();
    loadBootImages?.();
    const t0 = Date.now();
    while (
      (!dictionaryReady.value ||
        (remixIconReady && !remixIconReady.value) ||
        (bootImagesReady && !bootImagesReady.value)) &&
      Date.now() - t0 < timeoutMs
    ) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!dictionaryReady.value) {
      throw new Error("词典加载超时");
    }
    if (remixIconReady && !remixIconReady.value) {
      throw new Error("Remix Icon 字体加载超时");
    }
    if (bootImagesReady && !bootImagesReady.value) {
      throw new Error("启动图片加载超时");
    }
  }

  async function startGame({ seed = "e2e42", skipIris = true } = {}) {
    await waitForAppBoot();
    const seedDisplay = String(seed).slice(0, 8);
    sessionRunSeed.value = coerceRunSeedNumeric(seedDisplay);
    sessionRunSeedDisplay.value = seedDisplay;
    gameSessionKey.value += 1;
    screen.value = "game";
    if (!skipIris) {
      console.warn("[E2E] skipIris=false 尚未接 iris，仍直接进关");
    }
    console.log("[E2E] 开局 seed=", seedDisplay);
    await new Promise((r) => setTimeout(r, 400));
  }

  const api = {
    version: 1,
    waitForDictionary: waitForAppBoot,
    waitForAppBoot,
    startGame,
    getScreen: () => screen.value,
    isDictionaryReady: () => dictionaryReady.value,
    isAppBootReady: () =>
      dictionaryReady.value &&
      (!remixIconReady || remixIconReady.value) &&
      (!bootImagesReady || bootImagesReady.value),
  };

  globalThis.__WM_APP_E2E__ = api;
  console.log("[E2E] App 桥接已就绪 (__WM_APP_E2E__)");

  return () => {
    if (globalThis.__WM_APP_E2E__ === api) delete globalThis.__WM_APP_E2E__;
  };
}
