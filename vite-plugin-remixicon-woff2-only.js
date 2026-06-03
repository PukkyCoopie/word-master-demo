/**
 * remixicon.css 自带 EOT/WOFF/TTF/SVG 等历史格式，Vite 会把 @font-face 里
 * 所有 url() 都打进 dist。本插件在构建/开发时将其替换为仅 woff2。
 */
export function remixiconWoff2Only() {
  return {
    name: "remixicon-woff2-only",
    enforce: "pre",
    transform(code, id) {
      const norm = id.replace(/\\/g, "/");
      if (!norm.includes("/remixicon/fonts/remixicon.css")) return null;

      const woff2Match = code.match(/url\(["']?([^"')]+\.woff2[^"')]*)/i);
      const woff2Url = woff2Match?.[1] ?? "remixicon.woff2";

      const slim = `@font-face {
  font-family: "remixicon";
  src: url("${woff2Url}") format("woff2");
  font-display: swap;
}`;

      return code.replace(/@font-face\s*\{[^}]*\}/, slim);
    },
  };
}
