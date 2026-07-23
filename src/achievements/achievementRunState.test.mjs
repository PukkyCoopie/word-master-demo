import test from "node:test";
import assert from "node:assert/strict";
import {
  checkOneWordPerLevelWin,
  createAchievementRunState,
  recordAchievementRunWordSubmitted,
  resetAchievementRunWordsForLevel,
} from "./achievementRunState.js";
import {
  LEVELS,
  RUN_START_LEVEL_INDEX,
  STANDARD_RUN_FINAL_LEVEL_INDEX,
} from "../levelDefinitions.js";

/** @param {number} levelIndex */
function getCompletedLevelIdsForWin(levelIndex) {
  const idx = Math.max(0, Math.floor(Number(levelIndex) || 0));
  /** @type {string[]} */
  const ids = [];
  for (let i = RUN_START_LEVEL_INDEX; i <= idx && i < LEVELS.length; i++) {
    ids.push(LEVELS[i].id);
  }
  return ids;
}

test("checkOneWordPerLevelWin: full standard run with exactly one word per level", () => {
  const ids = getCompletedLevelIdsForWin(STANDARD_RUN_FINAL_LEVEL_INDEX);
  assert.equal(ids[0], "1-1");
  assert.equal(ids[ids.length - 1], "8-3");
  assert.equal(ids.length, 24);

  const state = createAchievementRunState();
  for (const id of ids) {
    recordAchievementRunWordSubmitted(state, id);
  }
  assert.equal(checkOneWordPerLevelWin(state, ids), true);
});

test("checkOneWordPerLevelWin: fails when a completed level has 2+ words; 0 is allowed", () => {
  const ids = getCompletedLevelIdsForWin(STANDARD_RUN_FINAL_LEVEL_INDEX);
  const stateMissing = createAchievementRunState();
  for (const id of ids.slice(0, -1)) {
    recordAchievementRunWordSubmitted(stateMissing, id);
  }
  // 末关 0 次（跳关）仍可通过
  assert.equal(checkOneWordPerLevelWin(stateMissing, ids), true);

  const stateDouble = createAchievementRunState();
  for (const id of ids) {
    recordAchievementRunWordSubmitted(stateDouble, id);
  }
  recordAchievementRunWordSubmitted(stateDouble, ids[0]);
  assert.equal(checkOneWordPerLevelWin(stateDouble, ids), false);
});

test("checkOneWordPerLevelWin: ante-0 extras do not block if completed path is exact", () => {
  const ids = getCompletedLevelIdsForWin(STANDARD_RUN_FINAL_LEVEL_INDEX);
  const state = createAchievementRunState();
  for (const id of ids) {
    recordAchievementRunWordSubmitted(state, id);
  }
  recordAchievementRunWordSubmitted(state, "0-2");
  assert.equal(checkOneWordPerLevelWin(state, ids), true);
});

test("checkOneWordPerLevelWin: empty completed list is false", () => {
  assert.equal(checkOneWordPerLevelWin(createAchievementRunState(), []), false);
});

test("resetAchievementRunWordsForLevel: re-enter level refreshes count (glyph replay)", () => {
  const ids = ["1-1", "1-2", "1-3"];
  const state = createAchievementRunState();
  for (const id of ids) {
    recordAchievementRunWordSubmitted(state, id);
  }
  assert.equal(state.wordsPerLevelId["1-3"], 1);

  // 卷轴回退再进 1-3：刷新而非累加
  resetAchievementRunWordsForLevel(state, "1-3");
  assert.equal(state.wordsPerLevelId["1-3"], 0);
  recordAchievementRunWordSubmitted(state, "1-3");
  assert.equal(state.wordsPerLevelId["1-3"], 1);
  assert.equal(checkOneWordPerLevelWin(state, ids), true);

  // 若未刷新则再拼一次会变成 2；刷新后仍可一字通关
  recordAchievementRunWordSubmitted(state, "1-3");
  assert.equal(checkOneWordPerLevelWin(state, ids), false);
  resetAchievementRunWordsForLevel(state, "1-3");
  recordAchievementRunWordSubmitted(state, "1-3");
  assert.equal(checkOneWordPerLevelWin(state, ids), true);
});
