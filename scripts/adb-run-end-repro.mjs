#!/usr/bin/env node
/**
 * 真机 adb + Chrome DevTools：复现「1-1 带材质提交 → 整局胜利」白屏。
 * 默认轻量模式：失败才截图、轮间冷却、跳过 confetti/云同步（见 whiteScreenReproDebug.js）。
 *
 * 用法：
 *   npm run adb:run-end-repro
 *   npm run adb:run-end-repro -- --deploy --iterations 5
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const APP_ID = "com.timeshift_games.word_master";
const CDP_PORT = Number(process.env.REPRO_CDP_PORT ?? 9222);
const argv = process.argv.slice(2);
const iterFlagIdx = argv.indexOf("--iterations");
const ITERATIONS = Number(
  process.env.REPRO_ITERATIONS ?? (iterFlagIdx >= 0 ? argv[iterFlagIdx + 1] : 5),
);
const SHOULD_DEPLOY = argv.includes("--deploy");
const SEED_PREFIX = process.env.REPRO_SEED_PREFIX ?? "repro";
const REPORT_DIR = path.join(REPO_ROOT, "e2e", "reports", "adb-run-end-repro");

/** 轮间冷却，让手机 UI/动画喘口气 */
const COOLDOWN_BETWEEN_ROUNDS_MS = Number(process.env.REPRO_COOLDOWN_MS ?? 4000);
/** 提交后额外等待（计分/整局结束层入场） */
const POST_SUBMIT_SETTLE_MS = Number(process.env.REPRO_POST_SUBMIT_MS ?? 2500);
/** waitForGlobal 轮询间隔 */
const POLL_MS = 800;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveAdb() {
  if (process.env.ADB_PATH) return process.env.ADB_PATH;
  const adbName = process.platform === "win32" ? "adb.exe" : "adb";
  const candidates = [
    process.env.ADB,
    process.env.ANDROID_HOME
      ? path.join(process.env.ANDROID_HOME, "platform-tools", adbName)
      : undefined,
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", adbName),
    adbName,
  ];
  for (const c of candidates) {
    if (c && (c === adbName || fs.existsSync(c))) return c;
  }
  return adbName;
}

