import test from "node:test";
import assert from "node:assert/strict";
import { applyRandomBLettersToGrid } from "./maskBubbleBlueprintScenario.js";

test("applyRandomBLettersToGrid 随机改 2 格为 B", () => {
  const grid = [
    [
      { letter: "A", _deckCard: { raw: "a" } },
      { letter: "C", _deckCard: { raw: "c" } },
    ],
    [
      { letter: "D", _deckCard: { raw: "d" } },
      { letter: "E", _deckCard: { raw: "e" } },
    ],
  ];
  const n = applyRandomBLettersToGrid(grid, 2, 2, () => 0, 2);
  assert.equal(n, 2);
  let bCount = 0;
  for (const row of grid) {
    for (const tile of row) {
      if (tile.letter === "B") {
        bCount += 1;
        assert.equal(tile._deckCard.raw, "b");
      }
    }
  }
  assert.equal(bCount, 2);
});
