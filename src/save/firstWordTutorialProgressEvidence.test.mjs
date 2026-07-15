import test from "node:test";
import assert from "node:assert/strict";
import { RUN_START_LEVEL_INDEX } from "../levelDefinitions.js";
import { createEmptySlotCareerStats } from "./runSaveSchema.js";
import {
  careerShowsPastFirstWordTutorial,
  slotHasPastFirstWordTutorialEvidence,
} from "./firstWordTutorialProgressEvidence.js";

test("empty career is not past tutorial", () => {
  assert.equal(careerShowsPastFirstWordTutorial(createEmptySlotCareerStats()), false);
  assert.equal(careerShowsPastFirstWordTutorial(null), false);
});

test("career word/letter totals imply past tutorial", () => {
  const career = createEmptySlotCareerStats();
  career.totalLettersUsed = 4;
  assert.equal(careerShowsPastFirstWordTutorial(career), true);
});

test("maxLevel past start implies past tutorial", () => {
  const career = createEmptySlotCareerStats();
  career.maxLevelIndexReached = RUN_START_LEVEL_INDEX;
  assert.equal(careerShowsPastFirstWordTutorial(career), false);
  career.maxLevelIndexReached = RUN_START_LEVEL_INDEX + 1;
  assert.equal(careerShowsPastFirstWordTutorial(career), true);
});

test("runsStarted alone does not imply past tutorial", () => {
  const career = createEmptySlotCareerStats();
  career.runsStarted = 3;
  assert.equal(careerShowsPastFirstWordTutorial(career), false);
});

test("slot evidence uses meaningful payload", () => {
  const emptyCareer = createEmptySlotCareerStats();
  assert.equal(
    slotHasPastFirstWordTutorialEvidence(0, {
      getSlotCareer: () => emptyCareer,
      getSlotPayload: () => ({
        phase: "playing",
        levelIndex: RUN_START_LEVEL_INDEX,
        runMatchStats: { wordsSubmitted: 0 },
        spellCastHistory: [],
        achievementRunState: {
          wordsPerLevelId: {},
          interestEarnedTotal: 0,
          moneySpentTotal: 0,
          discardUsesCount: 0,
        },
      }),
    }),
    false,
  );
  assert.equal(
    slotHasPastFirstWordTutorialEvidence(0, {
      getSlotCareer: () => emptyCareer,
      getSlotPayload: () => ({
        phase: "playing",
        levelIndex: RUN_START_LEVEL_INDEX,
        runMatchStats: { wordsSubmitted: 2 },
        spellCastHistory: [],
        achievementRunState: {
          wordsPerLevelId: {},
          interestEarnedTotal: 0,
          moneySpentTotal: 0,
          discardUsesCount: 0,
        },
      }),
    }),
    true,
  );
});
