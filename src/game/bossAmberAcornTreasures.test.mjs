import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFlipAndShuffleToOwnedTreasures,
  captureAmberBossTreasureSnapshot,
  restoreAmberBossTreasureLayout,
} from "./bossAmberAcornTreasures.js";

function slot(id) {
  return { treasureId: id };
}

test("applyFlipAndShuffleToOwnedTreasures reverses then shuffles filled treasures", () => {
  const slots = [slot("a"), slot("b"), slot("c"), null, null];
  const keys = ["k0", "k1", "k2", "k3", "k4"];
  const reversedOnly = applyFlipAndShuffleToOwnedTreasures(slots, keys, () => 0.99);
  const idsReversed = reversedOnly.slots.filter(Boolean).map((s) => s.treasureId);
  assert.deepEqual(idsReversed, ["c", "b", "a"]);

  let call = 0;
  const rng = () => {
    call += 1;
    return call === 1 ? 0.5 : 0.99;
  };
  const shuffled = applyFlipAndShuffleToOwnedTreasures(slots, keys, rng);
  const idsShuffled = shuffled.slots.filter(Boolean).map((s) => s.treasureId);
  assert.notDeepEqual(idsShuffled, ["a", "b", "c"]);
  assert.notDeepEqual(idsShuffled, ["c", "b", "a"]);
  assert.equal(shuffled.slots.filter(Boolean).length, 3);
  assert.deepEqual(shuffled.slots.slice(3), [null, null]);
});

test("restoreAmberBossTreasureLayout restores pre-amber order and drops destroyed", () => {
  const original = [slot("a"), slot("b"), slot("c"), null];
  const keys = ["k0", "k1", "k2", "k3"];
  const snapshot = captureAmberBossTreasureSnapshot(original, keys);

  const during = applyFlipAndShuffleToOwnedTreasures(original, keys, () => 0.5);
  const cIndex = during.keys.indexOf("k2");
  during.slots[cIndex] = null;

  const restored = restoreAmberBossTreasureLayout(during.slots, during.keys, snapshot);
  assert.deepEqual(
    restored.slots.map((s) => s?.treasureId ?? null),
    ["a", "b", null, null],
  );
  assert.deepEqual(restored.keys, keys);
});