function runAdb(adb, args, { inherit = false } = {}) {
  const result = spawnSync(adb, args, {
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed (${result.status}): ${result.stderr ?? result.stdout}`);
  }
  return result.stdout ?? "";
}

function deployApkQuick() {
  console.log("\n▶ 快速编译并安装 debug APK（跳过 icons）…");
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  for (const args of [
    ["run", "build"],
    ["exec", "cap", "copy", "android"],
  ]) {
    const r = spawnSync(npmCmd, args, { cwd: REPO_ROOT, stdio: "inherit", shell: process.platform === "win32" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const g = spawnSync(gradlew, ["assembleDebug"], {
    cwd: path.join(REPO_ROOT, "android"),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (g.status !== 0) process.exit(g.status ?? 1);
  const adb = resolveAdb();
  const apk = path.join(REPO_ROOT, "android", "app", "build", "outputs", "apk", "debug", "word_master_debug_1_0_2.apk");
  const apkDir = path.dirname(apk);
  let apkPath = apk;
  if (!fs.existsSync(apkPath)) {
    const apks = fs.readdirSync(apkDir).filter((n) => n.endsWith(".apk"));
    if (!apks.length) throw new Error("未找到 debug APK");
    apkPath = path.join(apkDir, apks[0]);
  }
  runAdb(adb, ["install", "-r", apkPath], { inherit: true });
  runAdb(adb, ["shell", "am", "start", "-n", `${APP_ID}/.MainActivity`], { inherit: true });
}

async function waitForGlobal(page, name, timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ok = await page.evaluate((n) => !!globalThis[n], name);
    if (ok) return;
    await sleep(POLL_MS);
  }
  throw new Error(`等待 globalThis.${name} 超时 (${timeoutMs}ms)`);
}

async function probeUi(page) {
  return page.evaluate(() => {
    const state = globalThis.__WM_E2E__?.getState?.() ?? {};
    const layer = document.querySelector(".run-end-layer");
    const title = document.querySelector(".run-end-title");
    const layerStyle = layer ? getComputedStyle(layer) : null;
    const layerOpacity = layerStyle ? Number.parseFloat(layerStyle.opacity) : null;
    const suspectedWhiteScreen =
      state.showRunEnd === true &&
      (!layer || !title || (Number.isFinite(layerOpacity) && layerOpacity < 0.05));
    return {
      showRunEnd: state.showRunEnd ?? false,
      runEndOutcome: state.runEndOutcome ?? null,
      levelId: state.levelId ?? null,
      currentScore: state.currentScore ?? null,
      targetScore: state.targetScore ?? null,
      layerExists: !!layer,
      layerOpacity,
      titleText: title?.textContent?.trim() ?? null,
      suspectedWhiteScreen,
    };
  });
}

function resolveWebViewDevtoolsSocket(adb) {
  const pidRaw = runAdb(adb, ["shell", "pidof", APP_ID]).trim();
  const pids = pidRaw.split(/\s+/).filter(Boolean).map((p) => Number.parseInt(p, 10)).filter(Number.isFinite);
  if (!pids.length) return null;

  const unix = runAdb(adb, ["shell", "cat", "/proc/net/unix"]);
  /** @type {string[]} */
  const sockets = [];
  for (const line of unix.split(/\r?\n/)) {
    const m = line.match(/@(webview_devtools_remote_\d+)/);
    if (m) sockets.push(m[1]);
  }

  for (const pid of pids) {
    const wanted = `webview_devtools_remote_${pid}`;
    if (sockets.includes(wanted)) return wanted;
  }
  return sockets.find((s) => pids.some((pid) => s.endsWith(`_${pid}`))) ?? null;
}

async function connectToDevice(adb) {
  runAdb(adb, ["shell", "am", "start", "-n", `${APP_ID}/.MainActivity`]);
  await sleep(2500);

  let lastErr = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const socket = resolveWebViewDevtoolsSocket(adb);
      if (!socket) throw new Error("未找到 webview_devtools_remote");
      runAdb(adb, ["forward", `tcp:${CDP_PORT}`, `localabstract:${socket}`]);
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (!res.ok) throw new Error(`CDP ${res.status}`);
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
      const context = browser.contexts()[0] ?? (await browser.newContext());
      const page = context.pages()[0] ?? (await context.newPage());
      console.log(`  CDP 已连接 (${socket})`);
      return { browser, page };
    } catch (e) {
      lastErr = e;
    }
    await sleep(1000);
  }
  throw new Error(`无法连接 WebView CDP: ${lastErr?.message ?? "timeout"}`);
}

async function maybeScreenshot(page, iteration, failed) {
  if (!failed) return null;
  const shotPath = path.join(REPORT_DIR, `fail-iter-${String(iteration).padStart(2, "0")}.jpeg`);
  await page.screenshot({ path: shotPath, type: "jpeg", quality: 72, fullPage: false });
  return shotPath;
}

async function runSingleIteration(page, iteration) {
  const seed = `${SEED_PREFIX}${iteration}`;
  console.log(`\n--- 第 ${iteration}/${ITERATIONS} 轮 seed=${seed} ---`);

  await waitForGlobal(page, "__WM_APP_E2E__");
  await page.evaluate(async ({ s }) => {
    await globalThis.__WM_APP_E2E__.waitForAppBoot();
    await globalThis.__WM_APP_E2E__.startGame({ seed: s, skipIris: true });
  }, { s: seed });

  await waitForGlobal(page, "__WM_E2E__");
  await page.evaluate(() => globalThis.__WM_E2E__.waitForIdle(180_000));
  await sleep(2000);

  /** @type {object | null} */
  let lastPlay = null;
  for (let submitTry = 0; submitTry < 4; submitTry += 1) {
    const snap = await page.evaluate(() => globalThis.__WM_E2E__.getState());
    if (snap.showRunEnd) break;
    if (snap.remainingWords <= 0 && snap.currentScore < snap.targetScore) break;

    lastPlay = await page.evaluate(async () => {
      const r = await globalThis.__WM_E2E__.playBestWord();
      return { ...r, state: globalThis.__WM_E2E__.getState() };
    });
    console.log(
      `  提交#${submitTry + 1}: ${lastPlay.ok ? lastPlay.word : lastPlay.reason} | ${lastPlay.state?.currentScore}/${lastPlay.state?.targetScore}`,
    );
    if (lastPlay.state?.showRunEnd) break;
    if (!lastPlay.ok && (lastPlay.reason === "no_word" || lastPlay.reason === "cannot_submit")) break;
    await page.evaluate(() => globalThis.__WM_E2E__.waitForIdle(180_000));
    await sleep(POST_SUBMIT_SETTLE_MS);
  }

  const playResult = lastPlay ?? { ok: false, reason: "no_submit" };
  await sleep(POST_SUBMIT_SETTLE_MS);
  const after = await probeUi(page);

  const failed =
    after.suspectedWhiteScreen ||
    (after.showRunEnd && !after.layerExists) ||
    (playResult.state?.showRunEnd && !after.layerExists);

  const screenshot = await maybeScreenshot(page, iteration, failed);

  return { iteration, seed, playResult, after, screenshot, failed };
}

