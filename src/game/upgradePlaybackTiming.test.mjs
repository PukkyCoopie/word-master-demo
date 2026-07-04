import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveScoringTriggeredUpgradeLocalSpeed,
  setSubmitScoringBeatSpeedSnapshot,
  resetSubmitScoringBeatSpeedSnapshot,
  getSubmitScoringTriggeredUpgradeLocalSpeed,
} from "./upgradePlaybackSpeed.js";

test("resolveScoringTriggeredUpgradeLocalSpeed inherits half of extra timeline speed", () => {
  assert.equal(resolveScoringTriggeredUpgradeLocalSpeed(1), 1);
  assert.equal(resolveScoringTriggeredUpgradeLocalSpeed(3), 2);
  assert.equal(resolveScoringTriggeredUpgradeLocalSpeed(1.5), 1.25);
});

test("submit scoring snapshot drives getSubmitScoringTriggeredUpgradeLocalSpeed", () => {
  resetSubmitScoringBeatSpeedSnapshot();
  assert.equal(getSubmitScoringTriggeredUpgradeLocalSpeed(), 1);
  setSubmitScoringBeatSpeedSnapshot(3);
  assert.equal(getSubmitScoringTriggeredUpgradeLocalSpeed(), 2);
  resetSubmitScoringBeatSpeedSnapshot();
  assert.equal(getSubmitScoringTriggeredUpgradeLocalSpeed(), 1);
});
