import {
  ACHIEVEMENT_DEFINITIONS,
  getAchievementIconUrl,
} from "../achievements/achievementDefinitions.js";
import { ACHIEVEMENT_ICON_URL } from "../achievements/achievementAssets.js";
import { TAP_TAP_ICON_SRC, TAP_TAP_POSTER_SRC } from "../taptap/tapTapWebPromo.js";
import { TAP_TAP_LOGIN_BUTTON_SRC } from "../taptap/tapTapLoginButtonAssets.js";

/** @returns {string[]} */
export function collectBootImageUrls() {
  /** @type {Set<string>} */
  const urls = new Set();
  urls.add(ACHIEVEMENT_ICON_URL);
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    urls.add(getAchievementIconUrl(def));
  }
  urls.add(TAP_TAP_POSTER_SRC);
  urls.add(TAP_TAP_ICON_SRC);
  urls.add(TAP_TAP_LOGIN_BUTTON_SRC);
  return [...urls].filter(Boolean);
}
