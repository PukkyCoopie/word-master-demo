/**
 * 局内自动存档：在数据变更后标记 pending，待动画/转场空闲后写入当前槽位。
 *
 * @param {{
 *   canSave: () => { ok: boolean },
 *   save: () => void,
 *   isAlive?: () => boolean,
 * }} opts
 */
export function createRunAutoSave(opts) {
  const isAlive = opts.isAlive ?? (() => true);
  let pending = false;

  function tryFlush() {
    if (!pending || !isAlive()) return;
    if (!opts.canSave().ok) return;
    pending = false;
    opts.save();
  }

  function scheduleAutoSave() {
    if (!isAlive()) return;
    pending = true;
    tryFlush();
  }

  function cancelPending() {
    pending = false;
  }

  return { scheduleAutoSave, tryFlush, cancelPending };
}
