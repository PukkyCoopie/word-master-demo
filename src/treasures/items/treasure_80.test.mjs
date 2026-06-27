import test from "node:test";
import assert from "node:assert/strict";
import { createTreasureRunState } from "../treasureRunState.js";
import { addScoreAddBank } from "../treasureBankHelpers.js";
import { treasureHooks } from "./treasure_80.js";

test("泡泡 persistTileAfterPerLetterTreasureCue：万能块计分为 B 时可写回角标", () => {
  const realTile = {
    letter: "?",
    isWildcard: true,
    materialId: "wildcard",
    tileScoreBonus: 0,
    _deckCard: { raw: "?", tileScoreBonus: 0, isWildcard: true, materialId: "wildcard" },
  };
  const scoringTile = { letter: "B", rarity: "common" };
  const ok = treasureHooks.persistTileAfterPerLetterTreasureCue?.({
    realTile,
    scoringTile,
    scoringLetter: "b",
    band: "score",
    delta: 8,
  });
  assert.equal(ok, true);
  assert.equal(realTile.tileScoreBonus, 8);
  assert.equal(realTile._deckCard.tileScoreBonus, 8);
});

test("泡泡 persistTileAfterPerLetterTreasureCue：未变形万能块 ? 不匹配 B", () => {
  const realTile = { letter: "?", tileScoreBonus: 0, _deckCard: { tileScoreBonus: 0 } };
  const ok = treasureHooks.persistTileAfterPerLetterTreasureCue?.({
    realTile,
    band: "score",
    delta: 8,
  });
  assert.equal(ok, false);
  assert.equal(realTile.tileScoreBonus, 0);
});

test("泡泡 buildPostLetterStep：双路径（面具+本体）字后 +16，单路径 +8", () => {
  const rs = createTreasureRunState();
  const letterParts = [{ letter: "b" }];
  const ctxBase = { treasureRun: rs, letterParts, letterReplayCounts: [0] };

  const solo = treasureHooks.buildPostLetterStep?.({
    ...ctxBase,
    ownedSlotTreasureIds: ["80", null],
  });
  assert.deepEqual(solo, { scoreAdd: 8 });

  const masked = treasureHooks.buildPostLetterStep?.({
    ...ctxBase,
    ownedSlotTreasureIds: ["98", "80"],
  });
  assert.deepEqual(masked, { scoreAdd: 16 });

  addScoreAddBank(rs, "80", 8);
  const withBank = treasureHooks.buildPostLetterStep?.({
    ...ctxBase,
    ownedSlotTreasureIds: ["98", "80"],
  });
  assert.deepEqual(withBank, { scoreAdd: 24 });
});
