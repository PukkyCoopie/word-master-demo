#!/usr/bin/env node
/**
 * 手动准备下一版 changelog（与 post-commit 逻辑一致，不 amend）。
 *
 * 用法：npm run changelog:new
 */
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

if (created) {
  console.log(`已创建 changelog/${next.major}_${next.minor}_${next.patch}.md`);
} else {
  console.log(`changelog/${next.major}_${next.minor}_${next.patch}.md 已存在`);
}
console.log(`版本号已同步为 v${versionString}`);
