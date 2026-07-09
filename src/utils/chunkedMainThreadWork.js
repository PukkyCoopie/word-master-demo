/** 单帧内主线程工作预算（毫秒），留出绘制与输入响应余量 */
export const DEFAULT_FRAME_BUDGET_MS = 8;

/** @returns {Promise<void>} */
export function yieldToNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * 创建按帧预算自动让出主线程的 yield 函数（时间分片 / cooperative scheduling）。
 * @param {number} [budgetMs]
 * @returns {() => Promise<void>}
 */
export function createFrameBudgetYielder(budgetMs = DEFAULT_FRAME_BUDGET_MS) {
  let sliceStart = typeof performance !== "undefined" ? performance.now() : 0;
  return async function maybeYieldToNextFrame() {
    if (typeof performance === "undefined") {
      await yieldToNextFrame();
      return;
    }
    const now = performance.now();
    if (now - sliceStart < budgetMs) return;
    await yieldToNextFrame();
    sliceStart = performance.now();
  };
}

/**
 * 顺序执行异步步骤，每步后按帧预算让出主线程。
 * @param {readonly (() => void | Promise<void>)[]} steps
 * @param {{ frameBudgetMs?: number }} [options]
 */
export async function runChunkedAsyncSteps(steps, options = {}) {
  const maybeYield = createFrameBudgetYielder(options.frameBudgetMs ?? DEFAULT_FRAME_BUDGET_MS);
  for (const step of steps) {
    await step();
    await maybeYield();
  }
}
