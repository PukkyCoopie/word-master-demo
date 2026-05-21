import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readChangelogBundleFromDir } from "./scripts/lib/changelog-dir.mjs";

const VIRTUAL_ID = "virtual:app-changelog";
const RESOLVED_VIRTUAL_ID = "\0" + VIRTUAL_ID;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANGELOG_DIR = path.join(__dirname, "changelog");

/**
 * 从 changelog/*.md 生成虚拟模块，供关于弹窗更新日志使用。
 */
export function changelogFromMarkdownPlugin() {
  /** @type {import('vite').ResolvedConfig | null} */
  let config = null;

  function loadBundle() {
    return readChangelogBundleFromDir(CHANGELOG_DIR);
  }

  function moduleSource() {
    const bundle = loadBundle();
    return `export default ${JSON.stringify(bundle)};`;
  }

  function notifyChangelogReload(server) {
    if (!config) return;
    const mod = config.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
    if (mod) {
      config.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: "full-reload" });
    }
  }

  return {
    name: "changelog-from-markdown",
    enforce: "pre",

    configResolved(resolved) {
      config = resolved;
    },

    configureServer(server) {
      if (!fs.existsSync(CHANGELOG_DIR)) return;
      server.watcher.add(CHANGELOG_DIR);
      const isChangelogPath = (p) => p.replace(/\\/g, "/").includes("/changelog/");
      server.watcher.on("add", (p) => {
        if (isChangelogPath(p)) notifyChangelogReload(server);
      });
      server.watcher.on("change", (p) => {
        if (isChangelogPath(p)) notifyChangelogReload(server);
      });
      server.watcher.on("unlink", (p) => {
        if (isChangelogPath(p)) notifyChangelogReload(server);
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return moduleSource();
      }
    },
  };
}
