#!/usr/bin/env node
/**
 * 通过 adb forward 后的 WebView CDP 探测词典加载状态（真机调试）。
 * 用法：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 *       node scripts/cdp-probe-dict.mjs [full|ui]
 */
import http from "node:http";

const mode = process.argv[2] ?? "ui";

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

/**
 * @param {string} wsUrl
 * @param {string} expression
 * @param {boolean} awaitPromise
 */
function evaluate(wsUrl, expression, awaitPromise = false) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("CDP evaluate timeout"));
    }, mode === "full" ? 180_000 : 30_000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: msgId++, method: "Runtime.enable" }));
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            id: msgId++,
            method: "Runtime.evaluate",
            params: { expression, awaitPromise, returnByValue: true },
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

const UI_EXPR = `(function(){
  const bar = document.querySelector('.dict-boot-bar');
  const fill = document.querySelector('.dict-boot-bar-fill');
  return JSON.stringify({
    errorBar: !!document.querySelector('.dict-boot-bar--error'),
    fillWidth: fill ? fill.style.width : null,
    gateVisible: !!document.querySelector('.dict-boot-gate'),
    menuVisible: !!document.querySelector('.main-menu'),
    brotli: typeof DecompressionStream !== 'undefined',
  });
})()`;

const FULL_EXPR = `(async function(){
  try {
    const metaRes = await fetch('./data/dictionary/dict.meta.json');
    const meta = await metaRes.json();
    const brRes = await fetch('./data/dictionary/dict.json.br');
    const buf = await brRes.arrayBuffer();
    const t0 = performance.now();
    const ds = new DecompressionStream('brotli');
    const reader = new Blob([buf]).stream().pipeThrough(ds).getReader();
    const dec = new TextDecoder();
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
    }
    text += dec.decode();
    const t1 = performance.now();
    const raw = JSON.parse(text);
    return JSON.stringify({
      ok: true,
      meta,
      compressedBytes: buf.byteLength,
      textLen: text.length,
      rows: raw.length,
      decompressMs: Math.round(t1 - t0),
    });
  } catch (e) {
    return JSON.stringify({
      ok: false,
      name: e?.name,
      message: e?.message,
      stack: String(e?.stack ?? '').slice(0, 1000),
    });
  }
})()`;

const targets = await getTargets();
if (!targets?.length) {
  console.error("No CDP targets. Run adb forward first.");
  process.exit(1);
}

const wsUrl = targets[0].webSocketDebuggerUrl;
console.log("Target:", targets[0].title, targets[0].url);

const result = await evaluate(wsUrl, mode === "full" ? FULL_EXPR : UI_EXPR, mode === "full");
console.log(result);
