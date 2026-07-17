import assert from "node:assert/strict";
import { describe, it } from "node:test";
import postcss from "postcss";
import postcssLogical from "postcss-logical";
import flexGapLegacyFallback from "./postcss-flex-gap-legacy.mjs";

async function run(css) {
  const result = await postcss([
    postcssLogical(),
    flexGapLegacyFallback({ flexGapNotSupported: "html.no-flex-gap" }),
  ]).process(css, { from: "test.css" });
  return result.css;
}

describe("postcss-flex-gap-legacy", () => {
  it("keeps native gap and adds gated margin fallback for flex", async () => {
    const out = await run(`
.bottom-bar {
  display: flex;
  gap: calc(8 * var(--rpx));
}
`);
    assert.match(out, /\.bottom-bar\s*\{[^}]*gap:\s*calc\(8 \* var\(--rpx\)\)/);
    assert.match(out, /html\.no-flex-gap \.bottom-bar\s*\{/);
    assert.match(out, /margin-left:\s*calc\(8 \* var\(--rpx\)\)/);
    assert.match(out, /margin-left:\s*calc\(-1 \* \(8 \* var\(--rpx\)\)\)/);
  });

  it("does not polyfill CSS grid gap", async () => {
    const out = await run(`
.letter-grid {
  display: grid;
  gap: calc(6 * var(--rpx));
}
`);
    assert.equal(out.includes("html.no-flex-gap"), false);
    assert.match(out, /gap:\s*calc\(6 \* var\(--rpx\)\)/);
  });

  it("expands inset to physical edges", async () => {
    const out = await run(`
.overlay {
  position: absolute;
  inset: 0;
}
`);
    assert.match(out, /top:\s*0/);
    assert.match(out, /right:\s*0/);
    assert.match(out, /bottom:\s*0/);
    assert.match(out, /left:\s*0/);
    assert.equal(/\binset:\s*0\b/.test(out), false);
  });
});
