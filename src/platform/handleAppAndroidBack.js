/**
 * App 壳层（主菜单 / 收藏 / 全局 Teleport 浮层）的 Android 返回逻辑。
 * @param {object} ctx
 * @param {() => boolean} ctx.dictGate
 * @param {import('vue').Ref<boolean>} ctx.transitionBusy
 * @param {import('vue').Ref<boolean>} ctx.showTapTapPoster
 * @param {import('vue').Ref<boolean>} ctx.showSaveSlots
 * @param {import('vue').Ref<boolean>} ctx.showPlayerProfile
 * @param {import('vue').Ref<boolean>} ctx.showSettings
 * @param {import('vue').Ref<boolean>} ctx.showAbout
 * @param {import('vue').Ref<{ open: boolean }>} ctx.runStartQuickConfirm
 * @param {import('vue').Ref<boolean>} ctx.showRunStartDialog
 * @param {() => boolean} ctx.showCollection
 * @param {() => boolean} ctx.showMenu
 * @param {() => boolean} ctx.showGame
 * @param {() => void} ctx.closeSaveSlots
 * @param {() => void} ctx.closePlayerProfile
 * @param {() => void} ctx.closeSettings
 * @param {() => void} ctx.closeAbout
 * @param {() => void} ctx.dismissRunStartQuickConfirm
 * @param {() => void} ctx.cancelRunStartDialog
 * @param {() => void} ctx.closeCollection
 */
export function handleAppAndroidBack(ctx) {
  if (ctx.dictGate()) return true;
  if (ctx.transitionBusy.value) return true;

  if (ctx.showTapTapPoster.value) {
    ctx.showTapTapPoster.value = false;
    return true;
  }
  if (ctx.showSaveSlots.value) {
    ctx.closeSaveSlots();
    return true;
  }
  if (ctx.showPlayerProfile.value) {
    ctx.closePlayerProfile();
    return true;
  }
  if (ctx.showSettings.value) {
    ctx.closeSettings();
    return true;
  }
  if (ctx.showAbout.value) {
    ctx.closeAbout();
    return true;
  }
  if (ctx.runStartQuickConfirm.value.open) {
    ctx.dismissRunStartQuickConfirm();
    return true;
  }
  if (ctx.showRunStartDialog.value) {
    ctx.cancelRunStartDialog();
    return true;
  }

  if (ctx.showCollection()) {
    ctx.closeCollection();
    return true;
  }

  if (ctx.showGame()) {
    return false;
  }

  if (ctx.showMenu()) {
    return false;
  }

  return false;
}
