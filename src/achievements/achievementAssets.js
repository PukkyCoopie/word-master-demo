export const ACHIEVEMENT_ICON_DIR = "/images/achievements";
/** Achievement placeholder icon, 256x256 WebP. */
export const ACHIEVEMENT_ICON_URL = "/images/challenge.webp";

/** @param {string} id */
export function getAchievementIconPath(id) {
  const cleanId = String(id ?? "").trim();
  return cleanId ? `${ACHIEVEMENT_ICON_DIR}/${cleanId}.webp` : ACHIEVEMENT_ICON_URL;
}
