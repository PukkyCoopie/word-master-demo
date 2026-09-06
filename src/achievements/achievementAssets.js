import { publicUrl } from "../assets/publicUrl.js";

export const ACHIEVEMENT_ICON_DIR = publicUrl("images/achievements");
/** Achievement placeholder icon, 256x256 WebP. */
export const ACHIEVEMENT_ICON_URL = publicUrl("images/challenge.webp");

/** @param {string} id */
export function getAchievementIconPath(id) {
  const cleanId = String(id ?? "").trim();
  return cleanId ? `${ACHIEVEMENT_ICON_DIR}/${cleanId}.webp` : ACHIEVEMENT_ICON_URL;
}
