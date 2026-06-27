import assert from "node:assert/strict";
import {
  applyLetterQModeToGrid,
  resolveLetterFromRaw,
  resolveQFamilyTileLetterForMode,
} from "./letterQ.js";

function makeQTile(letter, raw = "q") {
  return {
    letter,
    _deckCard: { raw, rarity: "common" },
  };
}

{
  const tile = makeQTile("Q");
  assert.equal(resolveQFamilyTileLetterForMode(tile, "qu"), "Qu");
  assert.equal(resolveQFamilyTileLetterForMode(tile, "q"), "Q");
}

{
  const tile = makeQTile("Qu");
  assert.equal(resolveQFamilyTileLetterForMode(tile, "q"), "Q");
}

{
  const grid = [[makeQTile("Q"), makeQTile("A", "a")], [makeQTile("Q"), null]];
  const updated = applyLetterQModeToGrid(grid, 2, 2, "qu");
  assert.equal(updated, 2);
  assert.equal(grid[0][0].letter, "Qu");
  assert.equal(grid[0][1].letter, "A");
  assert.equal(grid[1][0].letter, "Qu");
}

{
  const grid = [[makeQTile("Qu")]];
  applyLetterQModeToGrid(grid, 1, 1, "q");
  assert.equal(grid[0][0].letter, "Q");
  assert.equal(resolveLetterFromRaw("q", "q"), "Q");
  assert.equal(resolveLetterFromRaw("q", "qu"), "Qu");
}

console.log("letterQ.test.mjs ok");
