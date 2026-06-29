import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWordFromTilesAgainstResolved,
  resolveSubmittedWordForHooks,
} from "../../game/resolvedWordTileMapping.js";
import { treasureHooks } from "./treasure_51.js";

const STATION_TILES = [
  { letter: "s" },
  { letter: "t" },
  { letter: "a" },
  { letter: "t" },
  { letter: "i" },
  { letter: "o" },
  {
    letter: "?",
    isWildcard: true,
    materialId: "wildcard",
  },
];

test("resolveSubmittedWordForHooks：万能块仍为 ? 时按整词写回 station", () => {
  assert.equal(resolveSubmittedWordForHooks("station", STATION_TILES), "station");
  assert.equal(resolveSubmittedWordForHooks("", STATION_TILES), "statio?");
  assert.equal(
    resolveSubmittedWordForHooks("station", STATION_TILES.map((t) => ({ ...t }))),
    "station",
  );
});

test("buildWordFromTilesAgainstResolved：statio? 末位万能对齐 station", () => {
  assert.equal(buildWordFromTilesAgainstResolved(STATION_TILES, "station"), "station");
});

test("treasure_51：station（末位万能）在字母离场后触发随机释法", async () => {
  let granted = false;
  /** @type {(() => Promise<void>) | null} */
  let deferred = null;
  await treasureHooks.onSuccessfulWordSubmit({
    resolvedWord: "station",
    submittedScoringTiles: STATION_TILES,
    findOwnedTreasureSlotIndex: () => 0,
    registerSubmitAfterWordLeaveFx: (runner) => {
      deferred = runner;
    },
    requestInRunSpellGrant: async () => {
      granted = true;
    },
  });
  assert.equal(granted, false);
  assert.equal(typeof deferred, "function");
  await deferred();
  assert.equal(granted, true);
});

test("treasure_51：pattern 回退 statio? + 已解析末位 n 仍识别 -tion", async () => {
  let granted = false;
  const tilesResolved = [
    ...STATION_TILES.slice(0, -1),
    { ...STATION_TILES[6], letter: "n" },
  ];
  await treasureHooks.onSuccessfulWordSubmit({
    resolvedWord: "statio?",
    submittedScoringTiles: tilesResolved,
    findOwnedTreasureSlotIndex: () => 0,
    registerSubmitAfterWordLeaveFx: (runner) => {
      void runner();
    },
    requestInRunSpellGrant: async () => {
      granted = true;
    },
  });
  assert.equal(granted, true);
});

test("treasure_51：非 -tion 词不触发", async () => {
  let granted = false;
  await treasureHooks.onSuccessfulWordSubmit({
    resolvedWord: "train",
    submittedScoringTiles: [{ letter: "t" }, { letter: "r" }, { letter: "a" }, { letter: "i" }, { letter: "n" }],
    findOwnedTreasureSlotIndex: () => 0,
    registerSubmitAfterWordLeaveFx: (runner) => {
      void runner();
    },
    requestInRunSpellGrant: async () => {
      granted = true;
    },
  });
  assert.equal(granted, false);
});
