/** 连续变更合并窗口（毫秒） */
export const RUN_AUTO_SAVE_DEBOUNCE_MS = 3000;

/** requestIdleCallback 最长等待，避免一直等不到 idle */
const RUN_AUTO_SAVE_IDLE_TIMEOUT_MS = 2000;

/** @type {typeof requestIdleCallback | undefined} */
const scheduleIdle =
  typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : undefined;

/**
 * 局内自动存档：变更后标记 pending，debounce 合并；空闲且可写时于 idle 回调写入。
 * 显式 `tryFlush({ force: true })` 立即同步写入（退菜单等）。
 *
 * @param {{
 *   canSave: () => { ok: boolean },
 *   save: (opts?: { immediate?: boolean }) => void,
 *   isAlive?: () => boolean,
 *   debounceMs?: number,
 * }} opts
 */
export function createRunAutoSave(opts) {
  const isAlive = opts.isAlive ?? (() => true);
  const debounceMs = Math.max(0, Math.floor(Number(opts.debounceMs ?? RUN_AUTO_SAVE_DEBOUNCE_MS) || 0));
  let pending = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let debounceTimer = null;
  /** @type {number | null} */
  let idleHandle = null;
  let idleUsesRequestIdle = false;

  function cancelIdleFlush() {
    if (idleHandle == null) return;
    if (idleUsesRequestIdle && typeof cancelIdleCallback === "function") {
      cancelIdleCallback(idleHandle);
    } else {
      clearTimeout(idleHandle);
    }
    idleHandle = null;
    idleUsesRequestIdle = false;
  }

  function cancelScheduledFlush() {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    cancelIdleFlush();
  }

  function executeSave(immediate) {
    if (!pending || !isAlive()) return false;
    if (!opts.canSave().ok) return false;
    pending = false;
    cancelScheduledFlush();
    opts.save({ immediate: immediate === true });
    return true;
  }

  function scheduleIdleFlush() {
    if (idleHandle != null) return;
    const run = () => {
      idleHandle = null;
      idleUsesRequestIdle = false;
      if (!pending || !isAlive()) return;
      if (!opts.canSave().ok) return;
      executeSave(false);
    };
    if (scheduleIdle) {
      idleUsesRequestIdle = true;
      idleHandle = scheduleIdle(run, { timeout: RUN_AUTO_SAVE_IDLE_TIMEOUT_MS });
    } else {
      idleUsesRequestIdle = false;
      idleHandle = setTimeout(run, 0);
    }
  }

  function armDebounceFlush() {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (!pending || !isAlive()) return;
      if (!opts.canSave().ok) return;
      scheduleIdleFlush();
    }, debounceMs);
  }

  /**
   * @param {{ force?: boolean }} [flushOpts]
   */
  function tryFlush(flushOpts = {}) {
    if (!pending || !isAlive()) return;
    if (!opts.canSave().ok) return;
    if (flushOpts.force === true) {
      executeSave(true);
      return;
    }
    if (debounceTimer != null || idleHandle != null) return;
    armDebounceFlush();
  }

  function scheduleAutoSave() {
    if (!isAlive()) return;
    pending = true;
    cancelIdleFlush();
    if (!opts.canSave().ok) return;
    armDebounceFlush();
  }

  function cancelPending() {
    pending = false;
    cancelScheduledFlush();
  }

  return { scheduleAutoSave, tryFlush, cancelPending };
}
