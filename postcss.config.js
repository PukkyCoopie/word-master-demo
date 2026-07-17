import postcssLogical from "postcss-logical";
import flexGapLegacyFallback from "./scripts/postcss-flex-gap-legacy.mjs";
import minMaxClampLegacy from "./scripts/postcss-min-max-clamp-legacy.mjs";

/** @type {import('postcss-load-config').Config} */
export default {
  plugins: [
    // min()/max()/clamp() → Chrome 70 可用（先于其它转换）
    minMaxClampLegacy(),
    // inset / margin-block 等逻辑属性 → 物理 TRBL（Chrome &lt; 87）
    postcssLogical(),
    // 保留原生 gap；仅 html.no-flex-gap 下注入 margin 模拟（Chrome &lt; 84 flex gap）
    flexGapLegacyFallback({
      flexGapNotSupported: "html.no-flex-gap",
    }),
  ],
};
