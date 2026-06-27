import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { devRecentTreasuresPlugin } from "./vite-plugin-dev-recent-treasures.js";
import { changelogFromMarkdownPlugin } from "./vite-plugin-changelog.mjs";
import { remixiconWoff2Only } from "./vite-plugin-remixicon-woff2-only.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_SRC = path.join(__dirname, "data", "dictionary", "dict.json");
const DIST_DIR = path.join(__dirname, "dist");

/** 构建产物中不随包发布的 public 路径（源图、实验页等） */
const DIST_SHIP_PRUNE = [
  "app-icon-source.png",
  path.join("images", "challenge.png"),
  "labs",
  path.join("data", "dictionary", "dict.json"),
  path.join("data", "dictionary", ".gitkeep"),
  path.join("taptap", "login", "README.txt"),
];

/** @param {string} dir */
function pruneAchievementPngSources(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removedBytes = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(".png")) continue;
    const filePath = path.join(dir, name);
    removedBytes += fs.statSync(filePath).size;
    fs.rmSync(filePath, { force: true });
  }
  return removedBytes;
}

function pruneDistShipArtifacts() {
  let removedBytes = 0;

  for (const rel of DIST_SHIP_PRUNE) {
    const target = path.join(DIST_DIR, rel);
    if (!fs.existsSync(target)) continue;
    if (fs.statSync(target).isFile()) {
      removedBytes += fs.statSync(target).size;
    } else {
      removedBytes += dirSizeBytes(target);
    }
    fs.rmSync(target, { recursive: true, force: true });
  }

  removedBytes += pruneAchievementPngSources(
    path.join(DIST_DIR, "images", "achievements"),
  );

  if (removedBytes > 0) {
    console.log(
      `[vite] 已剔除不应随包发布的静态资源：${(removedBytes / 1024 / 1024).toFixed(2)} MB`,
    );
  }
}

/** @param {string} dir */
function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeBytes(fullPath);
    } else {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function brotliCompressBuffer(raw) {
  return zlib.brotliCompressSync(raw, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  });
}

function buildSplitDictionaryPayload(rawJsonBuffer) {
  const raw = JSON.parse(rawJsonBuffer.toString("utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("dict.json 格式错误");
  }

  const coreLines = [];
  const defLines = [];
  for (const row of raw) {
    const [word, pos, translation_zh] = row;
    if (!word || !pos) continue;
    coreLines.push(`${JSON.stringify([word, pos])}\n`);
    if (translation_zh) {
      defLines.push(`${JSON.stringify([word, translation_zh])}\n`);
    }
  }

  return {
    core: Buffer.from(coreLines.join(""), "utf8"),
    defs: Buffer.from(defLines.join(""), "utf8"),
  };
}

function writeDictionaryToDist() {
  if (!fs.existsSync(DICT_SRC)) {
    console.warn(
      "[vite] 未找到 data/dictionary/dict.json，dist 可能不包含完整词典",
    );
    return;
  }

  const raw = fs.readFileSync(DICT_SRC);
  const { core, defs } = buildSplitDictionaryPayload(raw);
  const coreCompressed = brotliCompressBuffer(core);
  const defsCompressed = brotliCompressBuffer(defs);

  const outDir = path.join(DIST_DIR, "data", "dictionary");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "dict.core.jsonl"), core);
  fs.writeFileSync(path.join(outDir, "dict.defs.jsonl"), defs);
  fs.writeFileSync(path.join(outDir, "dict.core.br"), coreCompressed);
  fs.writeFileSync(path.join(outDir, "dict.defs.br"), defsCompressed);
  fs.writeFileSync(
    path.join(outDir, "dict.meta.json"),
    JSON.stringify({
      format: "brotli",
      split: true,
      coreFile: "dict.core.br",
      defsFile: "dict.defs.br",
      nativeCoreFile: "dict.core.jsonl",
      nativeDefsFile: "dict.defs.jsonl",
      coreUncompressedBytes: core.length,
      defsUncompressedBytes: defs.length,
      coreCompressedBytes: coreCompressed.length,
      defsCompressedBytes: defsCompressed.length,
    }),
  );

  for (const legacyName of ["dict.json.br", "dict.json"]) {
    const legacyPath = path.join(outDir, legacyName);
    if (fs.existsSync(legacyPath)) fs.rmSync(legacyPath, { force: true });
  }

  console.log(
    `[vite] 词典分包：core ${(core.length / 1024 / 1024).toFixed(2)} MB（App 明文 / Web Brotli ${(coreCompressed.length / 1024 / 1024).toFixed(2)} MB）；defs ${(defs.length / 1024 / 1024).toFixed(2)} MB（Web Brotli ${(defsCompressed.length / 1024 / 1024).toFixed(2)} MB）`,
  );
}

/** @param {"web" | "native" | "both"} shipMode */
function pruneDictionaryByShipTarget(shipMode) {
  const outDir = path.join(DIST_DIR, "data", "dictionary");
  if (!fs.existsSync(outDir)) return 0;

  /** @type {string[]} */
  const removeNames =
    shipMode === "web"
      ? ["dict.core.jsonl", "dict.defs.jsonl"]
      : shipMode === "native"
        ? ["dict.core.br", "dict.defs.br"]
        : [];

  let removedBytes = 0;
  for (const name of removeNames) {
    const target = path.join(outDir, name);
    if (!fs.existsSync(target)) continue;
    removedBytes += fs.statSync(target).size;
    fs.rmSync(target, { force: true });
  }

  if (removedBytes > 0) {
    console.log(
      `[vite] 词典随 ${shipMode} 发布已剔除 ${(removedBytes / 1024 / 1024).toFixed(2)} MB`,
    );
  }
  return removedBytes;
}

/**
 * 开发时优先从 data/dictionary/dict.json 提供 /.../data/dictionary/dict.json，
 * 避免 public 里放了旧版/精简词典导致常见词（如 tired）校验失败。
 * 构建结束时写入 Brotli 包与 meta，并裁剪不应随 APK 发布的静态资源。
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
    writeBundle() {
      writeDictionaryToDist();
      const requestedShipMode = String(process.env.WM_DICT_SHIP || "both").toLowerCase();
      const shipMode =
        requestedShipMode === "web" || requestedShipMode === "native" || requestedShipMode === "both"
          ? requestedShipMode
          : "both";
      pruneDictionaryByShipTarget(shipMode);
      pruneDistShipArtifacts();
    },
  };
}

export default defineConfig({
  base: "./",
  root: ".",
  publicDir: "public",
  // 等写入稳定后再触发 HMR，减轻编辑器/Agent 分步保存时的半截语法报错
  server: {
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 50,
      },
    },
  },
  plugins: [changelogFromMarkdownPlugin(), remixiconWoff2Only(), dictionaryFromDataDir(), devRecentTreasuresPlugin(), vue()],
});
