import { ref } from "vue";

/** 本会话是否已开启开发者模式（版本号连点 5 次）。 */
export const developerModeEnabled = ref(false);

export function enableDeveloperMode() {
  developerModeEnabled.value = true;
}

/** @returns {boolean} */
export function isDeveloperModeEnabled() {
  return developerModeEnabled.value;
}
