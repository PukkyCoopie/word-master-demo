import test from "node:test";
import assert from "node:assert/strict";
import { resolveBossTargetScoreAfterKeySold } from "./bossKeySoldFx.js";
import { resolveLevelTargetScoreForDifficulty } from "./runDifficultyRuntime.js";

test("钥匙解除后高墙关目标分低于仍带 Boss 倍率时", () => {
  const relieved = resolveBossTargetScoreAfterKeySold("1-3", 0);
  const withWall = resolveLevelTargetScoreForDifficulty("1-3", "the_wall", 0);
  assert.ok(withWall > relieved);
  assert.equal(relieved, resolveLevelTargetScoreForDifficulty("1-3", "", 0));
});
