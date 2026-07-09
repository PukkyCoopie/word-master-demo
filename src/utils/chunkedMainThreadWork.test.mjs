import assert from "node:assert/strict";

if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

import {
  createFrameBudgetYielder,
  runChunkedAsyncSteps,
  yieldToNextFrame,
} from "./chunkedMainThreadWork.js";

await yieldToNextFrame();

let yieldCount = 0;
const maybeYield = createFrameBudgetYielder(0);
await maybeYield();
yieldCount += 1;
await maybeYield();
yieldCount += 1;
assert.equal(yieldCount, 2);

const order = [];
await runChunkedAsyncSteps(
  [
    () => {
      order.push(1);
    },
    () => {
      order.push(2);
    },
    async () => {
      order.push(3);
    },
  ],
  { frameBudgetMs: 0 },
);
assert.deepEqual(order, [1, 2, 3]);

console.log("chunkedMainThreadWork.test.mjs ok");
