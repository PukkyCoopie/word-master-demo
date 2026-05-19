const VERSION_ONLY = new Set(["src/appVersion.json", "package.json", "package-lock.json"]);

/**
 * @param {string[]} files
 */
export function isVersionOnlyStaged(files) {
  if (files.length === 0) return true;
  return files.every((f) => VERSION_ONLY.has(f.replace(/\\/g, "/")));
}
