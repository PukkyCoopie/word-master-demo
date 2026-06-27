import test from "node:test";
import assert from "node:assert/strict";
import { getCompletedLevelIdsForWin } from "./runEndFlow.js";
import { RUN_START_LEVEL_INDEX } from "../levelDefinitions.js";

test("getCompletedLevelIdsForWin: from run start through current index", () => {
  const ids = getCompletedLevelIdsForWin(RUN_START_LEVEL_INDEX + 1);
  assert.ok(ids.length >= 2);
  assert.equal(ids[0], "1-1");
  assert.equal(ids[ids.length - 1], "1-2");
});

test("getCompletedLevelIdsForWin: before run start returns empty", () => {
  const ids = getCompletedLevelIdsForWin(RUN_START_LEVEL_INDEX - 1);
  assert.equal(ids.length, 0);
});
