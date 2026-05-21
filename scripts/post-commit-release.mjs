#!/usr/bin/env node
/**
 * Git post-commit：根据 changelog 已有文件的最大版本，创建「下一版」.md，
 * 并将 appVersion.json / package.json 同步到该新文件对应的版本号。
 *
 * 跳过：SKIP_VERSION_BUMP=1、CI=true、或本次仅提交了版本/changelog 维护文件。
 */
import { execSync } from "node:child_process";
import path from "node:path";
import {
  REPO_ROOT,
  bumpSemver,
  clearBumpPending,
  formatVersionString,
  readBumpPending,
  syncPackageJsonVersion,
  writeAppVersionFile,
} from "./lib/app-version-files.mjs";
import {
  CHANGELOG_DIR_NAME,
  ensureChangelogFileFromTemplate,
  getMaxVersionSemverInChangelogDir,
} from "./lib/changelog-dir.mjs";
import { isReleasePrepOnlyStaged } from "./lib/changelog-summary.mjs";

function listStagedFilesInHead() {
  return execSync("git diff-tree --no-commit-id --name-only -r HEAD", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function gitAdd(paths) {
  execSync(`git add ${paths.map((p) => JSON.stringify(p)).join(" ")}`, {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

function main() {
  if (process.env.SKIP_VERSION_BUMP === "1" || process.env.CI === "true") {
    return;
  }

  const headFiles = listStagedFilesInHead();
  if (isReleasePrepOnlyStaged(headFiles)) {
    console.log("[version] 仅版本/changelog 维护文件，跳过自动准备下一版。");
    return;
  }

  const changelogDir = path.join(REPO_ROOT, CHANGELOG_DIR_NAME);
  const max = getMaxVersionSemverInChangelogDir(changelogDir);
  const level = readBumpPending() || "patch";
  const next = bumpSemver(max, level);
  const versionString = formatVersionString(next);

  const created = ensureChangelogFileFromTemplate(
    changelogDir,
    next,
    new Date().toISOString().slice(0, 10),
  );

  writeAppVersionFile(next);
  syncPackageJsonVersion(versionString);
  clearBumpPending();

  const toAdd = ["src/appVersion.json", "package.json"];
  if (created) {
    toAdd.push(path.join(CHANGELOG_DIR_NAME, `${next.major}_${next.minor}_${next.patch}.md`));
  }

  gitAdd(toAdd);
  // amend 会再次触发 post-commit；须跳过，否则会连环升版（9 → 10 → … → 202）
  execSync("git commit --amend --no-edit --no-verify", {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, SKIP_VERSION_BUMP: "1" },
  });

  console.log(
    `[version] → v${versionString}（changelog 最大 v${formatVersionString(max)} + ${level}）`,
  );
  if (created) {
    console.log(`[changelog] 已创建 ${next.major}_${next.minor}_${next.patch}.md，请填写后随下次功能提交。`);
  } else {
    console.log(`[changelog] 已存在 ${next.major}_${next.minor}_${next.patch}.md，仅同步版本号。`);
  }
}

main();
