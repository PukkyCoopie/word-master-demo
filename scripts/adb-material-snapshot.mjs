/**
 * 通过 ADB 转发的 WebView CDP，从正在运行的 App 采样材质/Canvas 状态。
 * 用法：先 adb forward，再 node scripts/adb-material-snapshot.mjs
 */
// Node 18+ 内置 WebSocket；无需额外依赖
const { WebSocket } = globalThis;
if (!WebSocket) throw new Error("Node WebSocket unavailable");

const CDP_HOST = process.env.CDP_HOST || "127.0.0.1:9222";

async function listTargets() {
  const res = await fetch(`http://${CDP_HOST}/json/list`);
  if (!res.ok) throw new Error(`CDP list failed: ${res.status}`);
  return res.json();
}

function cdpCall(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve, reject) => {
    const onMsg = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id !== id) return;
      ws.removeEventListener("message", onMsg);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const SAMPLE_JS = `(() => {
  const canvases = [...document.querySelectorAll("canvas")];
  const videos = [...document.querySelectorAll("video")];
  const materialClassRe = /tile-(gold|steel|ice|water|fire|wildcard|lucky)-regl-canvas/;
  const materialCanvases = canvases.filter((c) => materialClassRe.test(c.className || ""));
  const materialVideos = videos.filter((v) => materialClassRe.test(v.className || ""));
  const visibleMaterialCanvases = materialCanvases.filter((c) => {
    const tile = c.closest(
      ".grid-tile, .word-slot-content, .deck-layer-tile, .fly-letter, .material-bench-tile"
    );
    return tile && (tile.offsetParent !== null || tile.getClientRects().length > 0);
  });
  const byMaterial = {};
  for (const c of materialCanvases) {
    const m = (c.className || "").match(/tile-([a-z]+)-regl-canvas/);
    const id = m ? m[1] : "unknown";
    byMaterial[id] = (byMaterial[id] || 0) + 1;
  }
  const sampleSizes = materialCanvases.slice(0, 16).map((c) => ({
    material: ((c.className || "").match(/tile-([a-z]+)-regl-canvas/) || [])[1] || null,
    buffer: [c.width, c.height],
    css: [Math.round(c.clientWidth), Math.round(c.clientHeight)],
    visible: !!(c.offsetParent || c.getClientRects().length),
  }));
  return {
    capturedAt: new Date().toISOString(),
    page: { title: document.title, url: location.href },
    device: {
      inner: [window.innerWidth, window.innerHeight],
      dpr: window.devicePixelRatio,
      native: !!window.Capacitor?.isNativePlatform?.(),
      coarsePointer: window.matchMedia?.("(pointer: coarse)")?.matches ?? null,
    },
    canvas: {
      total: canvases.length,
      materialTotal: materialCanvases.length,
      materialVisible: visibleMaterialCanvases.length,
      byMaterial,
      sampleSizes,
    },
    video: {
      total: videos.length,
      materialTotal: materialVideos.length,
      sample: materialVideos.slice(0, 16).map((v) => ({
        className: v.className || "",
        readyState: v.readyState,
        paused: v.paused,
        currentTime: Math.round(v.currentTime * 1000) / 1000,
        css: [Math.round(v.clientWidth), Math.round(v.clientHeight)],
        visible: !!(v.offsetParent || v.getClientRects().length),
      })),
    },
    globals: {
      benchStats: globalThis.__WM_MATERIAL_BENCH_STATS__ ?? null,
      pipelineStats: globalThis.__WM_MATERIAL_PIPELINE_STATS__ ?? null,
      hasDevConsole: !!globalThis.__WM_DEV__,
      materialProfileFlag: !!globalThis.__WM_MATERIAL_PROFILE__,
    },
    dom: {
      gridTiles: document.querySelectorAll(".grid-tile").length,
      wordSlots: document.querySelectorAll(".word-slot-content").length,
      materialTiles: document.querySelectorAll("[class*=\\"tile-material-\\"]").length,
    },
  };
})()`;

