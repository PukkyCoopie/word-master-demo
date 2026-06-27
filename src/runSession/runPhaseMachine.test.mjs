import test from "node:test";
import assert from "node:assert/strict";
import {
  RUN_TRANSIENT_PHASES,
  RUN_PERSISTED_PHASES,
  resolvePersistedRunSavePhase,
  resolveRunPhaseId,
  isRunFlowOverlayOpen,
  isBlockingPauseOpen,
  canSubmitWord,
  canOpenShop,
  canPause,
  computeRunSaveIdle,
  buildRunPhaseSnapshot,
  canTransitionPersistedPhase,
  createRunPhaseMachine,
} from "./runPhaseMachine.js";

/** @returns {import('./runPhaseMachine.js').RunPhaseMachineInput} */
function baseInput(overrides = {}) {
  return {
    showShop: false,
    showSettlement: false,
    showRunEnd: false,
    showPauseOptions: false,
    showDeveloperOptions: false,
    runEndOutcome: "fail",
    transitionBusy: false,
    shopOverlayLayersSuppressed: false,
    scoringAnimating: false,
    gridRefillAnimating: false,
    submitWordBusy: false,
    shopUpgradeAnimating: false,
    dictionaryReady: true,
    resolvedWordForSubmitReady: true,
    remainingWords: 3,
    firstWordTutorialBlocking: false,
    firstWordTutorialPhase: "",
    isFirstWordTutorialBlockingInput: false,
    flyingLettersCount: 0,
    flyingBackBatchesCount: 0,
    packPickSessionOpen: false,
    spellTargetOpen: false,
    ...overrides,
  };
}

test("RUN_TRANSIENT_PHASES and RUN_PERSISTED_PHASES are disjoint persisted sets", () => {
  assert.equal(RUN_TRANSIENT_PHASES.length, 4);
  assert.equal(RUN_PERSISTED_PHASES.length, 5);
  for (const t of RUN_TRANSIENT_PHASES) {
    assert.equal(RUN_PERSISTED_PHASES.includes(t), false);
  }
});

test("resolvePersistedRunSavePhase matches serializeRunSave overlay priority", () => {
  assert.equal(resolvePersistedRunSavePhase(baseInput()), "playing");
  assert.equal(resolvePersistedRunSavePhase(baseInput({ showShop: true })), "shop");
  assert.equal(resolvePersistedRunSavePhase(baseInput({ showSettlement: true })), "settlement");
  assert.equal(
    resolvePersistedRunSavePhase(baseInput({ showRunEnd: true, runEndOutcome: "win" })),
    "run_end_win",
  );
  assert.equal(
    resolvePersistedRunSavePhase(baseInput({ showRunEnd: true, runEndOutcome: "fail" })),
    "run_end_fail",
  );
  assert.equal(
    resolvePersistedRunSavePhase(
      baseInput({ showRunEnd: true, showSettlement: true, runEndOutcome: "win" }),
    ),
    "run_end_win",
  );
});

test("resolveRunPhaseId includes transient phases during playing", () => {
  assert.equal(resolveRunPhaseId(baseInput({ submitWordBusy: true })), "scoring");
  assert.equal(resolveRunPhaseId(baseInput({ scoringAnimating: true })), "scoring");
  assert.equal(resolveRunPhaseId(baseInput({ gridRefillAnimating: true })), "grid_refill");
  assert.equal(resolveRunPhaseId(baseInput({ packPickSessionOpen: true })), "pack_pick");
  assert.equal(resolveRunPhaseId(baseInput({ spellTargetOpen: true })), "spell_target");
});

test("resolveRunPhaseId prefers pack/spell overlay while in shop", () => {
  assert.equal(
    resolveRunPhaseId(baseInput({ showShop: true, packPickSessionOpen: true })),
    "pack_pick",
  );
  assert.equal(
    resolveRunPhaseId(baseInput({ showShop: true, spellTargetOpen: true })),
    "spell_target",
  );
});

test("isRunFlowOverlayOpen and isBlockingPauseOpen", () => {
  assert.equal(isRunFlowOverlayOpen(baseInput()), false);
  assert.equal(isRunFlowOverlayOpen(baseInput({ showPauseOptions: true })), true);
  assert.equal(isBlockingPauseOpen(baseInput({ showSettlement: true })), true);
  assert.equal(isBlockingPauseOpen(baseInput({ showPauseOptions: true })), false);
});

test("canSubmitWord mirrors GamePanel gates", () => {
  assert.equal(canSubmitWord(baseInput()), true);
  assert.equal(canSubmitWord(baseInput({ showShop: true })), false);
  assert.equal(canSubmitWord(baseInput({ transitionBusy: true })), false);
  assert.equal(canSubmitWord(baseInput({ scoringAnimating: true })), false);
  assert.equal(canSubmitWord(baseInput({ remainingWords: 0 })), false);
  assert.equal(
    canSubmitWord(
      baseInput({
        remainingWords: 0,
        firstWordTutorialPhase: "retry",
      }),
    ),
    true,
  );
  assert.equal(
    canSubmitWord(
      baseInput({
        firstWordTutorialBlocking: true,
        firstWordTutorialPhase: "select",
      }),
    ),
    false,
  );
});

test("canOpenShop and canPause", () => {
  assert.equal(canOpenShop(baseInput({ showShop: true })), true);
  assert.equal(canOpenShop(baseInput({ showShop: true, shopUpgradeAnimating: true })), false);
  assert.equal(canPause(baseInput()), true);
  assert.equal(canPause(baseInput({ showShop: true })), true);
  assert.equal(canPause(baseInput({ isFirstWordTutorialBlockingInput: true })), false);
  assert.equal(canPause(baseInput({ showSettlement: true })), false);
  assert.equal(canPause(baseInput({ showPauseOptions: true })), false);
});

test("computeRunSaveIdle aligns with runSaveGuards idle snapshot", () => {
  assert.equal(computeRunSaveIdle(baseInput()), true);
  assert.equal(computeRunSaveIdle(baseInput({ transitionBusy: true })), false);
  assert.equal(computeRunSaveIdle(baseInput({ flyingLettersCount: 1 })), false);
  assert.equal(computeRunSaveIdle(baseInput({ flyingBackBatchesCount: 2 })), false);
  assert.equal(computeRunSaveIdle(baseInput({ submitWordBusy: true })), false);
});

test("buildRunPhaseSnapshot exposes guard callables", () => {
  const snap = buildRunPhaseSnapshot(baseInput({ showShop: true, transitionBusy: true }));
  assert.equal(snap.phaseId, "shop");
  assert.equal(snap.isShop, true);
  assert.equal(snap.isPlaying, false);
  assert.equal(snap.transitionBusy, true);
  assert.equal(snap.canOpenShop(), false);
  assert.equal(snap.canSubmitWord(), false);
});

test("canTransitionPersistedPhase documents settlement → shop path", () => {
  assert.equal(canTransitionPersistedPhase("playing", "settlement"), true);
  assert.equal(canTransitionPersistedPhase("settlement", "shop"), true);
  assert.equal(canTransitionPersistedPhase("shop", "playing"), true);
  assert.equal(canTransitionPersistedPhase("run_end_win", "playing"), false);
});

test("createRunPhaseMachine reads live input", () => {
  let shop = false;
  const machine = createRunPhaseMachine(() => baseInput({ showShop: shop }));
  assert.equal(machine.resolvePersistedPhase(), "playing");
  shop = true;
  assert.equal(machine.resolvePersistedPhase(), "shop");
  assert.equal(machine.canOpenShop(), true);
});
