import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_67.js";

const BASE_CTX = {
  hookSource: "self",
  remainingWordsAfterSubmit: 0,
  currentScore: 100,
  handFinalScore: 50,
  targetScore: 999999,
  ownedSlotTreasureIds: ["67", "67"],
};

test("treasure_67：多持时仅最左槽自毁并 +3", async () => {
  let added = 0;
  let destroyedSlot = null;
  await treasureHooks.onSuccessfulWordSubmit({
    ...BASE_CTX,
    hookSlotIndex: 0,
    addRemainingWords: (n) => {
      added += n;
    },
    destroyTreasureSlotById: async (_id, slotIndex) => {
      destroyedSlot = slotIndex;
    },
  });
  assert.equal(added, 3);
  assert.equal(destroyedSlot, 0);

  added = 0;
  destroyedSlot = null;
  await treasureHooks.onSuccessfulWordSubmit({
    ...BASE_CTX,
    hookSlotIndex: 1,
    addRemainingWords: (n) => {
      added += n;
    },
    destroyTreasureSlotById: async (_id, slotIndex) => {
      destroyedSlot = slotIndex;
    },
  });
  assert.equal(added, 0);
  assert.equal(destroyedSlot, null);
});

test("treasure_67：仍有拼写次数或已达标时不触发", async () => {
  let destroyed = false;
  await treasureHooks.onSuccessfulWordSubmit({
    ...BASE_CTX,
    hookSlotIndex: 0,
    remainingWordsAfterSubmit: 1,
    destroyTreasureSlotById: async () => {
      destroyed = true;
    },
  });
  assert.equal(destroyed, false);

  await treasureHooks.onSuccessfulWordSubmit({
    ...BASE_CTX,
    hookSlotIndex: 0,
    targetScore: 100,
    destroyTreasureSlotById: async () => {
      destroyed = true;
    },
  });
  assert.equal(destroyed, false);
});

test("treasure_67：触发前校验槽位仍为本体金牌", async () => {
  let destroyed = false;
  await treasureHooks.onSuccessfulWordSubmit({
    ...BASE_CTX,
    hookSlotIndex: 0,
    getOwnedSlotTreasureIds: () => [null, "67"],
    destroyTreasureSlotById: async () => {
      destroyed = true;
    },
  });
  assert.equal(destroyed, false);
});
