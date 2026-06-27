import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBossWildcardResolveContext,
  buildEffectiveWordPartsForSubmit,
  createSubmitWordResolver,
  gridTileWithInFlightPresentation,
  listEffectiveTilesForSubmit,
  previewBossSoftWordViolation,
  resolveSubmitWordInput,
} from "./submitWordPipeline.js";

test("gridTileWithInFlightPresentation: overrides letter when fly differs", () => {
  const tile = { letter: "?", rarity: "common", id: 1 };
  const fly = { letter: "a", rarity: "rare" };
  const out = gridTileWithInFlightPresentation(tile, fly);
  assert.equal(out.letter, "a");
  assert.equal(out.rarity, "rare");
});

test("listEffectiveTilesForSubmit: flying back truncates slots", () => {
  const t0 = { id: 0, letter: "c" };
  const t1 = { id: 1, letter: "a" };
  const t2 = { id: 2, letter: "t" };
  const tiles = listEffectiveTilesForSubmit({
    selectedTiles: [{ tile: t0 }, { tile: t1 }, { tile: t2 }],
    flyingBackBatches: [{ slotIndex: 2 }],
    flyingLetters: [],
    grid: [],
  });
  assert.deepEqual(tiles, [t0, t1]);
});

test("buildEffectiveWordPartsForSubmit: joins letters and vowel mask", () => {
  const parts = buildEffectiveWordPartsForSubmit({
    selectedTiles: [{ tile: { letter: "c", _deckCard: { raw: "c" } } }],
    flyingBackBatches: [],
    flyingLetters: [],
    grid: [],
    ownedSlotTreasureIds: [],
  });
  assert.equal(parts.word, "c");
  assert.deepEqual(parts.vowelAltMask, [false]);
});

test("resolveSubmitWordInput: empty and invalid", () => {
  assert.deepEqual(resolveSubmitWordInput({ buildParts: () => ({ word: "" }), resolveWord: () => "x" }), {
    error: "empty",
  });
  assert.deepEqual(
    resolveSubmitWordInput({ buildParts: () => ({ word: "ab" }), resolveWord: () => null }),
    { error: "invalid" },
  );
});

test("resolveSubmitWordInput: success", () => {
  const hit = resolveSubmitWordInput({
    buildParts: () => ({ word: "cat", vowelAltMask: [false, false, false] }),
    resolveWord: () => "cat",
  });
  assert.equal(hit.resolvedWord, "cat");
  assert.equal(hit.wordPattern, "cat");
});

test("createSubmitWordResolver: memoizes within same frame key", () => {
  let calls = 0;
  const resolver = createSubmitWordResolver({
    resolveWordPattern: () => {
      calls += 1;
      return "cat";
    },
    resolveWordPatternWithMouthSubstitutions: () => null,
  });
  const parts = { word: "cat", vowelAltMask: [false, false, false] };
  const ctx = { ownedSlotTreasureIds: [], rarityLevelsByRarity: null, bossResolveContext: null };
  assert.equal(resolver.resolveWordFromEffectiveParts(parts, ctx), "cat");
  assert.equal(resolver.resolveWordFromEffectiveParts(parts, ctx), "cat");
  assert.equal(calls, 1);
  resolver.clearResolveMemo();
  assert.equal(resolver.resolveWordFromEffectiveParts(parts, ctx), "cat");
  assert.equal(calls, 2);
});

test("buildBossWildcardResolveContext: null when slug has no whole-word rule", () => {
  assert.equal(
    buildBossWildcardResolveContext({
      bossSlug: "the_serpent",
      ownedSlotTreasureIds: [],
      tiles: [],
    }),
    null,
  );
});

test("previewBossSoftWordViolation: psychic requires 5 letters", () => {
  const tiles = [{ letter: "a", rarity: "common" }];
  const violated = previewBossSoftWordViolation({
    bossSlug: "the_psychic",
    resolvedWord: "cat",
    tiles,
    ownedSlotTreasureIds: [],
    dictionaryReady: true,
    getWordDefinition: () => null,
    usedWordLengthsThisLevel: new Set(),
    mouthLockedLength: null,
    clubRequiredKey: "",
    getJudgedLengthTableLen: (n) => n,
  });
  assert.equal(violated, true);
});

test("previewBossSoftWordViolation: psychic passes at 5 judged len", () => {
  const tiles = [
    { letter: "a", rarity: "common" },
    { letter: "b", rarity: "common" },
    { letter: "c", rarity: "common" },
    { letter: "d", rarity: "common" },
    { letter: "e", rarity: "common" },
  ];
  const ok = previewBossSoftWordViolation({
    bossSlug: "the_psychic",
    resolvedWord: "abcde",
    tiles,
    ownedSlotTreasureIds: [],
    dictionaryReady: true,
    getWordDefinition: () => null,
    usedWordLengthsThisLevel: new Set(),
    mouthLockedLength: null,
    clubRequiredKey: "",
    getJudgedLengthTableLen: (n) => n,
  });
  assert.equal(ok, false);
});
