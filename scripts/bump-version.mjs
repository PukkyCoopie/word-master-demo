#!/usr/bin/env node
/**
 * 手动调整中/大版本（小版本由 post-commit 按 changelog 最大版本 + patch 处理）。
 *
 * 用法：
 *   node scripts/bump-version.mjs minor
 *   node scripts/bump-version.mjs major
 *
 * 会在下次 git commit 的 post-commit 阶段应用对应级别；也可立即写入：
 *   node scripts/bump-version.mjs minor --now
 */
import path from "node:path";
import {
  REPO_ROOT,
  bumpSemver,
  clearBumpPending,
  formatVersionString,
  syncPackageJsonVersion,
  writeAppVersionFile,
  writeBumpPending,
} from "./lib/app-version-files.mjs";
import {
  CHANGELOG_DIR_NAME,
  ensureChangelogFileFromTemplate,
  getMaxVersionSemverInChangelogDir,
} from "./lib/changelog-dir.mjs";

const level = process.argv[2];
const applyNow = process.argv.includes("--now");

if (level !== "minor" && level !== "major") {
  console.error("请指定 minor 或 major，例如：node scripts/bump-version.mjs minor");
  process.exit(1);
}

if (applyNow) {
  const changelogDir = path.join(REPO_ROOT, CHANGELOG_DIR_NAME);
  const max = getMaxVersionSemverInChangelogDir(changelogDir);
  const target = bumpSemver(max, level);
  ensureChangelogFileFromTemplate(changelogDir, target);
  writeAppVersionFile(target);
  syncPackageJsonVersion(formatVersionString(target));
  clearBumpPending();
  console.log(`已写入版本 ${formatVersionString(target)} 并准备 changelog 文件。`);
} else {
  writeBumpPending(level);
  console.log(
    `已标记下次 commit 使用 ${level} 版本升级；post-commit 将按 changelog 最大版本 + ${level} 创建新 .md。`,
  );
}
