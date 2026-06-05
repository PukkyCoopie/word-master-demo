/**
 * 在已安装 App 上切换 blit 实验模式并采集 [material-bench] 日志。
 * 用法：node scripts/adb-blit-experiments.mjs
 */
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const ADB = resolveAdb();
const MODES = ["webgl", "2d_source", "readpixels_2d"];

function resolveAdb() {
  const name = process.platform === "win32" ? "adb.exe" : "adb";
  const p = path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", name);
  return p;
}

function adb(...args) {
  const r = spawnSync(ADB, args, { encoding: "utf8" });
  if (r.error) throw r.error;
  return (r.stdout || "") + (r.stderr || "");
}

async function cdpEval(expression) {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("no CDP page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  const id = 7;
  const result = await new Promise((resolve, reject) => {
    const onMsg = (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg.id !== id) return;
      ws.removeEventListener("message", onMsg);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(
      JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true },
      }),
    );
  });
  ws.close();
  return result?.result?.value;
}

function setupForward() {
  const pid = adb("shell", "pidof", "com.timeshift_games.word_master").trim();
  if (!pid) throw new Error("app not running");
  adb("forward", "--remove", "tcp:9222");
  adb("forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`);
  return pid;
}

function clearLogcat() {
  adb("logcat", "-c");
}

function collectBenchLines() {
  const out = adb("logcat", "-d");
  return out
    .split(/\r?\n/)
    .filter((l) => l.includes("[material-bench]"))
    .map((l) => l.replace(/^.*Msg: /, "").trim())
    .slice(-3);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runMode(mode) {
  await cdpEval(`globalThis.__WM_BLIT_EXPERIMENT__ = ${JSON.stringify(mode)}; "ok"`);
  clearLogcat();
  await sleep(6500);
  const lines = collectBenchLines();
  return { mode, lines };
}

async function main() {
  setupForward();
  /** @type {Record<string, string[]>} */
  const report = {};
  for (const mode of MODES) {
    console.error(`\n▶ 实验 ${mode} …`);
    const { lines } = await runMode(mode);
    report[mode] = lines;
    for (const line of lines) console.log(`[${mode}] ${line}`);
  }
  console.error("\n✓ 完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
