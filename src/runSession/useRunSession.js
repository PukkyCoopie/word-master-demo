import { useGameState } from "../composables/useGameState.js";
import { createRunStore } from "./createRunStore.js";

/** @typedef {import('./runSessionTypes.js').RunSession} RunSession */
/** @typedef {import('./runSessionTypes.js').RunSessionProps} RunSessionProps */
/** @typedef {ReturnType<typeof createRunStore>} RunStoreInstance */

/** inject / provide 键（任务 1.2+） */
export const RUN_SESSION_KEY = Symbol("word_master_run_session");

/**
 * 将 controller 命名空间挂到 session（S.7 唯一挂载点；避免 GamePanel 分散 `session.xxx =`）。
 * @param {import('./runSessionTypes.js').RunSession} session
 * @param {Partial<import('./runSessionTypes.js').RunSession>} namespaces
 */
export function mountRunSessionNamespaces(session, namespaces) {
  Object.assign(session, namespaces);
  return session;
}

/** @param {import('./runSessionTypes.js').RunSession | null | undefined} session */
export function isRunSessionReadyForHosts(session) {
  return Boolean(
    session?.treasures &&
      session.spell &&
      session.packPick &&
      session.shop &&
      session.lifecycle &&
      session.overlayStack?.buildViewContext &&
      session.pauseOverlay,
  );
}

/**
 * RunSession 组装点（逐步挂载各命名空间，见 architecture plan §2.3）。
 *
 * @param {RunSessionProps} props
 * @param {(event: string, ...args: unknown[]) => void} emit
 * @param {{
 *   buildGridOpts?: (run: RunStoreInstance) => Parameters<typeof useGameState>[0],
 *   gridOpts?: Parameters<typeof useGameState>[0],
 * }} [options]
 * @returns {Pick<RunSession, "grid" | "run">}
 */
export function useRunSession(props, emit, options = {}) {
  void emit;
  const run = createRunStore(props);
  const gridOpts =
    typeof options.buildGridOpts === "function"
      ? options.buildGridOpts(run)
      : options.gridOpts ?? {};
  const grid = useGameState(gridOpts);
  return { run, grid };
}
