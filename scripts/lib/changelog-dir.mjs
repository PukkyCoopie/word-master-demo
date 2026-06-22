import fs from "node:fs";
import path from "node:path";
import { formatVersionString, versionFileNameForSemver } from "./app-version-files.mjs";

export const CHANGELOG_DIR_NAME = "changelog";
export const CHANGELOG_TEMPLATE_BASENAME = "_template.md";
/** 正文内分隔「玩家手写」与「commit 自动追加」的标记（HTML 注释，编辑器中可见） */
export const CHANGELOG_AUTO_MARKER = "<!-- changelog:auto -->";

const VERSION_FILE_RE = /^(\d+)_(\d+)_(\d+)\.md$/i;

/** 本地时区下的 YYYY-MM-DD（pre-commit 写入 date 用） */
export function changelogTodayDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
 * 详细信息区是否已由人工提炼（true 时 pre-commit 不再追加 commit 说明）。
 * @param {string | undefined} value
 */
export function parseSummarized(value) {
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
  if (meta.summarized != null && String(meta.summarized).trim() !== "") {
    lines.push(`summarized: ${parseSummarized(meta.summarized) ? "true" : "false"}`);
  }
  lines.push("---", "", body.trim(), "");
  return lines.join("\n");
}

/**
 * @param {string} body
 * @returns {{ user: string, auto: string }}
 */
export function splitChangelogBody(body) {
  const idx = body.indexOf(CHANGELOG_AUTO_MARKER);
  if (idx === -1) {
    return { user: body.trim(), auto: "" };
  }
  return {
    user: body.slice(0, idx).trim(),
    auto: body.slice(idx + CHANGELOG_AUTO_MARKER.length).trim(),
  };
}

/**
 * @param {string} user
 * @param {string} auto
 */
export function joinChangelogBody(user, auto) {
  const u = user.trim();
  const a = auto.trim();
  if (!a) {
    return u ? `${u}\n` : "";
  }
  if (!u) {
    return `${CHANGELOG_AUTO_MARKER}\n\n${a}\n`;
  }
  return `${u}\n\n${CHANGELOG_AUTO_MARKER}\n\n${a}\n`;
}

/**
 * @param {string} body
 */
export function stripChangelogComments(body) {
  const { user, auto } = splitChangelogBody(body);
  const strippedUser = user
    .replace(/<!--(?!\s*changelog:auto\s*)[\s\S]*?-->/g, "")
    .trim();
  return joinChangelogBody(strippedUser, auto);
}

/**
 * 将一条 commit 说明追加到自动区（去重、统一为列表项）。
 * @param {string} autoBody
 * @param {string} line
 */
export function appendAutoChangelogLine(autoBody, line) {
  const trimmed = line.trim();
  if (!trimmed) return autoBody;

  const bullet = trimmed.startsWith("- ") ? trimmed : `- ${trimmed}`;
  const existing = autoBody
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (existing.some((l) => l === bullet || l === trimmed)) {
    return autoBody;
  }
  return existing.length ? `${autoBody.trim()}\n${bullet}` : bullet;
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
  const { user } = splitChangelogBody(body);
  const stripped = stripChangelogComments(user);
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
 * @param {{ maxVersion?: string | null }} [options] 若指定，仅保留 ≤ 该版本的 show 条目，且 maxVersion 为该值
 */
export function readChangelogBundleFromDir(dir, options = {}) {
  const capSemver = options.maxVersion
    ? parseSemverFromVersionString(options.maxVersion)
    : null;

  const maxSemver = getMaxVersionSemverInChangelogDir(dir);
  const maxVersion = capSemver
    ? formatVersionString(capSemver)
    : listVersionSemversInChangelogDir(dir).length > 0
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

    if (capSemver && compareSemver(parseSemverFromVersionString(version), capSemver) > 0) {
      continue;
    }

    const filePath = path.join(dir, name);
    const { meta, body } = parseChangelogMarkdown(fs.readFileSync(filePath, "utf8"));
    if (!parseShowInGame(meta.show)) continue;

    const { user, auto } = splitChangelogBody(stripChangelogComments(body));
    if (!user && !auto) continue;

    const stat = fs.statSync(filePath);
    const date =
      meta.date?.trim() ||
      meta.Date?.trim() ||
      stat.mtime.toISOString().slice(0, 10);

    const sortKey = version.split(".").map((n) => Number(n) || 0);
    entries.push({
      version,
      date,
      summary: user,
      autoSummary: auto,
      sortKey,
    });
  }

  entries.sort((a, b) => {
    for (let i = 0; i < 3; i++) {
      if (b.sortKey[i] !== a.sortKey[i]) return b.sortKey[i] - a.sortKey[i];
    }
    return 0;
  });

  return {
    maxVersion,
    entries: entries.map(({ version, date, summary, autoSummary }) => ({
      version,
      date,
      summary,
      ...(autoSummary ? { autoSummary } : {}),
    })),
  };
}

/** @deprecated 使用 readChangelogBundleFromDir */
export function readChangelogEntriesFromDir(dir) {
  return readChangelogBundleFromDir(dir).entries;
}
