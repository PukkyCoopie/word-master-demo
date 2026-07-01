import test from "node:test";
import assert from "node:assert/strict";
import {
  gridIntroDropOffsetRows,
  gridRefillNewTileDropOffsetRows,
} from "./gridDropOffset.js";

test("gridIntroDropOffsetRows：镣铐首行可玩格仍按完整棋盘行偏移", () => {
  assert.equal(gridIntroDropOffsetRows(0), 2.2);
  assert.equal(gridIntroDropOffsetRows(1), 3.2);
  assert.equal(gridIntroDropOffsetRows(3), 5.2);
});

test("gridRefillNewTileDropOffsetRows：镣铐首行可玩格仍从网格外落入", () => {
  assert.equal(gridRefillNewTileDropOffsetRows(1, false), 3);
  assert.equal(gridRefillNewTileDropOffsetRows(3, false), 5);
  assert.equal(gridRefillNewTileDropOffsetRows(3, true), 9);
});
