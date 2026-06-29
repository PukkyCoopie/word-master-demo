import confetti from "canvas-confetti";
import { playRunEndWinConfettiBursts } from "./runEndWinConfetti.js";

/**
 * @param {{ getCanvasEl: () => HTMLCanvasElement | null }} options
 */
export function createRunEndConfettiController({ getCanvasEl }) {
  /** @type {number[]} */
  let burstTimers = [];
  /** @type {ReturnType<typeof confetti.create> | null} */
  let fire = null;

  function clearBurstTimers() {
    for (const id of burstTimers) clearTimeout(id);
    burstTimers = [];
  }

  /** @param {() => void} fn @param {number} delayMs */
  function scheduleBurst(fn, delayMs) {
    const id = window.setTimeout(() => {
      burstTimers = burstTimers.filter((t) => t !== id);
      fn();
    }, delayMs);
    burstTimers.push(id);
  }

  function clearCanvas() {
    const canvas = getCanvasEl();
    if (!canvas) return;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch {
      // ignore
    }
  }

  function releaseInstance() {
    if (fire && typeof fire.reset === "function") fire.reset();
    fire = null;
  }

  function dispose() {
    clearBurstTimers();
    releaseInstance();
    clearCanvas();
    const canvas = getCanvasEl();
    if (!canvas) return;
    try {
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // ignore
    }
  }

  function syncCanvasSize() {
    const canvas = getCanvasEl();
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return true;
  }

  function ensureFire() {
    const canvas = getCanvasEl();
    if (!canvas) return null;
    if (!fire) fire = confetti.create(canvas, { resize: false, useWorker: false });
    return fire;
  }

  function triggerWin() {
    clearBurstTimers();
    if (!syncCanvasSize()) return;
    const fireFn = ensureFire();
    if (!fireFn) return;
    playRunEndWinConfettiBursts(fireFn, scheduleBurst);
  }

  return {
    triggerWin,
    dispose,
  };
}
