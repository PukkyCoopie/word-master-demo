import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_111.js";

const BASE_CTX = {
  hookSource: "self",
  hookSlotIndex: 0,
  ownedSlotTreasureIds: ["111", "111"],
  discardedLetters: [{ letter: "c" }, { letter: "a" }, { letter: "t" }],
  judgedWordLength: 3,
  resolveDiscardedWord: (w) => (w === "cat" ? { word: "cat" } : null),
  treasureRun: { levelFirstFullWordDiscardDone: false },
};

test("treasure_111：多持时由最左槽编排，全部 wobble 后合并阶梯升级", async () => {
  const wobbled = [];
  const bubbled = [];
  const staircaseLens = [];

  await treasureHooks.onDiscardBatch({
    ...BASE_CTX,
    playOwnedTreasureBubbleFxAtSlot: async (ix, text) => {
      wobbled.push(ix);
      bubbled.push({ ix, text });
    },
    buildInRunLengthUpgradeStep: (len) => ({
      payload: { upgradeKind: "length", lengthMin: len, lengthMax: len, beforeLevel: 2 },
      apply: () => {},
    }),
    runInRunUpgradeStaircasePlayback: async (steps) => {
      staircaseLens.push(steps.length);
    },
  });

  assert.deepEqual(wobbled, [0, 1]);
  assert.deepEqual(
    bubbled,
    [
      { ix: 0, text: "升级" },
      { ix: 1, text: "升级" },
    ],
  );
  assert.deepEqual(staircaseLens, [2]);
  assert.equal(BASE_CTX.treasureRun.levelFirstFullWordDiscardDone, true);

  wobbled.length = 0;
  await treasureHooks.onDiscardBatch({
    ...BASE_CTX,
    hookSlotIndex: 1,
    playOwnedTreasureBubbleFxAtSlot: async (ix) => {
      wobbled.push(ix);
    },
  });
  assert.deepEqual(wobbled, []);
});

test("treasure_111：非完整词或本关已触发时不执行", async () => {
  let ran = false;
  await treasureHooks.onDiscardBatch({
    ...BASE_CTX,
    resolveDiscardedWord: () => null,
    playOwnedTreasureBubbleFxAtSlot: async () => {
      ran = true;
    },
  });
  assert.equal(ran, false);

  await treasureHooks.onDiscardBatch({
    ...BASE_CTX,
    treasureRun: { levelFirstFullWordDiscardDone: true },
    playOwnedTreasureBubbleFxAtSlot: async () => {
      ran = true;
    },
  });
  assert.equal(ran, false);
});
