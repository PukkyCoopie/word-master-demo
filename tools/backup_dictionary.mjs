import fs from "node:fs";
import path from "node:path";

const PROJECT = new URL("../", import.meta.url);
const DICT_DIR = new URL("data/dictionary/", PROJECT);

/** @param {string} stamp 例如 2026-06-15T120000 */
export function backupDictionary(stamp = defaultStamp()) {
  const backupRoot = new URL(`data/dictionary/backup/${stamp}/`, PROJECT);
  fs.mkdirSync(backupRoot, { recursive: true });
  const files = ["dict.json", "word_filtered.csv", "word.csv", "ecdict.csv", "supplement_words.csv"];
  const copied = [];
  for (const name of files) {
    const src = new URL(name, DICT_DIR);
    if (!fs.existsSync(src)) continue;
    const dest = new URL(name, backupRoot);
    fs.copyFileSync(src, dest);
    copied.push(name);
  }
  return { backupDir: filePathFromUrl(backupRoot), copied };
}

function defaultStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function filePathFromUrl(url) {
  return path.normalize(decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, "$1"));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("backup_dictionary.mjs")) {
  const result = backupDictionary();
  console.log(`Backed up to ${result.backupDir}: ${result.copied.join(", ")}`);
}
