import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DEBUG_LOG_PATTERN = /^debug-[a-f0-9]+\.log$/i;

/**
 * @param {string} [projectDir]
 * @returns {null | {
 *   fileName: string,
 *   relativePath: string,
 *   absolutePath: string,
 *   sessionId: string,
 *   mtimeMs: number,
 *   mtimeIso: string,
 *   sizeBytes: number,
 * }}
 */
export function findLatestDebugLog(projectDir = process.cwd()) {
  const cursorDir = path.join(projectDir, ".cursor");
  if (!fs.existsSync(cursorDir)) return null;

  const entries = fs
    .readdirSync(cursorDir, { withFileTypes: true })
    .filter((d) => d.isFile() && DEBUG_LOG_PATTERN.test(d.name))
    .map((d) => {
      const absolutePath = path.join(cursorDir, d.name);
      const st = fs.statSync(absolutePath);
      const idMatch = d.name.match(/^debug-([a-f0-9]+)\.log$/i);
      return {
        fileName: d.name,
        relativePath: `.cursor/${d.name}`,
        absolutePath,
        sessionId: idMatch?.[1] ?? d.name,
        mtimeMs: st.mtimeMs,
        mtimeIso: st.mtime.toISOString(),
        sizeBytes: st.size,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return entries[0] ?? null;
}

/**
 * @param {ReturnType<typeof findLatestDebugLog>} latest
 * @param {string} [projectDir]
 */
export function writeDebugLatestPointer(latest, projectDir = process.cwd()) {
  const pointerPath = path.join(projectDir, ".cursor", "debug-latest.json");
  if (!latest) {
    if (fs.existsSync(pointerPath)) fs.unlinkSync(pointerPath);
    return null;
  }

  const payload = {
    path: latest.relativePath,
    absolutePath: latest.absolutePath,
    sessionId: latest.sessionId,
    fileName: latest.fileName,
    mtime: latest.mtimeIso,
    sizeBytes: latest.sizeBytes,
    updatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(pointerPath), { recursive: true });
  fs.writeFileSync(pointerPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

/** @param {ReturnType<typeof findLatestDebugLog>} latest */
export function buildDebugLogContext(latest) {
  if (!latest) {
    return "[Debug log] 当前工作区 `.cursor/` 下无 `debug-*.log`。若用户已开 debug，运行 `node scripts/resolve-debug-log.mjs` 或让用户 @ 具体路径。";
  }

  return [
    "[Debug log] 本会话 debug 日志已解析，分析 debug/埋点/复现时：",
    `1. **先 Read** \`.cursor/debug-latest.json\`（稳定指针）`,
    `2. **再 Read** \`${latest.relativePath}\`（sessionId=\`${latest.sessionId}\`，${latest.mtimeIso}）`,
    "3. 禁止用 Glob 搜 `.cursor/` 后断言「无日志」；系统提示 `debug-xxx.log` 一律指 `.cursor/debug-xxx.log`",
  ].join("\n");
}

/** @param {string} [projectDir] */
export function resolveDebugLog(projectDir = process.cwd()) {
  const latest = findLatestDebugLog(projectDir);
  const pointer = writeDebugLatestPointer(latest, projectDir);
  return { latest, pointer };
}

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const result = resolveDebugLog(projectDir);
  console.log(JSON.stringify(result, null, 2));
}
