import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { devRecentTreasuresPlugin } from "./vite-plugin-dev-recent-treasures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_SRC = path.join(__dirname, "data", "dictionary", "dict.json");

/**
 * 开发时优先从 data/dictionary/dict.json 提供 /.../data/dictionary/dict.json，
 * 避免 public 里放了旧版/精简词典导致常见词（如 tired）校验失败。
 * 构建结束时把同一份复制到 dist，覆盖 public 里可能过期的副本。
 */
function dictionaryFromDataDir() {
  return {
    name: "dictionary-from-data-dir",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const clean = req.url?.split("?")[0] ?? "";
        if (!clean.endsWith("/data/dictionary/dict.json")) {
          next();
          return;
        }
        if (!fs.existsSync(DICT_SRC)) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        const stream = fs.createReadStream(DICT_SRC);
        stream.on("error", () => next());
        stream.pipe(res);
      });
    },
    closeBundle() {
      if (!fs.existsSync(DICT_SRC)) {
        console.warn(
          "[vite] 未找到 data/dictionary/dict.json，dist 可能不包含完整词典。"
        );
        return;
      }
      const out = path.join(__dirname, "dist", "data", "dictionary", "dict.json");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(DICT_SRC, out);
    },
  };
}

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [dictionaryFromDataDir(), devRecentTreasuresPlugin(), vue()],
});
