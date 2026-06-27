/**
 * 冒烟：主菜单 → 开始游戏，收集 console 报错。
 * 用法：npx playwright install chromium && node scripts/smoke-game-start.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:5174/";
const errors = [];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();

page.on("pageerror", (err) => {
  errors.push(`pageerror: ${err.message}${err.stack ? `\n${err.stack.split("\n").slice(0, 5).join("\n")}` : ""}`);
});
page.on("console", (msg) => {
  if (msg.type() === "error") {
    errors.push(`console: ${msg.text()}`);
  }
});

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.waitForTimeout(2000);

  const startBtn = page.locator("button, [role='button']").filter({ hasText: /开始|新游戏|Start/i }).first();
  const startVisible = await startBtn.isVisible().catch(() => false);
  if (startVisible) {
    await startBtn.click();
    await page.waitForTimeout(1500);
    const confirmBtn = page.locator("button, [role='button']").filter({ hasText: /开始|确认|确定|Start/i }).last();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    } else {
      await page.waitForTimeout(2500);
    }
  }

  await page.waitForTimeout(5000);

  const settingsBtn = page.locator('[aria-label="选项"]');
  const settingsEnabled = await settingsBtn.isEnabled().catch(() => false);
  if (settingsEnabled) {
    await settingsBtn.click();
    await page.waitForTimeout(800);
    const pauseVisible = await page.locator(".pause-options-layer, .pause-options-title").count();
    if (pauseVisible > 0) {
      await page.locator(".pause-options-btn").filter({ hasText: /继续/i }).first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
  }

  const letterCell = page.locator(".letter-grid-cell [role='button'], .letter-grid-cell .letter-tile").first();
  if (await letterCell.isVisible().catch(() => false)) {
    await letterCell.click();
    await page.waitForTimeout(500);
  }

  const hasGrid = await page.locator(".letter-grid, .game-surface").count();
  const refErrors = errors.filter((e) => /ReferenceError|before initialization/i.test(e));
  const propWarnings = errors.filter((e) => /Invalid prop|type check failed/i.test(e));
  const ok = refErrors.length === 0 && propWarnings.length === 0 && hasGrid > 0;
  console.log(
    JSON.stringify(
      {
        ok,
        hasGrid,
        settingsEnabled,
        refErrorCount: refErrors.length,
        propWarningCount: propWarnings.length,
        otherErrorCount: errors.length - refErrors.length - propWarnings.length,
        propWarnings,
        errors: errors.slice(0, 10),
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error(JSON.stringify({ ok: false, fatal: String(e), errors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
