import test from "node:test";
import assert from "node:assert/strict";
import treasureDef, { treasureHooks } from "./treasure_137.js";
import { injectLineBreaksBeforeParentheses } from "../treasureDescription.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { getScoreAddBank } from "../treasureBankHelpers.js";

/** @param {import('../treasureRunState.js').TreasureRunState} rs @param {number} [stored] */
function makeBatteryCtx(rs, stored = 0) {
  const slot = {
    treasureId: "137",
    bank: { multAdd: 0, multMul: 1, scoreAdd: stored },
  };
  return {
    treasureRun: rs,
    ownedTreasureInstances: [slot],
    ownedSlotTreasureIds: ["137"],
    hookSlotIndex: 0,
    hookSource: "self",
    slotIndex: 0,
  };
}

test("电池 onLevelComplete：无超额时不 wobble", async () => {
  const rs = createTreasureRunState();
  const ctx = makeBatteryCtx(rs);
  let wobbled = false;
  await treasureHooks.onLevelComplete?.({
    ...ctx,
    targetScore: 100,
    currentScore: 100,
    wobbleOwnedTreasureById: async () => {
      wobbled = true;
    },
  });
  assert.equal(wobbled, false);
  assert.equal(getScoreAddBank(rs, "137", ctx), 0);
});

test("电池 buildFinalScoreStep：提供储存值并清空银行", () => {
  const rs = createTreasureRunState();
  const ctx = makeBatteryCtx(rs, 10000);
  const step = treasureHooks.buildFinalScoreStep?.({ ...ctx, treasureRun: rs });
  assert.deepEqual(step, { finalScoreAdd: 10000 });
  assert.equal(getScoreAddBank(rs, "137", ctx), 0);
  assert.equal(rs.level137BonusApplied, true);
});

test("电池 patchDescription：有储存时仅一行换行（已储存：n）", () => {
  const rs = createTreasureRunState();
  const ctx = makeBatteryCtx(rs, 10000);
  const patched = treasureHooks.patchDescription?.({ ...ctx, treasureRun: rs });
  const rendered = injectLineBreaksBeforeParentheses(patched ?? []);
  const brCount = rendered.filter((s) => s?.type === "br").length;
  assert.equal(brCount, 1);
  const storedSeg = rendered.find((s) => s?.type === "text" && String(s.v).includes("已储存"));
  assert.equal(storedSeg?.v, "（已储存：10,000）");
});

test("电池 patchDescription：超大储存值用科学计数法", () => {
  const rs = createTreasureRunState();
  const ctx = makeBatteryCtx(rs, 1_000_000_000);
  const patched = treasureHooks.patchDescription?.({ ...ctx, treasureRun: rs });
  const rendered = injectLineBreaksBeforeParentheses(patched ?? []);
  const storedSeg = rendered.find((s) => s?.type === "text" && String(s.v).includes("已储存"));
  assert.equal(storedSeg?.v, "（已储存：1.00000e+9）");
});

test("电池 onLevelComplete：有超额时 wobble 并写入槽位银行", async () => {
  const rs = createTreasureRunState();
  const ctx = makeBatteryCtx(rs);
  let wobbled = false;
  await treasureHooks.onLevelComplete?.({
    ...ctx,
    targetScore: 100,
    currentScore: 110,
    wobbleOwnedTreasureById: async (tid) => {
      assert.equal(tid, "137");
      wobbled = true;
    },
  });
  assert.equal(wobbled, true);
  assert.equal(getScoreAddBank(rs, "137", ctx), 5);
});

test("电池简介文案", () => {
  assert.equal(
    treasureDef.description.some((s) => s?.type === "text" && s.v.includes("超过部分的一半")),
    true,
  );
});
