import fs from "node:fs";

const NO_BUMP_INLINE_RE = /\[no-bump\]|\bno-bump\b/i;

/**
 * commit 说明是否要求跳过 post-commit 升版（匹配 no-bump / [no-bump]，不区分大小写）。
 * @param {string} raw
 */
export function commitMessageRequestsNoBump(raw) {
  if (!raw?.trim()) return false;
  return NO_BUMP_INLINE_RE.test(raw);
}

/**
 * 去掉 no-bump 标记，供 changelog 自动区使用。
 * @param {string} text
 */
export function stripNoBumpMarkers(text) {
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\[no-bump\]/gi, "")
        .replace(/\bno-bump\b/gi, "")
        .trim(),
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * @param {string} raw
 */
export function parseCommitMessageText(raw) {
  const lines = raw.split(/\r?\n/);
  const subject = (lines[0] ?? "").trim();

  const body = [];
  let inBody = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!inBody && line.trim() === "") {
      inBody = true;
      continue;
    }
    if (inBody && line.startsWith("#")) break;
    if (inBody) body.push(line);
  }

  const bodyText = body.join("\n").trim();
  if (bodyText) return bodyText;
  if (subject) return subject;
  return "";
}

/**
 * 解析供 changelog 自动区写入的说明（去掉 no-bump 标记）。
 * @param {string} raw
 */
export function parseCommitMessageForChangelog(raw) {
  const summary = parseCommitMessageText(raw);
  const stripped = stripNoBumpMarkers(summary);
  if (stripped) return stripped;

  const subject = (raw.split(/\r?\n/)[0] ?? "").trim();
  return stripNoBumpMarkers(subject);
}

/**
 * @param {string} commitMsgPath
 */
export function parseCommitMessageFile(commitMsgPath) {
  return parseCommitMessageText(fs.readFileSync(commitMsgPath, "utf8"));
}

/**
 * @param {string} commitMsgPath
 */
export function parseCommitMessageFileForChangelog(commitMsgPath) {
  return parseCommitMessageForChangelog(fs.readFileSync(commitMsgPath, "utf8"));
}