async function clickRetryIfRunEnd(page) {
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector(".run-end-btn--primary");
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (clicked) {
    await sleep(1500);
    await page.evaluate(() => globalThis.__WM_E2E__?.waitForIdle?.(180_000));
  }
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const adb = resolveAdb();
  console.log("=== adb 整局胜利白屏复现（轻量） ===");
  console.log(`adb: ${adb}  轮次: ${ITERATIONS}  轮间冷却: ${COOLDOWN_BETWEEN_ROUNDS_MS}ms`);

  runAdb(adb, ["devices"]);
  if (SHOULD_DEPLOY) deployApkQuick();

  const { browser, page } = await connectToDevice(adb);
  /** @type {string[]} */
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  /** @type {object[]} */
  const results = [];
  let failCount = 0;

  for (let i = 1; i <= ITERATIONS; i += 1) {
    try {
      const r = await runSingleIteration(page, i);
      results.push(r);
      if (r.failed) {
        failCount += 1;
        console.log(`  ✗ 疑似白屏 (showRunEnd=${r.after.showRunEnd}, layer=${r.after.layerExists}, title=${r.after.titleText})`);
        if (r.screenshot) console.log(`    截图: ${r.screenshot}`);
      } else if (r.after.showRunEnd && r.after.titleText) {
        console.log(`  ✓ 正常: ${r.after.titleText}`);
      } else {
        console.log(`  ? 未进整局结束 (showRunEnd=${r.after.showRunEnd}, target=${r.after.targetScore})`);
      }
      await clickRetryIfRunEnd(page);
      if (i < ITERATIONS) await sleep(COOLDOWN_BETWEEN_ROUNDS_MS);
    } catch (e) {
      failCount += 1;
      console.error(`  ✗ 第 ${i} 轮异常:`, e.message);
      results.push({ iteration: i, error: String(e.message) });
      await sleep(COOLDOWN_BETWEEN_ROUNDS_MS);
    }
  }

  const reportPath = path.join(REPORT_DIR, "summary.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { at: new Date().toISOString(), iterations: ITERATIONS, failCount, pageErrors, results },
      null,
      2,
    ),
  );

  console.log("\n=== 汇总 ===");
  console.log(`失败/疑似白屏: ${failCount}/${ITERATIONS}`);
  console.log(`报告: ${reportPath}`);

  await browser.close();
  process.exitCode = failCount > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
