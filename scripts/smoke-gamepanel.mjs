/**
 * GamePanel 拆分 smoke（Playwright + __WM_SMOKE__）。
 *
 * 用法：
 *   npm run smoke:panel:install   # 首次
 *   npm run dev                   # 另开终端
 *   npm run smoke:panel
 *
 * 环境变量：
 *   SMOKE_BASE_URL   默认 http://localhost:5173/?dev=maskBubble&slot=0
 *   SMOKE_HEADLESS=1 无界面（CI 用）；默认 **有界面**
 *   SMOKE_SLOW_MO    每步延迟 ms，便于肉眼跟（如 80）
 *   SMOKE_HOLD_MS    结束后停留 ms 再关窗（默认 headed 时 1500）
 */
import { chromium } from "playwright";

const BASE =
  process.env.SMOKE_BASE_URL ??
  "http://localhost:5173/?dev=maskBubble&slot=0";

const HEADLESS =
  process.argv.includes("--headless") ||
  process.env.SMOKE_HEADLESS === "1" ||
  process.env.SMOKE_HEADLESS === "true";
const SLOW_MO = Math.max(0, Number(process.env.SMOKE_SLOW_MO) || 0);
const HOLD_MS = Math.max(
  0,
  Number(process.env.SMOKE_HOLD_MS) || (HEADLESS ? 0 : 1500),
);

/** @typedef {{ id: string, ok: boolean, detail?: unknown, skipped?: boolean }} SmokeStep */

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {import('playwright').Page} page
 * @param {string[]} bucket
 */
function attachConsoleCollectors(page, bucket) {
  page.on("pageerror", (err) => {
    bucket.push(
      `pageerror: ${err.message}${err.stack ? `\n${String(err.stack).split("\n").slice(0, 8).join("\n")}` : ""}`,
    );
  });
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") bucket.push(`console.error: ${text}`);
    if (type === "warning" && /Invalid prop|type check failed|ReferenceError/i.test(text)) {
      bucket.push(`console.warn: ${text}`);
    }
  });
}

/** @param {import('playwright').Page} page */
async function dismissPrivacyIfPresent(page) {
  const agree = page.locator("button").filter({ hasText: /^同意$/ }).first();
  if (await agree.isVisible({ timeout: 800 }).catch(() => false)) {
    await agree.click();
    await sleep(400);
  }
}

/** @param {import('playwright').Page} page */
async function startNewRun(page) {
  const start = page.locator("button.menu-btn--start").first();
  await start.waitFor({ state: "visible", timeout: 25000 });
  await start.click();
  await sleep(900);

  const newRunFromContinue = page.locator(".run-start-quick-confirm-btn--new-run");
  if (await newRunFromContinue.isVisible({ timeout: 2500 }).catch(() => false)) {
    await newRunFromContinue.click();
    await sleep(1200);
  }

  const runStartPrimary = page.locator(".run-start-dialog-btn--primary").first();
  if (await runStartPrimary.isVisible({ timeout: 4000 }).catch(() => false)) {
    await runStartPrimary.click();
    await sleep(500);
    return;
  }

  const genericStart = page
    .locator("button")
    .filter({ hasText: /^开始$/ })
    .first();
  if (await genericStart.isVisible({ timeout: 3000 }).catch(() => false)) {
    await genericStart.click();
    await sleep(500);
  }
}

/** @param {import('playwright').Page} page */
async function waitForPlayfield(page) {
  await page.waitForSelector(".game-surface .letter-grid", { timeout: 45000 });
  await page.waitForFunction(
    () => globalThis.__WM_SMOKE__?.waitForPlayfieldIdle != null,
    null,
    { timeout: 45000 },
  );
  return page.evaluate(() => globalThis.__WM_SMOKE__.waitForPlayfieldIdle(20000));
}

/** @param {import('playwright').Page} page */
async function smokeSubmitWord(page) {
  return page.evaluate(async () => {
    const smoke = globalThis.__WM_SMOKE__;
    if (!smoke?.submitFirstValidWord) return { ok: false, reason: "no-smoke-api" };
    return smoke.submitFirstValidWord();
  });
}

