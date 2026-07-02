import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collapseDuplicateLeadingPosPrefix,
  stripErroneousPosBeforeInflectionGloss,
  translationLineHasPosPrefix,
} from "./translationPosPrefix.js";

describe("translationPosPrefix", () => {
  it("识别行内已有词性", () => {
    assert.equal(translationLineHasPosPrefix("(bane 的复数) n. 祸根"), true);
    assert.equal(translationLineHasPosPrefix("赫拉德茨"), false);
  });

  it("合并重复行首词性", () => {
    assert.equal(collapseDuplicateLeadingPosPrefix("n. n. 祸根"), "n. 祸根");
    assert.equal(collapseDuplicateLeadingPosPrefix("n. 猫"), "n. 猫");
  });

  it("去掉屈折说明前误加词性", () => {
    assert.equal(
      stripErroneousPosBeforeInflectionGloss("n. (bane 的复数) n. 祸根, 毒药"),
      "(bane 的复数) n. 祸根, 毒药",
    );
  });

  it("去掉括号后合并重复行首词性", () => {
    let s = "n. (bane 的复数) n. 祸根, 毒药, 灭亡的原因, 灭亡";
    for (let i = 0; i < 12; i++) {
      const next = s.replace(/\([^()]*\)/g, "").replace(/（[^（）]*）/g, "");
      if (next === s) break;
      s = next;
    }
    s = s.replace(/\s{2,}/g, " ").trim();
    assert.equal(collapseDuplicateLeadingPosPrefix(s), "n. 祸根, 毒药, 灭亡的原因, 灭亡");
  });
});
