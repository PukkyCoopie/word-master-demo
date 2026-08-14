import assert from "node:assert/strict";
import {
  materializeTranslationWithPosPrefix,
  splitPosFieldTokens,
} from "./dictionary_pos_prefix.mjs";
import {
  collapseDuplicateLeadingPosPrefix,
  stripErroneousPosBeforeInflectionGloss,
  translationLineHasPosPrefix,
} from "../src/dictionary/translationPosPrefix.js";

assert.equal(materializeTranslationWithPosPrefix("赫拉德茨", "n"), "n. 赫拉德茨");
assert.equal(
  materializeTranslationWithPosPrefix("[计] 机构记帐控制系统", "n"),
  "n. [计] 机构记帐控制系统",
);
assert.equal(materializeTranslationWithPosPrefix("n. 猫", "n"), "n. 猫");
assert.equal(
  materializeTranslationWithPosPrefix("foo\nv. bar", "n|v"),
  "n. foo\\nv. bar",
);
assert.equal(
  materializeTranslationWithPosPrefix("foo\nbar", "n|v"),
  "n. foo\\nv. bar",
);
assert.equal(
  materializeTranslationWithPosPrefix("foo\\nbar", "n|v"),
  "n. foo\\nv. bar",
);
assert.equal(
  materializeTranslationWithPosPrefix("(bane 的复数) n. 祸根, 毒药", "n"),
  "(bane 的复数) n. 祸根, 毒药",
);
assert.equal(
  materializeTranslationWithPosPrefix("n. (bane 的复数) n. 祸根, 毒药", "n"),
  "(bane 的复数) n. 祸根, 毒药",
);
assert.equal(translationLineHasPosPrefix("  vi. 呕吐"), true);
assert.equal(translationLineHasPosPrefix("(bane 的复数) n. 祸根"), true);
assert.deepEqual(splitPosFieldTokens("n|v"), ["n", "v"]);
assert.equal(
  collapseDuplicateLeadingPosPrefix("n. n. 祸根, 毒药"),
  "n. 祸根, 毒药",
);
assert.equal(
  stripErroneousPosBeforeInflectionGloss("n. (bane 的复数) n. 祸根"),
  "(bane 的复数) n. 祸根",
);

console.log("dictionary_pos_prefix.test.mjs: ok");
