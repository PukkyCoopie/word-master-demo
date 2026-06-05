#!/usr/bin/env node
/**
 * 真机 WebView CDP：读取材质性能实验页统计。
 * 前置：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 */
import http from "node:http";

function getTargets() {
  return new Promise((resolve, reject) => {
    http
      .get("http://127.0.0.1:9222/json/list", (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

/** @param {string} wsUrl @param {string} expression */
function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("CDP evaluate timeout"));
    }, 45_000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: msgId++, method: "Runtime.enable" }));
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            id: msgId++,
            method: "Runtime.evaluate",
            params: { expression, returnByValue: true },
          }),
        );
      }, 300);
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.result?.result?.value !== undefined) {
        clearTimeout(timer);
        resolve(msg.result.result.value);
        ws.close();
      } else if (msg.result?.exceptionDetails) {
        clearTimeout(timer);
        reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
        ws.close();
      }
    };

    ws.onerror = (e) => {
      clearTimeout(timer);
      reject(e);
    };
  });
}

const BENCH_EXPR = `(function(){
  const bench = document.querySelector('.material-bench');
  if (!bench) return JSON.stringify({ open: false });
  const pairs = [...bench.querySelectorAll('.material-bench-stat')].map((row) => ({
    label: row.querySelector('.material-bench-stat-label')?.textContent?.trim() ?? '',
    value: row.querySelector('.material-bench-stat-value')?.textContent?.trim() ?? '',
  }));
  const tiles = document.querySelectorAll('.material-bench-tile canvas');
  const canvasBuffers = [...tiles].slice(0, 5).map((c) => ({
    buffer: c.width + 'x' + c.height,
    css: Math.round(c.clientWidth) + 'x' + Math.round(c.clientHeight),
  }));
  return JSON.stringify({
    open: true,
    tileCount: tiles.length,
    pairs,
    canvasBuffers,
    dpr: window.devicePixelRatio,
  });
})()`;

const targets = await getTargets();
const page = targets.find((t) => t.type === "page") ?? targets[0];
if (!page?.webSocketDebuggerUrl) {
  console.error("No CDP target. Run adb forward first.");
  process.exit(1);
}

const raw = await evaluate(page.webSocketDebuggerUrl, BENCH_EXPR);
const data = JSON.parse(raw);
console.log(JSON.stringify(data, null, 2));
