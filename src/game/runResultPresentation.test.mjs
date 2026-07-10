import test from "node:test";
import assert from "node:assert/strict";
import {
  formatResultNum,
  formatMultDisplay,
  computeResultAreaJudgedWordLength,
  isResultFormulaBasePreviewActive,
  computePreviewFormulaScore,
  computePreviewFormulaMult,
} from "./runResultPresentation.js";

test("formatResultNum rounds finite numbers", () => {
  assert.equal(formatResultNum(1234.6), Math.round(1234.6).toLocaleString());
  assert.equal(formatResultNum("x"), "0");
});

test("formatMultDisplay prefers integers", () => {
  assert.equal(formatMultDisplay(3), "3");
  assert.equal(formatMultDisplay(3.5), "3.5");
});

test("computeResultAreaJudgedWordLength uses judged table", () => {
  const len = computeResultAreaJudgedWordLength({
    tiles: [{}],
    resolvedWord: "cat",
    getWordLetterCount: () => 3,
    judgedLengthTableLenForRun: (n, ctx) => n + (ctx?.resolvedWord === "cat" ? 1 : 0),
  });
  assert.equal(len, 4);
});

test("isResultFormulaBasePreviewActive respects boss soft violation", () => {
  assert.equal(
    isResultFormulaBasePreviewActive({
      tiles: [{}],
      bossSoftWordViolation: true,
      dictionaryReady: true,
      resolvedWord: "hi",
    }),
    false,
  );
  assert.equal(
    isResultFormulaBasePreviewActive({
      tiles: [{}],
      bossSoftWordViolation: false,
      dictionaryReady: true,
      resolvedWord: "hi",
    }),
    true,
  );
});

test("computePreviewFormulaScore scales for flint boss", () => {
  const score = computePreviewFormulaScore({
    judgedLen: 5,
    lengthLevelsByLength: { 5: 2 },
    lengthUpgradeObservatoryExtra: 0,
    isFlintBossActive: true,
    getWordLengthScoreForTableLen: () => 100,
    scaleLengthContributionForBoss: (v, flint) => (flint ? v / 2 : v),
  });
  assert.equal(score, 50);
});

test("computePreviewFormulaMult rounds scaled multiplier", () => {
  const mult = computePreviewFormulaMult({
    judgedLen: 5,
    lengthLevelsByLength: { 5: 2 },
    lengthUpgradeObservatoryExtra: 0,
    isFlintBossActive: false,
    getLengthMultiplier: () => 3.4,
    scaleLengthContributionForBoss: (v) => v,
  });
  assert.equal(mult, 3);
});
