#!/usr/bin/env node
/**
 * Git commit-msg：若当次版本日志为占位符，用本次提交说明写入。
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import {
  APP_VERSION_PATH,
  REPO_ROOT,
  readAppVersionFile,
  writeAppVersionFile,
} from "./lib/app-version-files.mjs";
import {
  CHANGELOG_FROM_COMMIT_MSG,
  parseCommitMessageFile,
} from "./lib/changelog-from-commit.mjs";

const commitMsgPath = process.argv[2];
if (!commitMsgPath || !fs.existsSync(commitMsgPath)) {
  process.exit(0);
}

const data = readAppVersionFile();
const latest = data.changelog[0];
if (!latest || latest.summary !== CHANGELOG_FROM_COMMIT_MSG) {
  process.exit(0);
}

const summary = parseCommitMessageFile(commitMsgPath);
latest.summary = summary;
writeAppVersionFile(data);

execSync(`git add ${JSON.stringify(APP_VERSION_PATH)}`, {
  cwd: REPO_ROOT,
  stdio: "inherit",
});

console.log(`[changelog] 已写入 v${latest.version}：${summary.replace(/\n/g, " ")}`);
