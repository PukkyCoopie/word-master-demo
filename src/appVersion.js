import versionData from "./appVersion.json";

/** @typedef {{ version: string, date?: string, summary: string }} AppChangelogEntry */

/**
 * @param {{ major: number, minor: number, patch: number }} v
 */
export function formatAppVersion(v = versionData) {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

export const APP_VERSION = formatAppVersion();
export const GITHUB_REPO_URL = "https://github.com/pukkycoopie/word-master-demo";

const CHANGELOG_PLACEHOLDER = "__FROM_COMMIT_MSG__";

/** @type {AppChangelogEntry[]} 新版本在前 */
export const APP_CHANGELOG = [...versionData.changelog]
  .map((entry) =>
    entry.summary === CHANGELOG_PLACEHOLDER
      ? { ...entry, summary: "维护与修复。" }
      : entry,
  )
  .sort((a, b) => {
    const pa = a.version.split(".").map((n) => Number(n) || 0);
    const pb = b.version.split(".").map((n) => Number(n) || 0);
    for (let i = 0; i < 3; i++) {
      if (pb[i] !== pa[i]) return pb[i] - pa[i];
    }
    return 0;
  });
