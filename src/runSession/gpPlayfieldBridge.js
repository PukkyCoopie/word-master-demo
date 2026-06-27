/** @typedef {import('./controllers/usePlayfieldController.js').PlayfieldController} PlayfieldController */

/** GP ↔ usePlayfieldController 桥：panelAssembly 完成后 bind，此前 forwarder 为 no-op。 */
export const gpPlayfieldBridge = { ctrl: /** @type {PlayfieldController | null} */ (null) };

/** @param {PlayfieldController} ctrl */
export function bindGpPlayfieldBridge(ctrl) {
  gpPlayfieldBridge.ctrl = ctrl;
}

export function pfEnsureSlotRafRunning() {
  gpPlayfieldBridge.ctrl?.ensureSlotRafRunning?.();
}

/** @param {number} t */
export function pfSetSlotRafLastTime(t) {
  gpPlayfieldBridge.ctrl?.setSlotRafLastTime?.(t);
}

/** @param {number | boolean} [deltaMs] */
export function pfUpdateSlotPositions(deltaMs) {
  gpPlayfieldBridge.ctrl?.updateSlotPositions?.(deltaMs);
}

export function pfOnWordSlotsLayoutResize() {
  gpPlayfieldBridge.ctrl?.onWordSlotsLayoutResize?.();
}

/** @param {number} row @param {number} col @param {object} tile @param {object} [options] */
export function pfStartOneMoveIn(row, col, tile, options) {
  gpPlayfieldBridge.ctrl?.startOneMoveIn?.(row, col, tile, options);
}

/** @param {number} slotIndex */
export function pfStartOneMoveOut(slotIndex) {
  gpPlayfieldBridge.ctrl?.startOneMoveOut?.(slotIndex);
}

export function pfCancelAllFlyingIn() {
  gpPlayfieldBridge.ctrl?.cancelAllFlyingIn?.();
}

export function pfSyncFlyingInTargets() {
  gpPlayfieldBridge.ctrl?.syncFlyingInTargets?.();
}

export function pfFinalizeFlyingBackBatchesImmediately() {
  gpPlayfieldBridge.ctrl?.finalizeFlyingBackBatchesImmediately?.();
}

export function pfGetFlyingBackMinSlotIndex() {
  return gpPlayfieldBridge.ctrl?.getFlyingBackMinSlotIndex?.() ?? null;
}

export function pfWaitForFlyingInIdle() {
  const wait = gpPlayfieldBridge.ctrl?.waitForFlyingInIdle;
  return wait ? wait.call(gpPlayfieldBridge.ctrl) : Promise.resolve();
}

export function pfWaitForFlyingBackIdle() {
  const wait = gpPlayfieldBridge.ctrl?.waitForFlyingBackIdle;
  return wait ? wait.call(gpPlayfieldBridge.ctrl) : Promise.resolve();
}

export function pfTryCeruleanBellFlyInAfterGridStable() {
  const fn = gpPlayfieldBridge.ctrl?.tryCeruleanBellFlyInAfterGridStable;
  return fn ? fn.call(gpPlayfieldBridge.ctrl) : Promise.resolve();
}

/** @param {number} index */
export function pfGetGridTileElByIndex(index) {
  const ctrl = gpPlayfieldBridge.ctrl;
  if (ctrl) return ctrl.getGridTileElByIndex(index);
  return undefined;
}

/** @param {number} row @param {number} col */
export function pfIsTileFlying(row, col) {
  const fn = gpPlayfieldBridge.ctrl?.isTileFlying;
  return fn ? fn(row, col) : false;
}

/** @param {number} slotIndex @param {number} clientX @param {number} clientY @param {object} ghost */
export function pfAnimateWordTileReturnToGrid(slotIndex, clientX, clientY, ghost) {
  gpPlayfieldBridge.ctrl?.animateWordTileReturnToGrid?.(slotIndex, clientX, clientY, ghost);
}

/** @param {object} fly @param {unknown} el */
export function pfSetFlyingInRef(fly, el) {
  gpPlayfieldBridge.ctrl?.setFlyingInRef?.(fly, el);
}

/** @param {unknown} el */
export function pfClearGridTileGsapAfterDrop(el) {
  gpPlayfieldBridge.ctrl?.clearGridTileGsapAfterDrop?.(el);
}

export function pfFlyingLettersRef() {
  return gpPlayfieldBridge.ctrl?.flyingLetters;
}

export function pfFlyingBackBatchesRef() {
  return gpPlayfieldBridge.ctrl?.flyingBackBatches;
}

export function pfGridTileRefsRef() {
  return gpPlayfieldBridge.ctrl?.gridTileRefs;
}

/** @param {import('vue').Ref<unknown[]>} fallback */
export function pfPlayfieldFlyingLettersCount(fallback) {
  const fl = pfFlyingLettersRef();
  return fl ? fl.value.length : fallback.value.length;
}

/** @param {import('vue').Ref<unknown[]>} fallback */
export function pfPlayfieldFlyingBackBatchesCount(fallback) {
  const fb = pfFlyingBackBatchesRef();
  return fb ? fb.value.length : fallback.value.length;
}

export function pfGetSelectedGridCellElsInOrder() {
  const fn = gpPlayfieldBridge.ctrl?.getSelectedGridCellElsInOrder;
  return fn ? fn.call(gpPlayfieldBridge.ctrl) : [];
}

export function pfGetSelectedGridTileElsInOrder() {
  const fn = gpPlayfieldBridge.ctrl?.getSelectedGridTileElsInOrder;
  return fn ? fn.call(gpPlayfieldBridge.ctrl) : [];
}
