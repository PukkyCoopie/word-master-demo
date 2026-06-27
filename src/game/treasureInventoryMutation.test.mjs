import assert from "node:assert/strict";
import test from "node:test";
import { planRandomTreasureGrant } from "./treasureInventoryMutation.js";

test("planRandomTreasureGrant returns placement and def when pool has candidates", () => {
  const result = planRandomTreasureGrant({
    rarityFilter: null,
    ownedIdSet: new Set(["1"]),
    shopTreasurePool: [
      { treasureId: "1", price: 3 },
      { treasureId: "2", price: 4 },
    ],
    buildTreasurePoolSnapshot: () => ({}),
    findPlacementIndex: () => 0,
    runRandom: () => 0,
    accessoryCropId: "crop",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slotIndex, 0);
    assert.equal(result.treasureDef.treasureId, "2");
    assert.equal(result.usedCrop, false);
  }
});

test("planRandomTreasureGrant fails when no empty slot", () => {
  const result = planRandomTreasureGrant({
    rarityFilter: null,
    ownedIdSet: new Set(),
    shopTreasurePool: [{ treasureId: "2", price: 4 }],
    buildTreasurePoolSnapshot: () => ({}),
    findPlacementIndex: () => -1,
    runRandom: () => 0,
    accessoryCropId: "crop",
  });
  assert.deepEqual(result, { ok: false, slotIndex: -1 });
});
