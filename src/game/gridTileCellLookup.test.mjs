import test from "node:test";
import assert from "node:assert/strict";
import { findGridCellByTileId } from "./gridTileCellLookup.js";

test("findGridCellByTileId: returns landed cell after logical move", () => {
  const grid = [
    [null, { id: "b", letter: "B" }],
    [{ id: "a", letter: "A" }, null],
  ];
  assert.deepEqual(findGridCellByTileId(grid, "a", 2, 2), { row: 1, col: 0 });
  assert.deepEqual(findGridCellByTileId(grid, "b", 2, 2), { row: 0, col: 1 });
});

test("findGridCellByTileId: missing id returns null", () => {
  const grid = [[{ id: "a", letter: "A" }]];
  assert.equal(findGridCellByTileId(grid, "z", 1, 1), null);
  assert.equal(findGridCellByTileId(null, "a", 1, 1), null);
});
