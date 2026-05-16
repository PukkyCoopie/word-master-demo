import { coerceRunSeedNumeric } from "../game/runRng.js";
import { isE2eMode } from "./isE2eMode.js";

/**
 * @param {object} deps
 * @param {import('vue').Ref<string>} deps.screen
 * @param {import('vue').Ref<number>} deps.gameSessionKey
 * @param {import('vue').Ref<number>} deps.sessionRunSeed
 * @param {import('vue').Ref<string>} deps.sessionRunSeedDisplay
 * @param {import('vue').ComputedRef<boolean>} deps.dictionaryReady
 * @param {() => Promise<void>} deps.loadDictionary
 */
export function registerAppTestHarness(deps) {
  if (!isE2eMode()) return () => {};

  const {
    screen,
    gameSessionKey,
    sessionRunSeed,
    sessionRunSeedDisplay,
    dictionaryReady,
    loadDictionary,
  } = deps;

  async function waitForDictionary(timeoutMs = 120_000) {
    if (!dictionaryReady.value) {
      await loadDictionary();
    }
    const t0 = Date.now();
    while (!dictionaryReady.value && Date.now() - t0 < timeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!dictionaryReady.value) {
      throw new Error("词典加载超时");
    }
  }

  async function startGame({ seed = "e2e42", skipIris = true } = {}) {
    await waitForDictionary();
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
    waitForDictionary,
    startGame,
    getScreen: () => screen.value,
    isDictionaryReady: () => dictionaryReady.value,
  };

  globalThis.__WM_APP_E2E__ = api;
  console.log("[E2E] App 桥接已就绪 (__WM_APP_E2E__)");

  return () => {
    if (globalThis.__WM_APP_E2E__ === api) delete globalThis.__WM_APP_E2E__;
  };
}
