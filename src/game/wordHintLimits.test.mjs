import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveHintMaxPerLevel, BASE_HINT_MAX_PER_LEVEL } from "./wordHintLimits.js";
import { RUN_PRESET_DEFINITIONS } from "./runPresetDefinitions.js";

describe("wordHintLimits", () => {
  it("基础每关 1 次", () => {
    assert.equal(resolveHintMaxPerLevel("preset_01"), 1);
  });

  it("礼花筒 preset_11 每关 +2", () => {
    assert.equal(resolveHintMaxPerLevel("preset_11"), 3);
  });

  it("礼花筒位于第 3 项且含提示加成", () => {
    assert.equal(RUN_PRESET_DEFINITIONS[2]?.id, "preset_11");
    assert.equal(RUN_PRESET_DEFINITIONS[2]?.effects?.hintsPerLevelDelta, 2);
    assert.equal(RUN_PRESET_DEFINITIONS[2]?.effects?.hintLengthWeightShift, 1);
    assert.equal(
      BASE_HINT_MAX_PER_LEVEL + (RUN_PRESET_DEFINITIONS[2]?.effects?.hintsPerLevelDelta ?? 0),
      3,
    );
  });
});
