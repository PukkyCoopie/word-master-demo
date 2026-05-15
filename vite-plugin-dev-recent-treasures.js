/**
 * 开发服务器：按 src/treasures/items/treasure_*.js 的 mtime 排序，供商店第三格展示「最近改动」宝藏（前两格仍为随机）。
 * 生产构建下 virtual 模块固定导出空数组；此时 GamePanel 第三格会改为「再抽一个随机宝藏」，不再依赖本模块。
 */
import fs from "node:fs";
import path from "node:path";

const VIRTUAL_ID = "virtual:dev-recent-treasures";
const RESOLVED_VIRTUAL = "\0" + VIRTUAL_ID;

/** 参与排序的最近文件数上限 */
const MAX_TRACKED = 16;

function scanRecentTreasureIds(root) {
  const itemsDir = path.join(root, "src", "treasures", "items");
  if (!fs.existsSync(itemsDir)) return [];

  const entries = fs
    .readdirSync(itemsDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /^treasure_\d+\.js$/.test(d.name))
    .map((d) => {
      const m = d.name.match(/^treasure_(\d+)\.js$/);
      const id = m ? m[1] : null;
      const full = path.join(itemsDir, d.name);
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(full).mtimeMs;
      } catch {
        return null;
      }
      return id ? { id, mtimeMs } : null;
    })
    .filter(Boolean);

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const seen = new Set();
  const ids = [];
  for (const e of entries) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    ids.push(e.id);
    if (ids.length >= MAX_TRACKED) break;
  }
  return ids;
}

function invalidateVirtualModule(server) {
  const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL);
  if (mod) server.moduleGraph.invalidateModule(mod);
}

export function devRecentTreasuresPlugin() {
  /** @type {string[]} */
  let recentIds = [];
  /** @type {string} */
  let projectRoot = process.cwd();

  return {
    name: "dev-recent-treasures",
    configResolved(config) {
      projectRoot = config.root;
    },
    configureServer(server) {
      const root = server.config.root;
      const itemsDir = path.join(root, "src", "treasures", "items");

      const refresh = () => {
        recentIds = scanRecentTreasureIds(root);
        invalidateVirtualModule(server);
      };

      refresh();
      if (fs.existsSync(itemsDir)) {
        server.watcher.add(itemsDir);
      }

      const onTreasureItemFsEvent = (file) => {
        const norm = path.normalize(file);
        const dir = path.normalize(itemsDir);
        if (!norm.startsWith(dir) || !norm.endsWith(".js")) return;
        refresh();
      };

      server.watcher.on("change", onTreasureItemFsEvent);
      server.watcher.on("add", onTreasureItemFsEvent);
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL) return null;
      if (process.env.NODE_ENV === "production") {
        return "export const DEV_RECENT_TREASURE_IDS = [];\n";
      }
      const ids = recentIds.length > 0 ? recentIds : scanRecentTreasureIds(projectRoot);
      return `export const DEV_RECENT_TREASURE_IDS = ${JSON.stringify(ids)};\n`;
    },
  };
}
