import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateOxBossHit,
  evaluateOxBossHitWithPostSubmitLength,
  pickCrimsonDisabledTreasureSlotIndex,
  pickHookBossDebuffTargets,
  isFlintBossActive,
  resolveUniqueMostSpellLength,
  evaluateOxBossViolationPreview,
  resolvePostSubmitAppendBookkeepingLen,
  resolveArmBossDowngradeLen,
  applyDisabledTreasureSlots,
  isTreasureIdDisabledForSubmit,
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

test("报纸公牛：任一侧避开最常长度则不归零", () => {
  const counts = { 3: 1, 5: 2, 7: 1 };
  assert.equal(evaluateOxBossHitWithPostSubmitLength(5, 5, counts), true);
  assert.equal(evaluateOxBossHitWithPostSubmitLength(5, 6, counts), false);
  assert.equal(evaluateOxBossHitWithPostSubmitLength(4, 5, counts), false);
  assert.equal(evaluateOxBossHitWithPostSubmitLength(4, 4, counts), false);
});

test("evaluateOxBossViolationPreview：报纸两侧取有利", () => {
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
  assert.equal(
    evaluateOxBossViolationPreview({ ...base, judgedLen: 6, baseJudgedLen: 5 }),
    false,
  );
  assert.equal(
    evaluateOxBossViolationPreview({ ...base, judgedLen: 5, baseJudgedLen: 4 }),
    false,
  );
});

test("报纸记账词长：灵媒原词已通过则记原长", () => {
  const len = resolvePostSubmitAppendBookkeepingLen({
    slug: "the_psychic",
    baseWordLen: 5,
    finalWordLen: 6,
    resolvedWord: "apple",
    getWordDefinition: () => null,
    usedLengthsThisLevel: new Set(),
    mouthLockedLength: null,
    clubRequiredKey: null,
  });
  assert.equal(len, 5);
});

test("报纸记账词长：灵媒救回则记最终长", () => {
  const len = resolvePostSubmitAppendBookkeepingLen({
    slug: "the_psychic",
    baseWordLen: 4,
    finalWordLen: 5,
    resolvedWord: "cats",
    getWordDefinition: () => null,
    usedLengthsThisLevel: new Set(),
    mouthLockedLength: null,
    clubRequiredKey: null,
  });
  assert.equal(len, 5);
});

test("报纸记账词长：公牛记原长", () => {
  const len = resolvePostSubmitAppendBookkeepingLen({
    slug: "the_ox",
    baseWordLen: 5,
    finalWordLen: 6,
    resolvedWord: "apple",
    getWordDefinition: () => null,
    usedLengthsThisLevel: new Set(),
    mouthLockedLength: null,
    clubRequiredKey: null,
  });
  assert.equal(len, 5);
});

test("胳膊降级：优先伤更轻的一侧", () => {
  assert.equal(resolveArmBossDowngradeLen(4, 5, { 4: 1, 5: 3 }), 4);
  assert.equal(resolveArmBossDowngradeLen(4, 5, { 4: 4, 5: 1 }), 5);
  assert.equal(resolveArmBossDowngradeLen(5, 5, { 5: 2 }), 5);
});

test("pickCrimsonDisabledTreasureSlotIndex returns filled index", () => {
  const ix = pickCrimsonDisabledTreasureSlotIndex(
    [{ treasureId: "1" }, null, { treasureId: "2" }],
    () => 0,
  );
  assert.equal(ix, 0);
});

test("applyDisabledTreasureSlots nulls disabled indices only", () => {
  assert.deepEqual(applyDisabledTreasureSlots(["50", "76", "1"], new Set([1])), ["50", null, "1"]);
  assert.deepEqual(applyDisabledTreasureSlots(["50", "76"], null), ["50", "76"]);
});

test("isTreasureIdDisabledForSubmit matches slot treasure id", () => {
  const slots = ["50", "76", "1"];
  assert.equal(isTreasureIdDisabledForSubmit(slots, new Set([1]), "76"), true);
  assert.equal(isTreasureIdDisabledForSubmit(slots, new Set([1]), "50"), false);
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
