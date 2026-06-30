import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBossChapterSlot, pickBossSlugForLevel } from "./bossRoll.js";

test("normalizeBossChapterSlot 映射无尽章到 0–8 槽位", () => {
  assert.equal(normalizeBossChapterSlot(8), 8);
  assert.equal(normalizeBossChapterSlot(9), 1);
  assert.equal(normalizeBossChapterSlot(16), 8);
  assert.equal(normalizeBossChapterSlot(17), 1);
});

test("无尽 9-3 / 16-3 Boss 关可抽到 slug", () => {
  const seed = 424242;
  assert.notEqual(pickBossSlugForLevel("9-3", seed), "");
  assert.notEqual(pickBossSlugForLevel("16-3", seed), "");
  assert.equal(pickBossSlugForLevel("9-1", seed), "");
});
