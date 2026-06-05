#!/usr/bin/env node
/** 验证 bench 格子上材质 canvas 是否真有像素内容、是否在动画 */
import http from "node:http";

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:9222/json/list", (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 20000);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (msg.result?.exceptionDetails) reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
      else resolve(msg.result?.result?.value);
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(e); };
  });
}

const EXPR = `(async () => {
  const tiles = [...document.querySelectorAll(".material-bench-tile")];
  const sampleCanvas = (canvas) => {
    if (!canvas || canvas.width < 2 || canvas.height < 2) return { ok: false, reason: "no-canvas" };
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, reason: "no-ctx" };
    const w = canvas.width, h = canvas.height;
    const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    const r1 = ctx.getImageData(cx, cy, 1, 1).data;
    return {
      ok: true,
      buffer: w + "x" + h,
      css: Math.round(canvas.clientWidth) + "x" + Math.round(canvas.clientHeight),
      center: [r1[0], r1[1], r1[2], r1[3]],
      alpha: r1[3],
    };
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rows = [];
  for (const tile of tiles) {
    const letter = tile.querySelector(".letter-tile-char")?.textContent?.trim() ?? "?";
    const matClass = [...tile.classList].find((c) => c.startsWith("tile-material-")) ?? null;
    const canvas = tile.querySelector("canvas[class*='-regl-canvas']");
    const a = sampleCanvas(canvas);
    await wait(120);
    const b = sampleCanvas(canvas);
    const changed = a.ok && b.ok && (
      a.center[0] !== b.center[0] || a.center[1] !== b.center[1] || a.center[2] !== b.center[2] || a.center[3] !== b.center[3]
    );
    rows.push({ letter, matClass, canvasClass: canvas?.className ?? null, sampleA: a, sampleB: b, pixelChanged: changed });
  }
  return {
    benchOpen: !!document.querySelector(".material-bench"),
    tileCount: tiles.length,
    title: document.querySelector(".material-bench-title")?.textContent?.trim() ?? "",
    activeHubs: document.querySelector(".material-bench-stat-value")?.textContent ?? "",
    tiles: rows,
    allHaveMaterialClass: rows.every((r) => r.matClass),
    allCanvasNonTransparent: rows.every((r) => r.sampleA.ok && r.sampleA.alpha > 0),
    anyPixelAnimating: rows.some((r) => r.pixelChanged),
  };
})()`;

const count = Number(process.argv[2]) || 0;
const targets = await getTargets();
const page = targets.find((t) => t.type === "page");
if (!page?.webSocketDebuggerUrl) { console.error("no CDP"); process.exit(1); }

if (count > 0) {
  await evaluate(
    page.webSocketDebuggerUrl,
    `globalThis.__WM_BENCH_TILE_COUNT__=${count}; window.dispatchEvent(new CustomEvent('wm-bench-tile-count',{detail:{count:${count}}})); 'ok'`,
  );
  await new Promise((r) => setTimeout(r, 3500));
}

const data = await evaluate(page.webSocketDebuggerUrl, EXPR);
console.log(JSON.stringify(data, null, 2));
