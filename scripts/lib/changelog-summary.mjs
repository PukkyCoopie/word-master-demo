const VERSION_ONLY = new Set([
  "src/appVersion.json",
  "package.json",
  "package-lock.json",
]);

/**
 * 是否仅为版本号 / changelog 维护（避免 post-commit amend 循环）。
 * @param {string[]} files
 */
export function isReleasePrepOnlyStaged(files) {
  if (files.length === 0) return true;
  return files.every((f) => {
    const n = f.replace(/\\/g, "/");
    if (VERSION_ONLY.has(n)) return true;
    if (/^changelog\/\d+_\d+_\d+\.md$/.test(n)) return true;
    return false;
  });
}

/** @deprecated 使用 isReleasePrepOnlyStaged */
export function isVersionOnlyStaged(files) {
  return isReleasePrepOnlyStaged(files);
}
