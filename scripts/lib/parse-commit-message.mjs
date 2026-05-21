import fs from "node:fs";

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
 * @param {string} commitMsgPath
 */
export function parseCommitMessageFile(commitMsgPath) {
  return parseCommitMessageText(fs.readFileSync(commitMsgPath, "utf8"));
}
