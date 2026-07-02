import test from "node:test";
import assert from "node:assert/strict";
import {
  TUTORIAL_GAME_LETTER_PLACEMENTS,
  buildTutorialGameHintPick,
  resolveCasualTutorialExperience,
  shouldApplyTutorialGameRefillAfterPlay,
  shouldShowWordDefinitionDuringTutorial,
} from "./firstWordTutorialCasualFlow.js";

test("shouldApplyTutorialGameRefillAfterPlay only for casual scoring phase", () => {
  assert.equal(shouldApplyTutorialGameRefillAfterPlay("scoring", "casual"), true);
  assert.equal(shouldApplyTutorialGameRefillAfterPlay("scoring", "classic"), false);
  assert.equal(shouldApplyTutorialGameRefillAfterPlay("retryHint", "casual"), false);
  assert.equal(shouldApplyTutorialGameRefillAfterPlay("scoring", null), false);
  assert.equal(shouldApplyTutorialGameRefillAfterPlay("scoring", null, "preset_11"), true);
});

test("resolveCasualTutorialExperience falls back to礼花筒 preset", () => {
  assert.equal(resolveCasualTutorialExperience(null, "preset_11"), true);
  assert.equal(resolveCasualTutorialExperience(null, "preset_01"), false);
});

test("shouldShowWordDefinitionDuringTutorial only for casual retryHint", () => {
  assert.equal(shouldShowWordDefinitionDuringTutorial("retryHint", "casual"), true);
  assert.equal(shouldShowWordDefinitionDuringTutorial("retryHint", "classic"), false);
  assert.equal(shouldShowWordDefinitionDuringTutorial("retry", "casual"), false);
  assert.equal(shouldShowWordDefinitionDuringTutorial("scoreIntro", "casual"), false);
});

test("buildTutorialGameHintPick spells game along tutorial placements", () => {
  const pick = buildTutorialGameHintPick();
  assert.equal(pick.word, "game");
  assert.equal(pick.path.length, 4);
  assert.deepEqual(
    pick.path,
    TUTORIAL_GAME_LETTER_PLACEMENTS.map(({ row, col }) => ({ row, col })),
  );
  const letters = TUTORIAL_GAME_LETTER_PLACEMENTS.map((p) => p.letter).join("");
  assert.equal(letters, "game");
});
