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
