import test from "node:test";
import assert from "node:assert/strict";
import { buildSlotIndexByLength } from "./dictionarySlotIndex.js";
import {
  buildMouthQuSlotConstraints,
  collectMouthQuSlotWordIdGroups,
  listQuExpandMasksForExtra,
  matchWordIdsForMouthQuSlotExpansion,
} from "./mouthQuSlotDictionaryIndex.js";
import { letterSubstituteNeighborTrio } from "../game/vowelNeighborSubstitute.js";

const OWNED_MOUTH_TUBE = ["95", "30"];

/** @param {string[]} words */
function indexFor(words) {
  const byLength = new Map();
  for (const w of words) {
    const len = w.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(w);
  }
  return buildSlotIndexByLength(byLength);
}

/** @param {string} pattern @param {boolean[]} vowelAltMask */
function buildTrios(pattern, vowelAltMask, owned) {
  return vowelAltMask.map((on, i) =>
    on ? letterSubstituteNeighborTrio(pattern[i], owned) : null,
  );
}

test("listQuExpandMasksForExtra: one qu slot", () => {
  const masks0 = listQuExpandMasksForExtra([true, false, false], 0);
  assert.equal(masks0.length, 1);
  assert.deepEqual(masks0[0], [false, false, false]);

  const masks1 = listQuExpandMasksForExtra([true, false, false], 1);
  assert.equal(masks1.length, 1);
  assert.deepEqual(masks1[0], [true, false, false]);
});

test("buildMouthQuSlotConstraints: walk ends at candidate length", () => {
  const slotMaps = indexFor(["quarter"]);
  const lengthIndex = slotMaps.get(7);
  assert.ok(lengthIndex);
  const constraints = buildMouthQuSlotConstraints(
    lengthIndex,
    "qarter",
    [true, false, false, false, false, false],
    [null, null, null, null, null, null],
    [true, false, false, false, false, false],
    "?",
    7,
  );
  assert.ok(constraints);
  assert.equal(constraints.length, 7);
});

test("matchWordIdsForMouthQuSlotExpansion: quarter via qu expand", () => {
  const slotMaps = indexFor(["quarter", "qater", "problem"]);
  const pattern = "qarter";
  const quMask = [true, false, false, false, false, false];
  const trios = buildTrios(pattern, quMask.map(() => false), []);
  const expand = [true, false, false, false, false, false];
  const lengthIndex = slotMaps.get(7);
  assert.ok(lengthIndex);
  const ids = matchWordIdsForMouthQuSlotExpansion(
    lengthIndex,
    pattern,
    quMask,
    trios,
    expand,
  );
  assert.equal(ids.length, 1);
  assert.equal(lengthIndex.words[ids[0]], "quarter");
});

test("collectMouthQuSlotWordIdGroups: problem via tube+mouth on Qu", () => {
  const slotMaps = indexFor(["problem", "quarter", "problam"]);
  const pattern = "qroblem";
  const vowelAltMask = [true, false, false, false, false, false, false];
  const quMask = [true, false, false, false, false, false, false];
  const trios = buildTrios(pattern, vowelAltMask, OWNED_MOUTH_TUBE);
  const groups = collectMouthQuSlotWordIdGroups(slotMaps, pattern, quMask, trios, 1);
  assert.equal(groups.length, 1);
  const { lengthIndex, wordIds } = groups[0];
  assert.equal(lengthIndex.words[wordIds[0]], "problem");
});

console.log("mouthQuSlotDictionaryIndex tests ok");
