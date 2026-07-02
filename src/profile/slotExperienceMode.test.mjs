import test from "node:test";
import assert from "node:assert/strict";
import { RUN_PRESET_DEFINITIONS } from "../game/runPresetDefinitions.js";
import { normalizeWordHintMode } from "../settings/wordHintMode.js";
import {
  CLASSIC_EXPERIENCE_PRESET_ID,
  CASUAL_EXPERIENCE_PRESET_ID,
  wordHintModeForExperienceMode,
  wordDefinitionModeForExperienceMode,
  presetIdForExperienceMode,
  normalizeSlotExperienceMode,
} from "./slotExperienceModePure.js";

test("experience preset ids exist in run preset catalog", () => {
  const ids = new Set(RUN_PRESET_DEFINITIONS.map((p) => p.id));
  assert.equal(ids.has(CLASSIC_EXPERIENCE_PRESET_ID), true);
  assert.equal(ids.has(CASUAL_EXPERIENCE_PRESET_ID), true);
});

test("wordHintModeForExperienceMode maps classic/casual to ripple/autoSelect", () => {
  assert.equal(wordHintModeForExperienceMode("classic"), "ripple");
  assert.equal(wordHintModeForExperienceMode("casual"), "autoSelect");
  assert.equal(normalizeWordHintMode(wordHintModeForExperienceMode("classic")), "ripple");
  assert.equal(normalizeWordHintMode(wordHintModeForExperienceMode("casual")), "autoSelect");
});

test("wordDefinitionModeForExperienceMode maps classic to button and casual to definition", () => {
  assert.equal(wordDefinitionModeForExperienceMode("classic"), "button");
  assert.equal(wordDefinitionModeForExperienceMode("casual"), "definition");
});

test("presetIdForExperienceMode maps to preset_01 / preset_11", () => {
  assert.equal(presetIdForExperienceMode("classic"), CLASSIC_EXPERIENCE_PRESET_ID);
  assert.equal(presetIdForExperienceMode("casual"), CASUAL_EXPERIENCE_PRESET_ID);
  assert.equal(presetIdForExperienceMode("classic"), "preset_01");
  assert.equal(presetIdForExperienceMode("casual"), "preset_11");
});

test("normalizeSlotExperienceMode rejects unknown values", () => {
  assert.equal(normalizeSlotExperienceMode("classic"), "classic");
  assert.equal(normalizeSlotExperienceMode("casual"), "casual");
  assert.equal(normalizeSlotExperienceMode("other"), null);
  assert.equal(normalizeSlotExperienceMode(null), null);
});
