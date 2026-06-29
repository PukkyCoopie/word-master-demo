import test from "node:test";
import assert from "node:assert/strict";
import treasureDef, { treasureHooks } from "./treasure_137.js";
import { injectLineBreaksBeforeParentheses } from "../treasureDescription.js";
import { createTreasureRunState, ensureTreasureBank } from "../treasureRunState.js";

test("电池 onLevelComplete：无超额时不 wobble", async () => {
  const rs = createTreasureRunState();
  let wobbled = false;
  await treasureHooks.onLevelComplete?.({
    treasureRun: rs,
    targetScore: 100,
    currentScore: 100,
    wobbleOwnedTreasureById: async () => {
      wobbled = true;
    },
  });
  assert.equal(wobbled, false);
  assert.equal(ensureTreasureBank(rs, "137").scoreAdd, 0);
});

test("电池 buildFinalScoreStep：提供储存值并清空银行", () => {
  const rs = createTreasureRunState();
  ensureTreasureBank(rs, "137").scoreAdd = 10000;
  const step = treasureHooks.buildFinalScoreStep?.({ treasureRun: rs });
  assert.deepEqual(step, { finalScoreAdd: 10000 });
  assert.equal(ensureTreasureBank(rs, "137").scoreAdd, 0);
  assert.equal(rs.level137BonusApplied, true);
});

test("电池 patchDescription：有储存时仅一行换行（已储存：n）", () => {
  const rs = createTreasureRunState();
  ensureTreasureBank(rs, "137").scoreAdd = 10000;
  const patched = treasureHooks.patchDescription?.({ treasureRun: rs });
  const rendered = injectLineBreaksBeforeParentheses(patched ?? []);
  const brCount = rendered.filter((s) => s?.type === "br").length;
  assert.equal(brCount, 1);
  const storedSeg = rendered.find((s) => s?.type === "text" && String(s.v).includes("已储存"));
  assert.equal(storedSeg?.v, "（已储存：10000）");
});

test("电池 onLevelComplete：有储存时 wobble", async () => {
  const rs = createTreasureRunState();
  let wobbled = false;
  await treasureHooks.onLevelComplete?.({
    treasureRun: rs,
    targetScore: 100,
    currentScore: 110,
    wobbleOwnedTreasureById: async (tid) => {
      assert.equal(tid, "137");
      wobbled = true;
    },
  });
  assert.equal(wobbled, true);
  assert.equal(ensureTreasureBank(rs, "137").scoreAdd, 5);
});

test("电池简介文案", () => {
  assert.equal(
    treasureDef.description.some((s) => s?.type === "text" && s.v.includes("超过部分的一半")),
    true,
  );
});
