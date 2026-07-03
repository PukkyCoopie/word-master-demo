import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rollTreasureLevelPosKey, TREASURE_LEVEL_POS_OPTIONS } from "./wordPosMatch.js";

describe("wordPosMatch", () => {
  it("rollTreasureLevelPosKey 无 exclude 时从三种词性中抽取", () => {
    const keys = new Set(TREASURE_LEVEL_POS_OPTIONS.map((o) => o.key));
    assert.equal(keys.size, 3);
    assert.equal(rollTreasureLevelPosKey(() => 0), "n");
    assert.equal(rollTreasureLevelPosKey(() => 0.34), "v");
    assert.equal(rollTreasureLevelPosKey(() => 0.67), "adj");
  });

  it("rollTreasureLevelPosKey exclude 后不会 roll 到上一词性", () => {
    for (const prev of ["n", "v", "adj"]) {
      for (let i = 0; i < 20; i += 1) {
        const next = rollTreasureLevelPosKey(() => i / 20, prev);
        assert.notEqual(next, prev);
      }
    }
  });
});
