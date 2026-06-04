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
  function loadBundle() {
    return readChangelogBundleFromDir(CHANGELOG_DIR);
  }

  function moduleSource() {
    const bundle = loadBundle();
    return `export default ${JSON.stringify(bundle)};`;
  }

  /** @param {import('vite').ViteDevServer} server */
  function notifyChangelogReload(server) {
    if (!server?.moduleGraph) return;
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: "full-reload" });
    }
  }

  return {
    name: "changelog-from-markdown",
    enforce: "pre",

    configureServer(server) {
      if (!fs.existsSync(CHANGELOG_DIR)) return;
      server.watcher.add(CHANGELOG_DIR);
      const isChangelogPath = (p) => p.replace(/\\/g, "/").includes("/changelog/");
      const onChangelogFs = (p) => {
        if (isChangelogPath(p)) notifyChangelogReload(server);
      };
      server.watcher.on("add", onChangelogFs);
      server.watcher.on("change", onChangelogFs);
      server.watcher.on("unlink", onChangelogFs);
      return () => {
        server.watcher.off("add", onChangelogFs);
        server.watcher.off("change", onChangelogFs);
        server.watcher.off("unlink", onChangelogFs);
      };
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
