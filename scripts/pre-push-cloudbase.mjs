#!/usr/bin/env node
/**
 * Git pre-push：向 origin/main 推送时，在后台从本地部署到 CloudBase。
 * push 本身不等待部署完成（避免 GitHub ↔ CloudBase 跨境网络不稳）。
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(REPO_ROOT, "tmp");
const LOG_FILE = path.join(LOG_DIR, "deploy-cloudbase.log");

/** @param {string} line */
function isPushToMain(line) {
  const parts = line.trim().split(/\s+/);
  return parts.length >= 4 && parts[2] === "refs/heads/main";
}

function spawnBackgroundDeploy() {
  mkdirSync(LOG_DIR, { recursive: true });
  const logStream = createWriteStream(LOG_FILE, { flags: "a" });
  logStream.write(`\n--- deploy started ${new Date().toISOString()} ---\n`);

  const child = spawn(process.execPath, ["scripts/deploy-cloudbase.mjs"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);
  child.unref();

  console.log("→ 已在后台启动 CloudBase 部署（push 不等待）。");
  console.log(`  日志：${path.relative(REPO_ROOT, LOG_FILE)}`);
  console.log("  手动部署：npm run deploy:cloudbase");
}

function main() {
  if (process.env.SKIP_CLOUD_BASE_DEPLOY === "1") {
    return;
  }

  if (process.stdin.isTTY) {
    return;
  }

  const chunks = [];
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => {
    const input = chunks.join("");
    if (input.split(/\r?\n/).some(isPushToMain)) {
      spawnBackgroundDeploy();
    }
  });
}

main();
