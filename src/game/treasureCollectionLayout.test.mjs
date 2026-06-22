import test from "node:test";
import assert from "node:assert/strict";
import {
  TREASURE_COLLECTION_CELL_MIN_RPX,
  TREASURE_COLLECTION_PANEL_WIDTH_RPX,
  computeCollectionGridContentHeightPx,
  measureCollectionGridLayout,
} from "./treasureCollectionLayout.js";

test("TREASURE_COLLECTION_CELL_MIN_RPX is bar reference min scaled by 125%", () => {
  assert.equal(TREASURE_COLLECTION_CELL_MIN_RPX, 93);
});

test("TREASURE_COLLECTION_PANEL_WIDTH_RPX matches game-container content width", () => {
  assert.equal(TREASURE_COLLECTION_PANEL_WIDTH_RPX, 722);
});

test("computeCollectionGridContentHeightPx is stable for partial last row", () => {
  const heightNine = computeCollectionGridContentHeightPx({
    areaWidthPx: 400,
    slotCount: 9,
    cellPx: 93,
    gapPx: 12,
  });
  const heightSix = computeCollectionGridContentHeightPx({
    areaWidthPx: 400,
    slotCount: 6,
    cellPx: 93,
    gapPx: 12,
  });
  assert.ok(heightNine > heightSix);
  assert.equal(
    computeCollectionGridContentHeightPx({
      areaWidthPx: 400,
      slotCount: 9,
      cellPx: 93,
      gapPx: 12,
    }),
    heightNine,
  );
});

test("measureCollectionGridLayout needsScroll only when content taller than area", () => {
  const base = {
    areaWidthPx: 400,
    areaHeightPx: 300,
    gapPx: 12,
    maxCellPx: 96,
    minCellPx: 93,
  };
  const fits = measureCollectionGridLayout({ ...base, slotCount: 4 });
  assert.equal(fits.needsScroll, false);

  const overflows = measureCollectionGridLayout({ ...base, slotCount: 40 });
  assert.equal(overflows.needsScroll, true);
  assert.equal(overflows.cellPx, 93);
});
