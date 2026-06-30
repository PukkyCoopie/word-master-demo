import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateOxBossHit,
  pickCrimsonDisabledTreasureSlotIndex,
  pickHookBossDebuffTargets,
  isFlintBossActive,
  resolveUniqueMostSpellLength,
  evaluateOxBossViolationPreview,
} from "./bossMechanicsContext.js";

test("resolveUniqueMostSpellLength: unique winner", () => {
  assert.equal(resolveUniqueMostSpellLength({ 3: 1, 5: 2, 7: 1 }), 5);
});

test("resolveUniqueMostSpellLength: tie returns null", () => {
  assert.equal(resolveUniqueMostSpellLength({ 3: 2, 5: 2 }), null);
  assert.equal(resolveUniqueMostSpellLength({ 3: 1, 5: 2, 7: 2 }), null);
});

test("resolveUniqueMostSpellLength: empty returns null", () => {
  assert.equal(resolveUniqueMostSpellLength({}), null);
  assert.equal(resolveUniqueMostSpellLength(null), null);
});

test("evaluateOxBossHit picks unique mode length", () => {
  assert.equal(evaluateOxBossHit(5, { 3: 1, 5: 2, 7: 1 }), true);
  assert.equal(evaluateOxBossHit(7, { 3: 1, 5: 2, 7: 1 }), false);
  assert.equal(evaluateOxBossHit(5, { 3: 1, 5: 2, 7: 2 }), false);
  assert.equal(evaluateOxBossHit(3, { 3: 2, 5: 2 }), false);
});

test("evaluateOxBossViolationPreview mirrors hit when word ready", () => {
  const base = {
    dictionaryReady: true,
    slug: "the_ox",
    resolvedWord: "hello",
    effectiveWord: "hello",
    spellCountsByLength: { 3: 1, 5: 2, 7: 1 },
  };
  assert.equal(evaluateOxBossViolationPreview({ ...base, judgedLen: 5 }), true);
  assert.equal(evaluateOxBossViolationPreview({ ...base, judgedLen: 4 }), false);
  assert.equal(evaluateOxBossViolationPreview({ ...base, slug: "the_hook", judgedLen: 5 }), false);
  assert.equal(
    evaluateOxBossViolationPreview({ ...base, judgedLen: 5, dictionaryReady: false }),
    false,
  );
  assert.equal(
    evaluateOxBossViolationPreview({ ...base, judgedLen: 5, resolvedWord: null }),
    false,
  );
});

test("pickCrimsonDisabledTreasureSlotIndex returns filled index", () => {
  const ix = pickCrimsonDisabledTreasureSlotIndex(
    [{ treasureId: "1" }, null, { treasureId: "2" }],
    () => 0,
  );
  assert.equal(ix, 0);
});

test("pickHookBossDebuffTargets caps at four", () => {
  const grid = Array.from({ length: 2 }, () =>
    Array.from({ length: 3 }, () => ({ letter: "A" })),
  );
  const targets = pickHookBossDebuffTargets(grid, 2, 3, 4, () => 0.5);
  assert.equal(targets.length, 4);
});

test("isFlintBossActive", () => {
  assert.equal(isFlintBossActive("the_flint"), true);
  assert.equal(isFlintBossActive("the_hook"), false);
});
