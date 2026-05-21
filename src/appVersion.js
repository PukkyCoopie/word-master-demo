import versionData from "./appVersion.json";
import changelogBundle from "virtual:app-changelog";

/** @typedef {{ version: string, date?: string, summary: string }} AppChangelogEntry */

/**
 * @param {{ major: number, minor: number, patch: number }} v
 */
export function formatAppVersion(v = versionData) {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

/** @type {AppChangelogEntry[]} 仅 show: true 的条目，新版本在前 */
export const APP_CHANGELOG = changelogBundle.entries;

/** 展示版本：changelog 文件名中的最大版本（与 show 无关） */
export const APP_VERSION = changelogBundle.maxVersion
  ? `v${changelogBundle.maxVersion}`
  : formatAppVersion(versionData);
