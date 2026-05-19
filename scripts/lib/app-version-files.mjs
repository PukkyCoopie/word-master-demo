import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../..");
export const APP_VERSION_PATH = path.join(REPO_ROOT, "src", "appVersion.json");
export const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
export const BUMP_PENDING_PATH = path.join(REPO_ROOT, ".version-bump-pending");

/** @typedef {{ major: number, minor: number, patch: number, changelog: { version: string, date?: string, summary: string }[] }} AppVersionFile */

export function readAppVersionFile() {
  const raw = fs.readFileSync(APP_VERSION_PATH, "utf8");
  return /** @type {AppVersionFile} */ (JSON.parse(raw));
}

export function writeAppVersionFile(data) {
  fs.writeFileSync(APP_VERSION_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function formatVersionString(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function formatVersionLabel(v) {
  return `v${formatVersionString(v)}`;
}

/**
 * @param {AppVersionFile} v
 * @param {"patch"|"minor"|"major"} level
 */
export function bumpSemver(v, level) {
  const next = { ...v, major: v.major, minor: v.minor, patch: v.patch };
  if (level === "major") {
    next.major += 1;
    next.minor = 0;
    next.patch = 0;
  } else if (level === "minor") {
    next.minor += 1;
    next.patch = 0;
  } else {
    next.patch += 1;
  }
  return next;
}

export function syncPackageJsonVersion(versionString) {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
  pkg.version = versionString;
  fs.writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

export function readBumpPending() {
  if (!fs.existsSync(BUMP_PENDING_PATH)) return null;
  const level = fs.readFileSync(BUMP_PENDING_PATH, "utf8").trim();
  if (level === "patch" || level === "minor" || level === "major") return level;
  return null;
}

export function writeBumpPending(level) {
  fs.writeFileSync(BUMP_PENDING_PATH, `${level}\n`, "utf8");
}

export function clearBumpPending() {
  if (fs.existsSync(BUMP_PENDING_PATH)) fs.unlinkSync(BUMP_PENDING_PATH);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