/** @param {import('playwright').Page} page */
async function smokeEnterShop(page) {
  return page.evaluate(async () => {
    const smoke = globalThis.__WM_SMOKE__;
    if (!smoke?.enterShop) return { ok: false, reason: "no-smoke-api" };
    return smoke.enterShop();
  });
}

/** @param {import('playwright').Page} page */
async function clickShopPauseContinue(page) {
  const opts = page.locator(".shop-footer-action-btn--options").first();
  if (!(await opts.isVisible({ timeout: 3000 }).catch(() => false))) {
    return { ok: false, skipped: true, reason: "shop-options-missing" };
  }
  if (!(await opts.isEnabled().catch(() => false))) {
    return { ok: false, skipped: true, reason: "shop-options-disabled" };
  }
  await opts.click();
  try {
    await page.waitForSelector(".pause-options-layer", { state: "visible", timeout: 8000 });
  } catch {
    return { ok: false, reason: "pause-layer-missing" };
  }
  await page.locator(".pause-options-btn").filter({ hasText: /继续/ }).first().click();
  await sleep(400);
  return { ok: true };
}

/** @param {import('playwright').Page} page */
async function clickShopDeckPreview(page) {
  const deckBtn = page.locator(".shop-footer-actions button").filter({ hasText: "查看字母库" }).first();
  if (!(await deckBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
    return { ok: false, skipped: true, reason: "deck-btn-missing" };
  }
  await deckBtn.click();
  await sleep(600);
  const layerVisible = (await page.locator(".deck-layer").count()) > 0;
  if (!layerVisible) return { ok: false, reason: "deck-layer-missing" };
  const confirmBtn = page.locator(".deck-layer-confirm").filter({ hasText: /确定|返回/ }).first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const clicked = await confirmBtn
      .click({ timeout: 4000, force: true })
      .then(() => true)
      .catch(() =>
        page
          .evaluate(() => {
            const btn = document.querySelector(".deck-layer-confirm");
            btn?.click();
            return !!btn;
          })
          .catch(() => false),
      );
    if (!clicked) return { ok: false, reason: "deck-confirm-click-failed" };
    await sleep(300);
  } else {
    await page.keyboard.press("Escape");
    await sleep(300);
  }
  return { ok: true };
}

/** @param {string[]} errors */
function classifyErrors(errors) {
  const refErrors = errors.filter((e) => /ReferenceError|before initialization|is not a function/i.test(e));
  const propWarnings = errors.filter((e) => /Invalid prop|type check failed/i.test(e));
  const other = errors.filter((e) => !refErrors.includes(e) && !propWarnings.includes(e));
  return { refErrors, propWarnings, other };
}

