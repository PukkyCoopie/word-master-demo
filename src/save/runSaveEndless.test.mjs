import test from "node:test";
import assert from "node:assert/strict";
import { STANDARD_RUN_FINAL_LEVEL_INDEX } from "../levelDefinitions.js";
import { resolveSavedIsEndlessRun } from "./runSaveEndless.js";
import { isContinuableRunPhase } from "./runSaveSchema.js";
import { hasMeaningfulRunProgress } from "./runSaveMeaningfulProgress.js";
import { createRunMatchStats } from "../game/runMatchStats.js";

test("resolveSavedIsEndlessRun uses flag and legacy level index", () => {
  assert.equal(resolveSavedIsEndlessRun({ isEndlessRun: true, levelIndex: 0 }), true);
  assert.equal(
    resolveSavedIsEndlessRun({
      isEndlessRun: false,
      levelIndex: STANDARD_RUN_FINAL_LEVEL_INDEX + 1,
    }),
    true,
  );
  assert.equal(
    resolveSavedIsEndlessRun({
      isEndlessRun: false,
      levelIndex: STANDARD_RUN_FINAL_LEVEL_INDEX,
    }),
    false,
  );
});

test("endless in-progress run is continuable", () => {
  const stats = createRunMatchStats();
  stats.wordsSubmitted = 3;
  const payload = {
    phase: "playing",
    levelIndex: STANDARD_RUN_FINAL_LEVEL_INDEX + 2,
    isEndlessRun: true,
    runMatchStats: stats,
    spellCastHistory: [],
    achievementRunState: {
      wordsPerLevelId: {},
      interestEarnedTotal: 0,
      moneySpentTotal: 0,
      discardUsesCount: 0,
    },
  };
  assert.equal(hasMeaningfulRunProgress(payload), true);
  assert.equal(isContinuableRunPhase(payload.phase), true);
});

test("endless entry settlement snapshot is continuable", () => {
  const payload = {
    phase: "settlement",
    levelIndex: STANDARD_RUN_FINAL_LEVEL_INDEX,
    isEndlessRun: true,
    runMatchStats: createRunMatchStats(),
    spellCastHistory: [],
    achievementRunState: {
      wordsPerLevelId: {},
      interestEarnedTotal: 0,
      moneySpentTotal: 0,
      discardUsesCount: 0,
    },
  };
  assert.equal(hasMeaningfulRunProgress(payload), true);
  assert.equal(isContinuableRunPhase(payload.phase), true);
});
