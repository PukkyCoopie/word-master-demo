#!/usr/bin/env node
/**
 * Git post-commit：若 commit-msg 未替换占位符，用刚完成的提交说明修补并 amend。
 */
import { execSync } from "node:child_process";
import {
  APP_VERSION_PATH,
  REPO_ROOT,
  readAppVersionFile,
  writeAppVersionFile,
} from "./lib/app-version-files.mjs";
import {
  CHANGELOG_FROM_COMMIT_MSG,
  parseCommitMessageText,
} from "./lib/changelog-from-commit.mjs";

if (process.env.SKIP_VERSION_BUMP === "1" || process.env.CI === "true") {
  process.exit(0);
}

const data = readAppVersionFile();
const latest = data.changelog[0];
if (!latest || latest.summary !== CHANGELOG_FROM_COMMIT_MSG) {
  process.exit(0);
}

const raw = execSync("git log -1 --format=%B", {
  cwd: REPO_ROOT,
  encoding: "utf8",
});
const summary = parseCommitMessageText(raw);
latest.summary = summary;
writeAppVersionFile(data);

execSync(`git add ${JSON.stringify(APP_VERSION_PATH)}`, {
  cwd: REPO_ROOT,
  stdio: "inherit",
});
execSync("git commit --amend --no-edit --no-verify", {
  cwd: REPO_ROOT,
  stdio: "inherit",
});

console.log(`[changelog] post-commit 已修补 v${latest.version}：${summary.replace(/\n/g, " ")}`);
