import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySlotCareerStats } from "../save/runSaveSchema.js";
import {
  getFavoriteWords,
  isWordFavorited,
  normalizeWordFavoriteEntries,
  removeWordFavorite,
  toggleWordFavorite,
} from "./wordFavorites.js";

test("normalizeWordFavoriteEntries dedupes by lowercase word", () => {
  const out = normalizeWordFavoriteEntries([
    { word: "Hello", favoritedAt: 2, definitionLines: ["n. 你好"] },
    { word: "hello", favoritedAt: 5, definitionLines: ["vi. 喂"] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].word, "hello");
  assert.deepEqual(out[0].definitionLines, ["n. 你好"]);
});

test("toggleWordFavorite adds and removes favorites", () => {
  const career = createEmptySlotCareerStats();
  assert.equal(toggleWordFavorite(career, { word: "cat", definitionLines: ["n. 猫"] }), true);
  assert.equal(isWordFavorited(career, "CAT"), true);
  assert.equal(getFavoriteWords(career).length, 1);
  assert.equal(toggleWordFavorite(career, { word: "cat" }), false);
  assert.equal(isWordFavorited(career, "cat"), false);
  assert.deepEqual(getFavoriteWords(career), []);
});

test("toggleWordFavorite re-add after remove updates snapshot", () => {
  const career = createEmptySlotCareerStats();
  toggleWordFavorite(career, { word: "a", definitionLines: ["1"] });
  toggleWordFavorite(career, { word: "b", definitionLines: ["2"] });
  toggleWordFavorite(career, { word: "a" });
  toggleWordFavorite(career, { word: "a", definitionLines: ["new"] });
  const list = getFavoriteWords(career);
  assert.equal(list.length, 2);
  assert.equal(list[0].word, "a");
  assert.deepEqual(list[0].definitionLines, ["new"]);
});

test("removeWordFavorite removes existing entry", () => {
  const career = createEmptySlotCareerStats();
  toggleWordFavorite(career, { word: "dog", definitionLines: [] });
  assert.equal(removeWordFavorite(career, "dog"), true);
  assert.equal(removeWordFavorite(career, "dog"), false);
});
