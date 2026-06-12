import { Capacitor } from "@capacitor/core";
import { ref } from "vue";
import { isE2eMode } from "../e2e/isE2eMode.js";

const STORAGE_KEY = "word_master_privacy_consent_v1";

/** @returns {boolean} */
function readConsentFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && ts > 0;
  } catch {
    return false;
  }
}

/** @type {import('vue').Ref<boolean>} */
export const privacyConsentGranted = ref(readConsentFromStorage());

/** Capacitor 原生壳内且非 E2E 时需要隐私同意。 */
export function isPrivacyConsentRequired() {
  return Capacitor.isNativePlatform() && !isE2eMode();
}

/** @returns {boolean} */
export function hasPrivacyConsent() {
  if (!isPrivacyConsentRequired()) return true;
  return privacyConsentGranted.value;
}

export function markPrivacyConsentAgreed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  privacyConsentGranted.value = true;
}