const BENCH_JS = `(() => {
  if (globalThis.__WM_MATERIAL_BENCH__?.open) {
    globalThis.__WM_MATERIAL_BENCH__.open();
    return { opened: true, via: "__WM_MATERIAL_BENCH__" };
  }
  if (globalThis.__WM_DEV__?.openMaterialBench) {
    globalThis.__WM_DEV__.openMaterialBench();
    return { opened: true, via: "__WM_DEV__" };
  }
  return { opened: false, reason: "no dev console in this build" };
})()`;

const PROFILE_JS = `(() => {
  globalThis.__WM_MATERIAL_PROFILE__ = true;
  return { enabled: true };
})()`;

/** 2 秒内 hook drawImage，估算材质 blit 频率 */
const DRAW_IMAGE_SAMPLE_JS = `(() => {
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  let count = 0;
  const t0 = performance.now();
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    count += 1;
    return orig.apply(this, args);
  };
  return new Promise((resolve) => {
    setTimeout(() => {
      CanvasRenderingContext2D.prototype.drawImage = orig;
      const durationMs = performance.now() - t0;
      resolve({
        durationMs: Math.round(durationMs),
        drawImageTotal: count,
        drawImagePerSec: Math.round((count * 1000) / Math.max(1, durationMs) * 10) / 10,
        drawImagePer60fpsFrame: Math.round((count / Math.max(1, durationMs)) * (1000 / 60) * 10) / 10,
      });
    }, 2000);
  });
})()`;

async function main() {
  const targets = await listTargets();
  const page = targets.find((t) => t.type === "page");
  if (!page?.webSocketDebuggerUrl) {
    throw new Error("No CDP page target found. Is adb forward set?");
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  try {
    await cdpCall(ws, "Runtime.enable");

    const openBench = process.argv.includes("--open-bench");
    const enableProfile = process.argv.includes("--enable-profile");

    if (openBench) {
      const bench = await cdpCall(ws, "Runtime.evaluate", {
        expression: BENCH_JS,
        returnByValue: true,
      });
      console.error("[adb-material-snapshot] open-bench:", JSON.stringify(bench?.result?.value));
      await new Promise((r) => setTimeout(r, 2500));
    }

    if (enableProfile) {
      await cdpCall(ws, "Runtime.enable");
      await cdpCall(ws, "Runtime.evaluate", {
        expression: PROFILE_JS,
        returnByValue: true,
      });
      await new Promise((r) => setTimeout(r, 3000));
    }

    const drawSampleMs = Number(process.env.DRAW_SAMPLE_MS || "2000");
    const drawJs = DRAW_IMAGE_SAMPLE_JS.replace("2000", String(drawSampleMs));
    console.error(`[adb-material-snapshot] sampling drawImage for ${drawSampleMs}ms...`);
    const drawSample = await cdpCall(ws, "Runtime.evaluate", {
      expression: drawJs,
      returnByValue: true,
      awaitPromise: true,
    });

    const snap = await cdpCall(ws, "Runtime.evaluate", {
      expression: SAMPLE_JS,
      returnByValue: true,
    });

    const payload = {
      meta: {
        package: "com.timeshift_games.word_master",
        cdpTarget: { title: page.title, url: page.url, id: page.id },
        script: "scripts/adb-material-snapshot.mjs",
        notes: [
          "drawImage 采样为页面内 hook CanvasRenderingContext2D.prototype.drawImage",
          "材质管线 blit 即 drawImage；其它 canvas 操作也会计入",
          "Chrome Performance Blit% 需另行在 DevTools Performance 录制",
        ],
      },
      drawImageSample: drawSample?.result?.value ?? null,
      snapshot: snap?.result?.value ?? null,
    };

    const outPath = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
    const json = JSON.stringify(payload, null, 2);
    if (outPath) {
      const fs = await import("node:fs/promises");
      await fs.writeFile(outPath, json, "utf8");
      console.error(`[adb-material-snapshot] wrote ${outPath}`);
    }
    console.log(json);
  } finally {
    ws.close();
  }
}

main().catch((e) => {
  console.error("[adb-material-snapshot] ERROR:", e.message || e);
  process.exit(1);
});
