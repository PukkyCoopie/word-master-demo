/**
 * 格数缩放：1/2/4/8/10 格 uiFps。先等 hub 就绪，再逐格切换（快 CDP + 复用连接）。
 */
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const ADB = path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe");
const COUNTS = [10, 8, 4, 2, 1];

function adb(...args) {
  const r = spawnSync(ADB, args, { encoding: "utf8" });
  if (r.error) throw r.error;
  return (r.stdout || "") + (r.stderr || "");
}

function setupForward() {
  const appPid = adb("shell", "pidof", "com.timeshift_games.word_master").trim();
  if (!appPid) throw new Error("app not running");
  adb("forward", "--remove", "tcp:9222");
  adb("forward", "tcp:9222", `localabstract:webview_devtools_remote_${appPid}`);
}

const SNAPSHOT_JS = `(() => {
  const bench = document.querySelector(".material-bench");
  if (!bench) return { open: false };
  const stat = (label) => {
    for (const row of bench.querySelectorAll(".material-bench-stat")) {
      const l = row.querySelector(".material-bench-stat-label")?.textContent?.trim();
      if (l === label) return row.querySelector(".material-bench-stat-value")?.textContent?.trim() ?? "";
    }
    return "";
  };
  const hubText = stat("材质 hub Hz");
  const g = globalThis.__WM_MATERIAL_BENCH_STATS__;
  let blitMs = 0, blitPerTick = 0;
  if (g?.materialProfile) {
    blitMs = Number(g.materialProfile.totals?.blitMs) || 0;
    blitPerTick = (g.materialProfile.materials || []).reduce((s, m) => s + (Number(m.avgBlitCount) || 0), 0);
  }
  return {
    open: true,
    domTiles: document.querySelectorAll(".material-bench-tile").length,
    uiFps: Number(stat("界面 FPS（bench RAF）")) || 0,
    hubTickHz: Number((hubText.split("/")[0] || "").trim()) || 0,
    activeHubs: Number(stat("活跃 hub")) || 0,
    blitMs,
    blitPerTick,
    blitExperiment: g?.blitExperiment ?? "webgl",
  };
})()`;

/** @param {string} wsUrl */
function openCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("CDP connect timeout"));
    }, 8000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve({
        eval: (expression, awaitPromise = false) =>
          new Promise((res, rej) => {
            const id = nextId++;
            const t = setTimeout(() => rej(new Error("eval timeout")), 15000);
            const onMsg = (ev) => {
              const msg = JSON.parse(String(ev.data));
              if (msg.id !== id) return;
              clearTimeout(t);
              ws.removeEventListener("message", onMsg);
              if (msg.error) rej(new Error(JSON.stringify(msg.error)));
              else if (msg.result?.exceptionDetails) rej(new Error(JSON.stringify(msg.result.exceptionDetails)));
              else res(msg.result?.result?.value);
            };
            ws.addEventListener("message", onMsg);
            ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise, returnByValue: true } }));
          }),
        close: () => ws.close(),
      });
    });
    ws.addEventListener("error", reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0);

async function main() {
  setupForward();
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("no CDP page");

  const cdp = await openCdp(page.webSocketDebuggerUrl);
  const t0 = Date.now();
  console.error("▶ 格数缩放（webgl blit · 无 60Hz 上限 · 材质可见）");
  console.error("▶ 等待 bench hub 就绪…");

  let ready = false;
  for (let i = 0; i < 30; i++) {
    const s = await cdp.eval(SNAPSHOT_JS);
    if (s?.open && s.domTiles === 10 && s.uiFps >= 15 && s.activeHubs >= 1) {
      ready = true;
      console.error(`  就绪 uiFps=${s.uiFps} hub=${s.hubTickHz}Hz`);
      break;
    }
    await sleep(1000);
  }
  if (!ready) console.error("  警告：hub 未完全就绪，继续测…");
  const hubMaxHz = await cdp.eval(`globalThis.__WM_MATERIAL_BENCH_STATS__?.hubMaxHz ?? null`);
  const hubScheduler = await cdp.eval(`globalThis.__WM_MATERIAL_BENCH_STATS__?.hubScheduler ?? null`);
  console.error(`  hubMaxHz=${hubMaxHz} scheduler=${hubScheduler}`);

  await cdp.eval(`globalThis.__WM_BLIT_EXPERIMENT__ = 'webgl'; 'ok'`);
  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const count of COUNTS) {
    console.error(`▶ ${count} 格 …`);
    await cdp.eval(`
      globalThis.__WM_BENCH_TILE_COUNT__ = ${count};
      window.dispatchEvent(new CustomEvent('wm-bench-tile-count', { detail: { count: ${count} } }));
      'ok';
    `);
    await sleep(5000);
    const samples = [];
    for (let i = 0; i < 6; i++) {
      const s = await cdp.eval(SNAPSHOT_JS);
      if (s?.domTiles === count && s.uiFps > 0 && s.activeHubs >= 1) samples.push(s);
      await sleep(600);
    }
    const row = {
      benchTiles: count,
      domTiles: samples.at(-1)?.domTiles ?? count,
      uiFps: avg(samples.map((s) => s.uiFps)),
      hubTickHz: avg(samples.map((s) => s.hubTickHz)),
      blitMs: avg(samples.map((s) => s.blitMs)),
      blitPerTick: avg(samples.map((s) => s.blitPerTick)),
      activeHubs: samples.at(-1)?.activeHubs ?? 0,
      blitExperiment: "webgl",
      samples: samples.length,
    };
    results.push(row);
    console.log(JSON.stringify(row));
  }

  cdp.close();
  console.error(`\n=== 汇总（${Math.round((Date.now() - t0) / 1000)}s，10→1 降序）===`);
  for (const r of [...results].sort((a, b) => a.benchTiles - b.benchTiles)) {
    console.error(
      `${String(r.benchTiles).padStart(2)} 格 | uiFps ${String(r.uiFps).padStart(5)} | hub ${String(r.hubTickHz).padStart(5)} Hz | blit ${String(r.blitMs).padStart(5)} ms | blit× ${r.blitPerTick} | hubs ${r.activeHubs}`,
    );
  }
}

main().catch((e) => {
  console.error("失败:", e.message || e);
  process.exit(1);
});
