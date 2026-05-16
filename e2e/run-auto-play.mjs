/**
 * Playwright 有头自动游玩 + 内容冒烟。
 *
 * 请先在本机启动: npm run dev
 * 然后: npm run e2e:play
 *
 * 环境变量:
 *   E2E_URL=http://127.0.0.1:5173/?e2e=1
 *   E2E_HEADLESS=0   (默认有窗口，方便一起看)
 *   E2E_SLOW_MO=120  (每步延迟 ms，默认 120)
 *   E2E_MAX_TURNS=120  (商店会多停留购买，回合数可适当加大)
 *   E2E_SEED=e2e42
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.E2E_URL ?? "http://127.0.0.1:5173/?e2e=1";
const HEADLESS = process.env.E2E_HEADLESS === "1";
const SLOW_MO = Number(process.env.E2E_SLOW_MO ?? 120);
const MAX_TURNS = Number(process.env.E2E_MAX_TURNS ?? 120);
const SEED = process.env.E2E_SEED ?? "e2e42";
const TURN_DELAY_MS = Number(process.env.E2E_TURN_DELAY_MS ?? 400);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHarness(page, name, timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ready = await page.evaluate((n) => !!globalThis[n], name);
    if (ready) return;
    await sleep(200);
  }
  throw new Error(`等待 ${name} 超时`);
}

async function main() {
  console.log("\n=== Word Master E2E 自动游玩 ===");
  console.log(`URL: ${BASE_URL}`);
  console.log(`有头模式: ${!HEADLESS}  slowMo: ${SLOW_MO}ms  最多 ${MAX_TURNS} 回合\n`);

  /** 优先用本机 Chrome，避免下载 Playwright Chromium（网络慢时常失败） */
  const launchOpts = {
    headless: HEADLESS,
    slowMo: SLOW_MO,
    args: ["--window-size=1280,900"],
  };
  if (process.env.E2E_CHANNEL !== "bundled") {
    launchOpts.channel = process.env.E2E_CHANNEL ?? "chrome";
  }
  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (e) {
    console.warn("本机 Chrome 启动失败，尝试 Playwright 自带 Chromium…", e.message);
    delete launchOpts.channel;
    browser = await chromium.launch(launchOpts);
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "zh-CN",
  });
  const page = await context.newPage();

  /** @type {string[]} */
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (e) {
    console.error(
      "\n无法打开游戏页面。请先运行: npm run dev\n",
      e.message,
    );
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await waitForHarness(page, "__WM_APP_E2E__");
  await page.evaluate(
    async ({ seed }) => {
      await globalThis.__WM_APP_E2E__.waitForDictionary();
      await globalThis.__WM_APP_E2E__.startGame({ seed });
    },
    { seed: SEED },
  );

  await waitForHarness(page, "__WM_E2E__");
  await page.evaluate(() => globalThis.__WM_E2E__.waitForIdle(180_000));

  /** @type {object[]} */
  const turnLog = [];
  let stuckCount = 0;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const result = await page.evaluate(async () => {
      const r = await globalThis.__WM_E2E__.runTurn();
      const s = globalThis.__WM_E2E__.getState();
      return { r, s };
    });
    turnLog.push({ turn, ...result.r, state: result.s });
    const { s } = result;
    console.log(
      `[${String(turn).padStart(3, "0")}] ${result.r.phase}` +
        (result.r.word ? ` «${result.r.word}»` : "") +
        ` | ${s.levelId} ${s.currentScore}/${s.targetScore} 出牌${s.remainingWords} $${s.money}`,
    );

    if (result.r.phase === "stuck" || (result.r.ok === false && result.r.phase === "play")) {
      stuckCount += 1;
      if (stuckCount >= 3) {
        console.warn("\n连续卡住，停止自动游玩。");
        break;
      }
    } else {
      stuckCount = 0;
    }

    if (s.levelIndex >= 7 && s.levelId?.startsWith("8-")) {
      console.log("\n已推进到第 8 章，冒烟结束。");
      break;
    }

    await sleep(TURN_DELAY_MS);
  }

  const final = await page.evaluate(() => ({
    state: globalThis.__WM_E2E__.getState(),
    logs: globalThis.__WM_E2E__.logs().slice(-30),
    issues: globalThis.__WM_E2E__.issues(),
  }));

  const report = {
    at: new Date().toISOString(),
    url: BASE_URL,
    seed: SEED,
    turns: turnLog.length,
    finalState: final.state,
    stuckTurns: turnLog.filter((t) => t.phase === "stuck" || t.ok === false),
    consoleErrors: [...new Set(consoleErrors)].slice(0, 50),
    issues: final.issues,
    recentLogs: final.logs,
  };

  const outDir = path.join(__dirname, "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "auto-play.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n--- 汇总 ---");
  console.log(`最终关卡: ${final.state.levelId}  分数 ${final.state.currentScore}/${final.state.targetScore}`);
  console.log(`控制台 error: ${report.consoleErrors.length} 条`);
  console.log(`报告: ${reportPath}`);
  console.log(
    HEADLESS
      ? "\n浏览器已关闭。"
      : "\n浏览器保持打开 — 可继续手动试玩；关闭窗口或 Ctrl+C 结束。\n",
  );

  if (!HEADLESS) {
    await new Promise(() => {});
  } else {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
