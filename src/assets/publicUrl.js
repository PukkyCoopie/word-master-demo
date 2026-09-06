/**
 * `public/` 下静态资源 URL，带上 Vite `base`。
 * GitHub Pages 仓库子路径、相对 base（CloudBase / Capacitor）都正确。
 *
 * @param {string} path 如 `images/poster.webp` 或 `/images/poster.webp`
 */
export function publicUrl(path) {
  const rel = String(path ?? "").replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "./";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${rel}`;
}
