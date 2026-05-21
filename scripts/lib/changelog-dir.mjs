import fs from "node:fs";
import path from "node:path";
import { formatVersionString, versionFileNameForSemver } from "./app-version-files.mjs";

export const CHANGELOG_DIR_NAME = "changelog";
export const CHANGELOG_TEMPLATE_BASENAME = "_template.md";

const VERSION_FILE_RE = /^(\d+)_(\d+)_(\d+)\.md$/i;

/** @typedef {{ meta: Record<string, string>, body: string }} ChangelogParsed */

/**
 * @param {string | undefined} value
 */
export function parseShowInGame(value) {
  if (value == null || value === "") return false;
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

/**
 * @param {string} raw
 * @returns {ChangelogParsed}
 */
export function parseChangelogMarkdown(raw) {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    return { meta: {}, body: raw.trim() };
  }
  const end = trimmed.indexOf("---", 3);
  if (end === -1) {
    return { meta: {}, body: raw.trim() };
  }
  const block = trimmed.slice(3, end).trim();
  /** @type {Record<string, string>} */
  const meta = {};
  for (const line of block.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) meta[key] = val;
  }
  return { meta, body: trimmed.slice(end + 3).trim() };
}

/**
 * @param {Record<string, string>} meta
 * @param {string} body
 */
export function serializeChangelogMarkdown(meta, body) {
  const lines = ["---"];
  const date = meta.date?.trim();
  if (date) lines.push(`date: ${date}`);
  lines.push(`show: ${parseShowInGame(meta.show) ? "true" : "false"}`);
  lines.push("---", "", body.trim(), "");
  return lines.join("\n");
}

/**
 * @param {string} body
 */
export function stripChangelogComments(body) {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/** @type {string | null} */
let templateBodyCache = null;

/**
 * @param {string} changelogDir
 */
function getTemplateBody(changelogDir) {
  if (templateBodyCache != null) return templateBodyCache;
  const templatePath = path.join(changelogDir, CHANGELOG_TEMPLATE_BASENAME);
  if (!fs.existsSync(templatePath)) {
    templateBodyCache = "";
    return templateBodyCache;
  }
  const { body } = parseChangelogMarkdown(fs.readFileSync(templatePath, "utf8"));
  templateBodyCache = stripChangelogComments(body);
  return templateBodyCache;
}

/**
 * 是否已有玩家手写的更新说明（非空且非模板占位）。
 * @param {string} changelogDir
 * @param {string} body
 */
export function isUserWrittenChangelogBody(changelogDir, body) {
  const stripped = stripChangelogComments(body);
  if (!stripped) return false;

  const templateBody = getTemplateBody(changelogDir);
  if (templateBody && stripped === templateBody) return false;

  const normalized = stripped.replace(/\s+/g, " ").trim();
  const placeholderOnly =
    /^在此填写本版本更新说明/.test(stripped) &&
    /条目一/.test(stripped) &&
    stripped.length < 120;
  if (placeholderOnly) return false;

  return true;
}

/**
 * @param {{ major: number, minor: number, patch: number }} a
 * @param {{ major: number, minor: number, patch: number }} b
 */
export function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * @param {string} version
 */
export function parseSemverFromVersionString(version) {
  const [major, minor, patch] = version.split(".").map((n) => Number(n) || 0);
  return { major, minor, patch };
}

/**
 * @param {string} basename
 */
export function isChangelogTemplateFile(basename) {
  const lower = basename.toLowerCase();
  return (
    lower === CHANGELOG_TEMPLATE_BASENAME.toLowerCase() ||
    lower === "readme.md" ||
    basename.startsWith("_") ||
    basename.startsWith(".")
  );
}

/**
 * @param {string} basename
 * @returns {string | null}
 */
export function versionFromChangelogFilename(basename) {
  const m = basename.match(VERSION_FILE_RE);
  if (!m) return null;
  return `${Number(m[1])}.${Number(m[2])}.${Number(m[3])}`;
}

/**
 * @param {string} dir
 * @returns {{ major: number, minor: number, patch: number }[]}
 */
export function listVersionSemversInChangelogDir(dir) {
  if (!fs.existsSync(dir)) return [];

  /** @type {{ major: number, minor: number, patch: number }[]} */
  const versions = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md") || isChangelogTemplateFile(name)) continue;
    const version = versionFromChangelogFilename(name);
    if (!version) continue;
    versions.push(parseSemverFromVersionString(version));
  }
  return versions;
}

