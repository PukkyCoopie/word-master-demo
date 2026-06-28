#!/usr/bin/env node
/**
 * Git pre-commit / commit-msg：将提交说明追加到最新版本 md 的「自动区」；
 * 玩家手写区不变；每次写入时 date 为当天。无手写时仅写自动区且 show: false。
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./lib/app-version-files.mjs";
import {
  CHANGELOG_DIR_NAME,
  appendAutoChangelogLine,
  changelogTodayDate,
  getLatestChangelogFilePath,
  isUserWrittenChangelogBody,
  joinChangelogBody,
  parseChangelogMarkdown,
  parseSummarized,
  serializeChangelogMarkdown,
  splitChangelogBody,
  stripChangelogComments,
} from "./lib/changelog-dir.mjs";
import {
  parseCommitMessageFileForChangelog,
  parseCommitMessageForChangelog,
} from "./lib/parse-commit-message.mjs";

/**
 * @returns {string}
 */
function resolveCommitMessageText() {
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(argPath)) {
    return parseCommitMessageFileForChangelog(argPath);
  }
  const editMsg = path.join(REPO_ROOT, ".git", "COMMIT_EDITMSG");
  if (fs.existsSync(editMsg)) {
    return parseCommitMessageForChangelog(fs.readFileSync(editMsg, "utf8"));
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
  if (parseSummarized(meta.summarized)) {
    return;
  }
  const cleaned = stripChangelogComments(body);
  const { user, auto } = splitChangelogBody(cleaned);
  const hasUser = isUserWrittenChangelogBody(changelogDir, cleaned);

  const nextAuto = appendAutoChangelogLine(auto, summary);
  if (nextAuto === auto) {
    return;
  }

  const nextBody = joinChangelogBody(user, nextAuto);
  const date = changelogTodayDate();
  const next = serializeChangelogMarkdown(
    {
      ...meta,
      date,
      show: hasUser ? meta.show : "false",
    },
    nextBody,
  );
  fs.writeFileSync(latestPath, next, "utf8");

  const rel = path.relative(REPO_ROOT, latestPath).replace(/\\/g, "/");
  gitAdd(rel);

  const mode = hasUser ? "手写区保留，已追加自动区" : "仅存档（show: false）";
  console.log(
    `[changelog] ${mode}：${path.basename(latestPath)}`,
  );
}

main();
