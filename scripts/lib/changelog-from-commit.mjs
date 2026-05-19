import fs from "node:fs";

/** pre-commit 占位；commit-msg 阶段用 git 提交说明替换 */
export const CHANGELOG_FROM_COMMIT_MSG = "__FROM_COMMIT_MSG__";

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
  return "维护与修复。";
}

/**
 * @param {string} commitMsgPath
 */
export function parseCommitMessageFile(commitMsgPath) {
  return parseCommitMessageText(fs.readFileSync(commitMsgPath, "utf8"));
}
