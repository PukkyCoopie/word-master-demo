/** @typedef {ReturnType<typeof createCorePorts>} CorePort */

/** @typedef {import('./corePortTypes.js').CorePortBinding} CorePortBinding */

/**
 * Session bootstrap 域 assembly 端口（R4.5）。
 * @param {CorePortBinding} binding
 */
export function createCorePorts(binding) {
  return Object.freeze({
    COLS: binding.COLS,
    ROWS: binding.ROWS,
    SHOW_SUBMIT_TRANSLATION: binding.SHOW_SUBMIT_TRANSLATION,
    props: binding.props,
    emit: binding.emit,
    session: binding.session,
    phaseStore: binding.phaseStore,
    getGamePanelAlive: binding.getGamePanelAlive,
    mountGamePanelSessionNamespaces: binding.mountGamePanelSessionNamespaces,
    firstWordTutorialCtrlSlot: binding.firstWordTutorialCtrlSlot,
    overlayStackController: binding.overlayStackController,
  });
}
