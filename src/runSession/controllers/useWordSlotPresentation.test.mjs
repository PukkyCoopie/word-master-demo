import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTilePresentationIndex,
  computeFlyBackTilePresentation,
} from "./useWordSlotPresentation.js";
import { VOWEL_SUBSTITUTE_TREASURE_ID } from "../../game/vowelNeighborSubstitute.js";

test("buildTilePresentationIndex: wildcard ? resolves from word", () => {
  const tile = {
    id: "wc1",
    letter: "?",
    rarity: "common",
    materialId: "wildcard",
    isWildcard: true,
  };
  const list = () => [tile];
  const owned = () => [VOWEL_SUBSTITUTE_TREASURE_ID];
  const byId = buildTilePresentationIndex("c", "?", null, list, owned);
  assert.equal(byId.get("wc1")?.letter, "C");
});

test("buildTilePresentationIndex: Qu deck raw uses q fragment length", () => {
  const tile = {
    id: "q1",
    letter: "Qu",
    rarity: "common",
    _deckCard: { raw: "qu", rarity: "common" },
  };
  const list = () => [tile];
  const owned = () => [VOWEL_SUBSTITUTE_TREASURE_ID];
  const byId = buildTilePresentationIndex("qu", "qu", null, list, owned);
  assert.ok(byId.has("q1"));
  assert.equal(byId.get("q1")?.letter, "Qu");
});

test("computeFlyBackTilePresentation: wildcard stays ?", () => {
  const pres = computeFlyBackTilePresentation(
    { letter: "?", rarity: "rare", materialId: "wildcard", isWildcard: true },
    () => [],
  );
  assert.equal(pres.letter, "?");
  assert.equal(pres.vowelGhostPrev, null);
});

test("buildTilePresentationIndex: mouth E displayed as I syncs to resolved E in tea", () => {
  const tile = {
    id: "e1",
    letter: "I",
    rarity: "common",
    _deckCard: { raw: "e", rarity: "common", vowelDisplayShift: 1 },
  };
  const list = () => [
    { id: "t1", letter: "T", _deckCard: { raw: "t" } },
    tile,
    { id: "a1", letter: "A", _deckCard: { raw: "a" } },
  ];
  const owned = () => [VOWEL_SUBSTITUTE_TREASURE_ID];
  const parts = {
    word: "tia",
    vowelAltMask: [false, true, true],
    quSlotMask: [false, false, false],
  };
  const byId = buildTilePresentationIndex("tea", "tia", null, list, owned, parts);
  const pres = byId.get("e1");
  assert.equal(pres?.letter, "E");
  assert.equal(pres?.vowelGhostPrev, "A");
  assert.equal(pres?.vowelGhostNext, "I");
});

test("computeFlyBackTilePresentation: natural E shift+1 showing I has E/O ghosts", () => {
  const pres = computeFlyBackTilePresentation(
    {
      letter: "I",
      rarity: "common",
      _deckCard: { raw: "e", rarity: "common", vowelDisplayShift: 1 },
    },
    () => [VOWEL_SUBSTITUTE_TREASURE_ID],
  );
  assert.equal(pres.letter, "I");
  assert.equal(pres.vowelGhostPrev, "E");
  assert.equal(pres.vowelGhostNext, "O");
});

test("computeFlyBackTilePresentation: vowel shift shows ghost slots", () => {
  const pres = computeFlyBackTilePresentation(
    {
      letter: "I",
      rarity: "common",
      _deckCard: { raw: "i", rarity: "common", vowelDisplayShift: 1 },
    },
    () => [VOWEL_SUBSTITUTE_TREASURE_ID],
  );
  assert.equal(pres.letter, "O");
  assert.ok(pres.vowelGhostPrev != null || pres.vowelGhostNext != null);
});
