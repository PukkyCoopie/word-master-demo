import { watch } from "vue";
import { gameSettings } from "./gameSettings.js";

const HTML_CLASS = "swap-confirm-button-side";

export function applySwapConfirmButtonSideHtmlClass() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(HTML_CLASS, gameSettings.swapConfirmButtonSide === true);
}

export function initConfirmButtonSideSettings() {
  applySwapConfirmButtonSideHtmlClass();
  watch(
    () => gameSettings.swapConfirmButtonSide,
    () => applySwapConfirmButtonSideHtmlClass(),
  );
}

applySwapConfirmButtonSideHtmlClass();
