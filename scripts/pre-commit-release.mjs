#!/usr/bin/env node
/**
 * Git pre-commit：patch +1、占位更新日志；commit-msg 用提交说明写入正文。
 *
 * 跳过：SKIP_VERSION_BUMP=1 git commit …
 */
import { execSync } from "node:child_process";
import {
  REPO_ROOT,
  bumpSemver,
  clearBumpPending,
  formatVersionString,
  readAppVersionFile,
  readBumpPending,
  syncPackageJsonVersion,
  todayIsoDate,
  writeAppVersionFile,
} from "./lib/app-version-files.mjs";
import { CHANGELOG_FROM_COMMIT_MSG } from "./lib/changelog-from-commit.mjs";
import { isVersionOnlyStaged } from "./lib/changelog-summary.mjs";

function listStagedFiles() {
  return execSync("git diff --cached --name-only", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function gitAdd(paths) {
  execSync(`git add ${paths.map((p) => JSON.stringify(p)).join(" ")}`, {
    stdio: "inherit",
  });
}

function main() {
  if (process.env.SKIP_VERSION_BUMP === "1") {
    console.log("[version] SKIP_VERSION_BUMP=1，跳过版本与更新日志。");
    return;
  }

  const staged = listStagedFiles();
  if (isVersionOnlyStaged(staged) && !readBumpPending()) {
    console.log("[version] 仅版本文件变更，跳过自动 bump。");
    return;
  }

  const pending = readBumpPending();
  const level = pending || "patch";

  const current = readAppVersionFile();
  const nextNums = bumpSemver(current, level);
  const versionString = formatVersionString(nextNums);

  const entry = {
    version: versionString,
    date: todayIsoDate(),
    summary: CHANGELOG_FROM_COMMIT_MSG,
  };

  const changelog = [entry, ...current.changelog.filter((e) => e.version !== versionString)];

  writeAppVersionFile({
    major: nextNums.major,
    minor: nextNums.minor,
    patch: nextNums.patch,
    changelog,
  });
  syncPackageJsonVersion(versionString);
  clearBumpPending();

  gitAdd(["src/appVersion.json", "package.json"]);

  console.log(`[version] → v${versionString}（${level}）`);
  console.log("[changelog] 将使用本次 git 提交说明（标题或正文）。");
}

main();
