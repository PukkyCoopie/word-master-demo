import test from "node:test";
import assert from "node:assert/strict";
import {
  ICE_MATERIAL_SHATTER_PROB_DEN,
  ICE_MATERIAL_SHATTER_PROB_NUM,
} from "./iceMaterialScoring.js";
import { rollProbabilitySuccess } from "../treasures/treasureProbability.js";

test("碎冰概率：基础 1/4，持有彗星时翻倍", () => {
  assert.equal(
    rollProbabilitySuccess(
      ICE_MATERIAL_SHATTER_PROB_NUM,
      ICE_MATERIAL_SHATTER_PROB_DEN,
      () => 0.3,
      [],
    ),
    false,
  );
  assert.equal(
    rollProbabilitySuccess(
      ICE_MATERIAL_SHATTER_PROB_NUM,
      ICE_MATERIAL_SHATTER_PROB_DEN,
      () => 0.3,
      ["45"],
    ),
    true,
  );
});
