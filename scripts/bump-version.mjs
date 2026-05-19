#!/usr/bin/env node
/**
 * 手动调整中/大版本（小版本由 pre-commit 自动 +1）。
 *
 * 用法：
 *   node scripts/bump-version.mjs minor
 *   node scripts/bump-version.mjs major
 *
 * 会在下次 git commit 时应用对应级别并写入更新日志；也可立即写入版本文件：
 *   node scripts/bump-version.mjs minor --now
 */
import {
  bumpSemver,
  clearBumpPending,
  formatVersionString,
  readAppVersionFile,
  syncPackageJsonVersion,
  writeAppVersionFile,
  writeBumpPending,
} from "./lib/app-version-files.mjs";

const level = process.argv[2];
const applyNow = process.argv.includes("--now");

if (level !== "minor" && level !== "major") {
  console.error("请指定 minor 或 major，例如：node scripts/bump-version.mjs minor");
  process.exit(1);
}

if (applyNow) {
  const current = readAppVersionFile();
  const next = bumpSemver(current, level);
  const versionString = formatVersionString(next);
  writeAppVersionFile({ ...next, changelog: current.changelog });
  syncPackageJsonVersion(versionString);
  clearBumpPending();
  console.log(`已写入版本 ${versionString}（未追加更新日志，下次 commit 仍会 patch +1）。`);
} else {
  writeBumpPending(level);
  console.log(
    `已标记下次 commit 使用 ${level} 版本升级。请完成改动后执行 git commit；小版本号将归零。`,
  );
}
