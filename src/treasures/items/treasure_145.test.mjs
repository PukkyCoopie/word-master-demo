import test from "node:test";
import assert from "node:assert/strict";
import {
  BOW_ARROW_LENGTH_BONUS_PER_LETTER,
  BOW_ARROW_REPLAY_COUNT,
  countBowArrowXyzLetters,
  isBowArrowXyzLetter,
  treasureHooks,
} from "./treasure_145.js";

test("isBowArrowXyzLetter：仅 X/Y/Z", () => {
  assert.equal(isBowArrowXyzLetter("x"), true);
  assert.equal(isBowArrowXyzLetter("Y"), true);
  assert.equal(isBowArrowXyzLetter("z"), true);
  assert.equal(isBowArrowXyzLetter("a"), false);
});

test("countBowArrowXyzLetters：happy +3，sexy +6", () => {
  assert.equal(
    countBowArrowXyzLetters({ resolvedWord: "happy" }),
    1,
  );
  assert.equal(
    countBowArrowXyzLetters({ resolvedWord: "sexy" }),
    2,
  );
  assert.equal(
    countBowArrowXyzLetters({
      tiles: [{ letter: "h" }, { letter: "a" }, { letter: "p" }, { letter: "p" }, { letter: "y" }],
      resolvedWord: "happy",
    }),
    1,
  );
});

test("countBowArrowXyzLetters：有 resolvedWord 时按整词（万能 ?、嘴邻位展示字母）", () => {
  assert.equal(
    countBowArrowXyzLetters({
      tiles: [{ letter: "b" }, { letter: "?" }, { letter: "x" }],
      resolvedWord: "box",
    }),
    1,
  );
  assert.equal(
    countBowArrowXyzLetters({
      tiles: [{ letter: "b" }, { letter: "a" }, { letter: "i" }],
      resolvedWord: "bay",
    }),
    1,
  );
});

test("getSubmitScoringWordLetterCountBonus：每个 XYZ +3 长度", () => {
  assert.equal(
    treasureHooks.getSubmitScoringWordLetterCountBonus?.({ resolvedWord: "happy" }),
    BOW_ARROW_LENGTH_BONUS_PER_LETTER,
  );
  assert.equal(
    treasureHooks.getSubmitScoringWordLetterCountBonus?.({ resolvedWord: "sexy" }),
    BOW_ARROW_LENGTH_BONUS_PER_LETTER * 2,
  );
  assert.equal(
    treasureHooks.getSubmitScoringWordLetterCountBonus?.({ resolvedWord: "cat" }),
    0,
  );
});

test("getLetterReplayCountForLetter：XYZ 额外 3 次", () => {
  assert.equal(
    treasureHooks.getLetterReplayCountForLetter?.({}, { letter: "y" }, 4),
    BOW_ARROW_REPLAY_COUNT,
  );
  assert.equal(
    treasureHooks.getLetterReplayCountForLetter?.({}, { letter: "a" }, 0),
    0,
  );
  assert.equal(
    treasureHooks.getLetterReplayCountForLetter?.({}, { letter: "?" }, 1),
    0,
  );
});
