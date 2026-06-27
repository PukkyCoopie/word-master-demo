/**
 * @param {Object} deps
 * @param {() => Promise<void>} deps.registerPlatform
 * @param {() => Promise<void>} deps.loadDictionary
 * @param {() => boolean} deps.getGamePanelAlive
 * @param {() => any} deps.getRestoredSave
 * @param {(restored: any) => Promise<void>} deps.startFromRestoredSave
 * @param {() => Promise<void>} deps.startNewRun
 * @param {() => void} [deps.dispose]
 */
export function useRunPanelBootstrap(deps) {
  async function start() {
    await deps.registerPlatform();
    await deps.loadDictionary();
    if (!deps.getGamePanelAlive()) return;

    const restored = deps.getRestoredSave();
    if (restored && typeof restored === "object") {
      await deps.startFromRestoredSave(restored);
      return;
    }

    await deps.startNewRun();
  }

  function dispose() {
    deps.dispose?.();
  }

  return { start, dispose };
}
