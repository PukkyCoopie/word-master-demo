#!/usr/bin/env node
/** 对比 2 格 vs 4 格：按材质剖析 draw/blit */
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const ADB = path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe");

function adb(...args) {
  return (spawnSync(ADB, args, { encoding: "utf8" }).stdout || "") + (spawnSync(ADB, args, { encoding: "utf8" }).stderr || "");
}

function setupForward() {
  const appPid = adb("shell", "pidof", "com.timeshift_games.word_master").trim();
  adb("forward", "--remove", "tcp:9222");
  adb("forward", "tcp:9222", `localabstract:webview_devtools_remote_${appPid}`);
}

async function cdpEval(expr, awaitPromise = true) {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const id = 42;
  const val = await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), 25000);
    const on = (e) => {
      const m = JSON.parse(String(e.data));
      if (m.id !== id) return;
      clearTimeout(t);
      ws.removeEventListener("message", on);
      ws.close();
      m.result?.exceptionDetails ? rej(m.result.exceptionDetails) : res(m.result?.result?.value);
    };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression: expr, awaitPromise, returnByValue: true } }));
  });
  return val;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SAMPLE = `(async (count) => {
  globalThis.__WM_BENCH_TILE_COUNT__ = count;
  window.dispatchEvent(new CustomEvent("wm-bench-tile-count", { detail: { count } }));
  await new Promise((r) => setTimeout(r, 4500));
  const stat = (label) => {
    const bench = document.querySelector(".material-bench");
    for (const row of bench.querySelectorAll(".material-bench-stat")) {
      const l = row.querySelector(".material-bench-stat-label")?.textContent?.trim();
      if (l === label) return row.querySelector(".material-bench-stat-value")?.textContent?.trim() ?? "";
    }
    return "";
  };
  const tiles = [...document.querySelectorAll(".material-bench-tile")].map((t) => ({
    letter: t.querySelector(".letter-tile-char")?.textContent?.trim(),
    mat: [...t.classList].find((c) => c.startsWith("tile-material-"))?.replace("tile-material-", "") ?? null,
  }));
  const prof = globalThis.__WM_MATERIAL_BENCH_STATS__?.materialProfile ?? null;
  return {
    count,
    domTiles: tiles.length,
    tiles,
    uiFps: Number(stat("界面 FPS（bench RAF）")) || 0,
    hubTickHz: Number((stat("材质 hub Hz").split("/")[0] || "").trim()) || 0,
    profile: prof,
  };
})`;

setupForward();
for (const count of [2, 3, 4]) {
  const row = await cdpEval(`(${SAMPLE})(${count})`);
  console.log(JSON.stringify(row, null, 2));
}
