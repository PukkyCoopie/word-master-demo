#!/usr/bin/env node
/**
 * Git pre-commit / commit-msg：若 changelog 最新版本未手写说明，将提交说明写入该 md（show: false，不进游戏列表）。
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./lib/app-version-files.mjs";
import {
  CHANGELOG_DIR_NAME,
  getLatestChangelogFilePath,
  isUserWrittenChangelogBody,
  parseChangelogMarkdown,
  serializeChangelogMarkdown,
} from "./lib/changelog-dir.mjs";
import {
  parseCommitMessageFile,
  parseCommitMessageText,
} from "./lib/parse-commit-message.mjs";

/**
 * @returns {string}
 */
function resolveCommitMessageText() {
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(argPath)) {
    return parseCommitMessageFile(argPath);
  }
  const editMsg = path.join(REPO_ROOT, ".git", "COMMIT_EDITMSG");
  if (fs.existsSync(editMsg)) {
    return parseCommitMessageText(fs.readFileSync(editMsg, "utf8"));
  }
  return "";
}

function gitAdd(relPath) {
  execSync(`git add ${JSON.stringify(relPath)}`, {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

function main() {
  if (process.env.SKIP_VERSION_BUMP === "1" || process.env.CI === "true") {
    return;
  }

  const summary = resolveCommitMessageText().trim();
  if (!summary) {
    return;
  }

  const changelogDir = path.join(REPO_ROOT, CHANGELOG_DIR_NAME);
  const latestPath = getLatestChangelogFilePath(changelogDir);
  if (!latestPath) {
    return;
  }

  const raw = fs.readFileSync(latestPath, "utf8");
  const { meta, body } = parseChangelogMarkdown(raw);

  if (isUserWrittenChangelogBody(changelogDir, body)) {
    return;
  }

  const date = meta.date?.trim() || new Date().toISOString().slice(0, 10);
  const next = serializeChangelogMarkdown(
    { ...meta, date, show: "false" },
    summary,
  );
  fs.writeFileSync(latestPath, next, "utf8");

  const rel = path.relative(REPO_ROOT, latestPath).replace(/\\/g, "/");
  gitAdd(rel);

  console.log(
    `[changelog] 已写入最新版本说明（仅存档，show: false）：${path.basename(latestPath)}`,
  );
}

main();
