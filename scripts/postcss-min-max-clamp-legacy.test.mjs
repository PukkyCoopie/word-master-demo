import assert from "node:assert/strict";
import { describe, it } from "node:test";
import postcss from "postcss";
import minMaxClampLegacy from "./postcss-min-max-clamp-legacy.mjs";

async function run(css) {
  const result = await postcss([minMaxClampLegacy()]).process(css, {
    from: "test.css",
  });
  return result.css;
}

describe("postcss-min-max-clamp-legacy", () => {
  it("expands width:min to width + max-width (privacy card)", async () => {
    const out = await run(`
.card {
  width: min(var(--menu-actions-width), calc(100% - 40 * var(--rpx)));
  height: min(calc(880 * var(--rpx)), calc(100% - 40 * var(--rpx)));
}
`);
    assert.match(out, /width:\s*var\(--menu-actions-width\)/);
    assert.match(out, /max-width:\s*calc\(100% - 40 \* var\(--rpx\)\)/);
    assert.match(out, /height:\s*calc\(880 \* var\(--rpx\)\)/);
    assert.match(out, /max-height:\s*calc\(100% - 40 \* var\(--rpx\)\)/);
    assert.equal(out.includes("width: min("), false);
    assert.equal(out.includes("height: min("), false);
  });

  it("puts rpx base before fluid cap so later max-width:100% cannot wipe the cap", async () => {
    const out = await run(`
.run-start-dialog-card {
  width: min(100%, calc(600 * var(--rpx)));
  max-width: 100%;
}
`);
    assert.match(out, /(?:^|[^\w-])width:\s*calc\(600 \* var\(--rpx\)\)/m);
    assert.match(out, /max-width:\s*100%/);
    // 展开后的主 width 应为定长，而非 100%（否则会被后面的 max-width:100% 盖成全宽）
    assert.equal(/(?:^|[^\w-])width:\s*100%/.test(out), false);
    assert.equal(out.includes("width: min("), false);
  });

  it("keeps progressive min() on max-width with fixed fallback first", async () => {
    const out = await run(`
.box {
  max-width: min(calc(520 * var(--rpx)), 100%);
}
`);
    assert.match(out, /max-width:\s*calc\(520 \* var\(--rpx\)\)/);
    assert.match(out, /max-width:\s*min\(calc\(520 \* var\(--rpx\)\),\s*100%\)/);
  });

  it("expands clamp on width", async () => {
    const out = await run(`
.x {
  width: clamp(10px, 50%, 200px);
}
`);
    assert.match(out, /width:\s*50%/);
    assert.match(out, /min-width:\s*10px/);
    assert.match(out, /max-width:\s*200px/);
    assert.equal(out.includes("clamp("), false);
  });

  it("falls back top:max(env) to calc length", async () => {
    const out = await run(`
.p {
  top: max(calc(16 * var(--rpx)), env(safe-area-inset-top, 0px));
}
`);
    assert.match(out, /top:\s*calc\(16 \* var\(--rpx\)\)/);
    assert.match(out, /top:\s*max\(/);
  });
});
