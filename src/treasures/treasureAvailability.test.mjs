import assert from "node:assert/strict";
import test from "node:test";
import {
  attachTreasurePoolDerivedStats,
  filterTreasureDefsForPool,
  isTreasureUnlocked,
} from "./treasureAvailability.js";

test("attachTreasurePoolDerivedStats 单次扫描牌库与已拥有槽位", () => {
  /** @type {import('./treasureAvailability.js').TreasurePoolSnapshot} */
  const snap = {
    deck: [
      { rarity: "common", materialId: "ice" },
      { rarity: "rare", materialId: "ice" },
      { rarity: "epic" },
      { rarity: "legendary", materialId: "gold", accessoryId: "coin" },
    ],
    ownedTreasureSlots: [
      { treasureId: "1", treasureAccessoryId: "flame" },
      { treasureId: "2", treasureAccessoryId: "" },
    ],
    isEndlessRun: false,
    runState: {},
  };

  const derived = attachTreasurePoolDerivedStats(snap);
  assert.equal(derived.deckLetterRarityCounts.common, 1);
  assert.equal(derived.deckLetterRarityCounts.rare, 1);
  assert.equal(derived.deckLetterRarityCounts.epic, 1);
  assert.equal(derived.deckLetterRarityCounts.legendary, 1);
  assert.equal(derived.deckMaterialCounts.ice, 2);
  assert.equal(derived.deckHasGoldCoinAccessory, true);
  assert.equal(derived.deckHalfOrMoreRare, false);
  assert.equal(derived.allOwnedTreasuresHaveAccessory, false);
  assert.equal(snap.derivedStats, derived);
});

test("isTreasureUnlocked 使用 derivedStats 与逐条扫描结果一致", () => {
  /** @type {import('./treasureAvailability.js').TreasurePoolSnapshot} */
  const snap = {
    deck: [
      { rarity: "epic" },
      { rarity: "epic" },
      { rarity: "legendary" },
    ],
    ownedTreasureSlots: [{ treasureId: "70", treasureAccessoryId: "flame" }],
    isEndlessRun: true,
    runState: { runSpellsCastCount: 5 },
  };
  attachTreasurePoolDerivedStats(snap);

  assert.equal(
    isTreasureUnlocked({ unlockPrerequisite: { type: "deckEpicMin", min: 2 } }, snap),
    true,
  );
  assert.equal(isTreasureUnlocked({ unlockPrerequisite: { type: "endlessMode" } }, snap), true);
  assert.equal(
    isTreasureUnlocked({ unlockPrerequisite: { type: "runSpellsCastMin", min: 3 } }, snap),
    true,
  );
});

test("filterTreasureDefsForPool 在同 snap 上复用 derivedStats", () => {
  /** @type {import('./treasureAvailability.js').TreasurePoolSnapshot} */
  const snap = {
    deck: [{ rarity: "common" }],
    ownedTreasureSlots: [],
    isEndlessRun: false,
    runState: {},
  };
  const defs = [
    { treasureId: "a", unlockPrerequisite: { type: "deckAllCommon" } },
    { treasureId: "b", unlockPrerequisite: { type: "deckEpicMin", min: 1 } },
  ];
  const filtered = filterTreasureDefsForPool(defs, snap);
  assert.deepEqual(
    filtered.map((d) => d.treasureId),
    ["a"],
  );
  assert.ok(snap.derivedStats);
});
