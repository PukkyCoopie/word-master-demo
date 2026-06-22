import assert from "node:assert/strict";
import {
  COLLECTION_LEADERBOARD_TREASURE_GAP_RPX,
  COLLECTION_LEADERBOARD_TREASURE_SIZE_RPX,
  maxLeaderboardTreasuresPerRow,
  resolveLeaderboardTreasureRowSlice,
} from "./collectionLeaderboardLayout.js";

const cell = COLLECTION_LEADERBOARD_TREASURE_SIZE_RPX;
const gap = COLLECTION_LEADERBOARD_TREASURE_GAP_RPX;

assert.equal(maxLeaderboardTreasuresPerRow(0), 0);

const rowW = cell * 5 + gap * 4;
assert.equal(maxLeaderboardTreasuresPerRow(rowW), 5);

const fits = resolveLeaderboardTreasureRowSlice(3, rowW);
assert.equal(fits.visibleCount, 3);
assert.equal(fits.hiddenCount, 0);
assert.equal(fits.needsExpand, false);

const overflow = resolveLeaderboardTreasureRowSlice(8, rowW);
assert.equal(overflow.needsExpand, true);
assert.equal(overflow.hiddenCount, overflow.visibleCount > 0 ? 8 - overflow.visibleCount : 0);
assert.ok(overflow.visibleCount >= 1);
assert.ok(overflow.visibleCount < 8);

const withExpandMax = Math.floor((rowW - cell) / (cell + gap));
const expectedVisible = Math.min(withExpandMax, 8);
assert.equal(overflow.visibleCount, expectedVisible);

console.log("collectionLeaderboardLayout.test.mjs OK");
