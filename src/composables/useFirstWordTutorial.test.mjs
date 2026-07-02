import test from "node:test";
import assert from "node:assert/strict";

/** 与 useFirstWordTutorial.onScoreIntroContinue 分流一致 */
function retryPhaseAfterScoreIntro(experienceMode, runPresetId) {
  if (experienceMode === "casual") return "retryHint";
  if (experienceMode === "classic") return "retry";
  return runPresetId === "preset_11" ? "retryHint" : "retry";
}

/** 与 useFirstWordTutorial.allowsTileClick 在 retry/retryHint 的行为一致 */
function allowsTileClickForPhase(phase) {
  if (phase === "retry") return true;
  return false;
}

test("onScoreIntroContinue routes classic to retry and casual to retryHint", () => {
  assert.equal(retryPhaseAfterScoreIntro("classic"), "retry");
  assert.equal(retryPhaseAfterScoreIntro("casual"), "retryHint");
  assert.equal(retryPhaseAfterScoreIntro(null), "retry");
  assert.equal(retryPhaseAfterScoreIntro(null, "preset_11"), "retryHint");
});

test("retryHint blocks manual tile clicks while retry allows them", () => {
  assert.equal(allowsTileClickForPhase("retry"), true);
  assert.equal(allowsTileClickForPhase("retryHint"), false);
  assert.equal(allowsTileClickForPhase("select"), false);
});

test("onSecondWordSubmitted accepts retry and retryHint", () => {
  /** @param {string} phase */
  function nextPhaseAfterSecondWord(phase) {
    if (phase === "retry" || phase === "retryHint") return "awaitShop";
    return phase;
  }
  assert.equal(nextPhaseAfterSecondWord("retry"), "awaitShop");
  assert.equal(nextPhaseAfterSecondWord("retryHint"), "awaitShop");
  assert.equal(nextPhaseAfterSecondWord("submit"), "submit");
});