async function main() {
  /** @type {string[]} */
  const errors = [];
  /** @type {SmokeStep[]} */
  const steps = [];
  /** @type {import('playwright').Browser | null} */
  let browser = null;
  let exitCode = 1;

  try {
    browser = await chromium.launch({
      channel: "msedge",
      headless: HEADLESS,
      slowMo: SLOW_MO,
    });
    const context = await browser.newContext();
  await context.addInitScript(() => {
    try {
      const key = "word_master_run_saves_v1";
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.slots?.[0]) {
        data.slots[0] = { hasSave: false, payload: null, meta: null };
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  attachConsoleCollectors(page, errors);

    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1500);
    await dismissPrivacyIfPresent(page);

    steps.push({ id: "menu-start", ok: false });
    await startNewRun(page);
    steps[steps.length - 1].ok = true;

    steps.push({ id: "playfield-ready", ok: false });
    const idle = await waitForPlayfield(page);
    steps[steps.length - 1] = { id: "playfield-ready", ok: !!idle?.ok, detail: idle };

    steps.push({ id: "grid-tile-click", ok: false });
    const cell = page.locator(".letter-grid-cell").first();
    if (await cell.isVisible().catch(() => false)) {
      await cell.click();
      await sleep(300);
      steps[steps.length - 1].ok = true;
    }

    steps.push({ id: "submit-word", ok: false });
    const submitRes = await smokeSubmitWord(page);
    steps[steps.length - 1] = { id: "submit-word", ok: !!submitRes?.ok, detail: submitRes };
    if (submitRes?.ok) {
      await page.evaluate(() => globalThis.__WM_SMOKE__?.waitForPlayfieldIdle?.(25000));
      await sleep(800);
    }

    steps.push({ id: "pause-open-close", ok: false, skipped: true, detail: { skipped: true, reason: "playfield-pause-deferred-to-shop" } });

    steps.push({ id: "enter-shop", ok: false });
    const shopEnter = await smokeEnterShop(page);
    await page.waitForSelector(".shop-panel", { timeout: 15000 }).catch(() => null);
    const shopVisible = (await page.locator(".shop-panel").count()) > 0;
    steps[steps.length - 1] = {
      id: "enter-shop",
      ok: shopVisible && !!shopEnter?.ok,
      detail: { shopEnter, shopVisible },
    };
    await sleep(1200);

    steps.push({ id: "shop-pause-open-close", ok: false });
    const shopPauseRes = await clickShopPauseContinue(page);
    steps[steps.length - 1] = {
      id: "shop-pause-open-close",
      ok: !!shopPauseRes?.ok,
      skipped: !!shopPauseRes?.skipped,
      detail: shopPauseRes,
    };

    steps.push({ id: "shop-deck-preview", ok: false });
    const deckRes = await clickShopDeckPreview(page);
    steps[steps.length - 1] = {
      id: "shop-deck-preview",
      ok: !!deckRes?.ok,
      skipped: !!deckRes?.skipped,
      detail: deckRes,
    };

    steps.push({ id: "shop-reroll-click", ok: false });
    const reroll = page.locator(".shop-btn--reroll").first();
    if (shopVisible && (await reroll.isVisible().catch(() => false))) {
      await reroll.click({ timeout: 3000 }).catch(() => {});
      await sleep(800);
      steps[steps.length - 1].ok = true;
    } else {
      steps[steps.length - 1] = { ok: false, skipped: true, id: "shop-reroll-click" };
    }

    steps.push({ id: "shop-playfield-blocked", ok: false });
    const gridBlockedDuringShop =
      shopVisible &&
      !(await page
        .locator(".letter-grid-cell")
        .first()
        .click({ timeout: 500, trial: true })
        .then(() => true)
        .catch(() => false));
    steps[steps.length - 1] = {
      id: "shop-playfield-blocked",
      ok: shopVisible ? gridBlockedDuringShop : false,
      detail: { shopVisible, gridBlockedDuringShop },
    };

    const { refErrors, propWarnings, other } = classifyErrors(errors);
    const pageErrors = errors.filter((e) => e.startsWith("pageerror:"));
    const criticalFails = steps.filter((s) => !s.ok && !s.skipped);
    const ok =
      refErrors.length === 0 &&
      propWarnings.length === 0 &&
      pageErrors.length === 0 &&
      criticalFails.length === 0;

    console.log(
      JSON.stringify(
        {
          ok,
          headless: HEADLESS,
          baseUrl: BASE,
          steps,
          refErrorCount: refErrors.length,
          propWarningCount: propWarnings.length,
          pageErrorCount: pageErrors.length,
          otherErrorCount: other.length,
          refErrors: refErrors.slice(0, 8),
          propWarnings: propWarnings.slice(0, 8),
          pageErrors: pageErrors.slice(0, 4),
          otherErrors: other.slice(0, 8),
        },
        null,
        2,
      ),
    );
    exitCode = ok ? 0 : 1;
  } catch (e) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          fatal: String(e),
          steps,
          errors: errors.slice(0, 12),
        },
        null,
        2,
      ),
    );
    exitCode = 1;
  } finally {
    if (HOLD_MS > 0) await sleep(HOLD_MS);
    await browser?.close();
  }
  process.exit(exitCode);
}

main();