/**
 * @param {string} dir
 */
export function getMaxVersionSemverInChangelogDir(dir) {
  const versions = listVersionSemversInChangelogDir(dir);
  if (versions.length === 0) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return versions.reduce((max, v) => (compareSemver(v, max) > 0 ? v : max));
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
export function getLatestChangelogFilePath(dir) {
  const max = getMaxVersionSemverInChangelogDir(dir);
  if (listVersionSemversInChangelogDir(dir).length === 0) return null;
  return path.join(dir, versionFileNameForSemver(max));
}

/**
 * @param {string} dir
 * @param {{ major: number, minor: number, patch: number }} semver
 * @param {string} [todayIso]
 * @returns {boolean}
 */
export function ensureChangelogFileFromTemplate(dir, semver, todayIso) {
  const templatePath = path.join(dir, CHANGELOG_TEMPLATE_BASENAME);
  const targetName = versionFileNameForSemver(semver);
  const targetPath = path.join(dir, targetName);

  if (fs.existsSync(targetPath)) {
    return false;
  }
  if (!fs.existsSync(templatePath)) {
    console.warn(`[changelog] 未找到模板 ${templatePath}，跳过创建 ${targetName}`);
    return false;
  }

  fs.mkdirSync(dir, { recursive: true });
  const date = todayIso ?? new Date().toISOString().slice(0, 10);
  let content = fs.readFileSync(templatePath, "utf8");
  content = content.replace(/date:\s*YYYY-MM-DD/i, `date: ${date}`);
  if (!/^show:/im.test(content.split("---")[1] ?? "")) {
    content = content.replace(/(---\r?\n)/, "$1show: false\n");
  }
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

/**
 * @param {string} dir
 */
export function readChangelogBundleFromDir(dir) {
  const maxSemver = getMaxVersionSemverInChangelogDir(dir);
  const maxVersion =
    listVersionSemversInChangelogDir(dir).length > 0
      ? formatVersionString(maxSemver)
      : null;

  if (!fs.existsSync(dir)) {
    return { maxVersion, entries: [] };
  }

  /** @type {{ version: string, date?: string, summary: string, sortKey: number[] }[]} */
  const entries = [];

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    if (isChangelogTemplateFile(name)) continue;

    const version = versionFromChangelogFilename(name);
    if (!version) {
      console.warn(`[changelog] 跳过无法解析版本的文件: ${name}（期望形如 0_0_8.md）`);
      continue;
    }

    const filePath = path.join(dir, name);
    const { meta, body } = parseChangelogMarkdown(fs.readFileSync(filePath, "utf8"));
    if (!parseShowInGame(meta.show)) continue;
    if (!stripChangelogComments(body)) continue;

    const stat = fs.statSync(filePath);
    const date =
      meta.date?.trim() ||
      meta.Date?.trim() ||
      stat.mtime.toISOString().slice(0, 10);

    const sortKey = version.split(".").map((n) => Number(n) || 0);
    entries.push({ version, date, summary: body, sortKey });
  }

  entries.sort((a, b) => {
    for (let i = 0; i < 3; i++) {
      if (b.sortKey[i] !== a.sortKey[i]) return b.sortKey[i] - a.sortKey[i];
    }
    return 0;
  });

  return {
    maxVersion,
    entries: entries.map(({ version, date, summary }) => ({ version, date, summary })),
  };
}

/** @deprecated 使用 readChangelogBundleFromDir */
export function readChangelogEntriesFromDir(dir) {
  return readChangelogBundleFromDir(dir).entries;
}
