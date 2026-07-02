import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HINT_LEXICAL_TIER,
  hintLexicalPickWeightFromTier,
  hintLexicalTierFromMaps,
  hintTranslationLineIsFallbackOnly,
  hintWordIsFallbackOnlyFromDefinition,
  isAbbrevOnlyWordInPosTags,
  translationLineContainsPersonNameLabel,
  translationZhLooksSpecialized,
  wordHasNormalPosInIndex,
} from "./dictionaryLexical.js";

describe("dictionaryLexical", () => {
  it("识别正常词性与缩写", () => {
    /** @type {Map<string, Set<string>>} */
    const posTags = new Map([
      ["cat", new Set(["n"])],
      ["cpu", new Set(["abbr"])],
      ["run", new Set(["abbr", "v"])],
    ]);
    assert.equal(wordHasNormalPosInIndex(posTags, null, "cat"), true);
    assert.equal(isAbbrevOnlyWordInPosTags(posTags, "cpu"), true);
    assert.equal(isAbbrevOnlyWordInPosTags(posTags, "run"), false);
    assert.equal(hintLexicalTierFromMaps("cat", posTags, null), HINT_LEXICAL_TIER.NORMAL_POS);
    assert.equal(hintLexicalTierFromMaps("cpu", posTags, null), HINT_LEXICAL_TIER.ABBR_ONLY);
    assert.equal(hintLexicalTierFromMaps("run", posTags, null), HINT_LEXICAL_TIER.NORMAL_POS);
  });

  it("无词性索引时 tier 为 NO_POS", () => {
    assert.equal(hintLexicalTierFromMaps("foo", null, null), HINT_LEXICAL_TIER.NO_POS);
    assert.equal(hintLexicalPickWeightFromTier(HINT_LEXICAL_TIER.NO_POS), 0.1);
    assert.equal(hintLexicalPickWeightFromTier(HINT_LEXICAL_TIER.ABBR_ONLY), 0.02);
  });

  it("释义含方括号视为专业词汇", () => {
    assert.equal(translationZhLooksSpecialized("[化]学"), true);
    assert.equal(translationZhLooksSpecialized("n. 猫"), false);
    assert.equal(hintLexicalPickWeightFromTier(HINT_LEXICAL_TIER.NORMAL_POS), 1);
  });

  it("提示兜底：按释义行判定，有一条正常义即可进正常池", () => {
    assert.equal(hintTranslationLineIsFallbackOnly("[化]学"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. 猫"), false);
    assert.equal(hintTranslationLineIsFallbackOnly("猫，猫科动物"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("人名 爱因斯坦"), true);
    assert.equal(translationLineContainsPersonNameLabel("n. 人名 牛顿"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. 牛顿（姓名）"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. 史密斯（姓）"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. 张三[姓名]"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. 李四[姓]"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. Einstein (姓名)"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. Smith (姓)"), true);
    assert.equal(hintTranslationLineIsFallbackOnly("n. 女性"), false);
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition(
        { pos: "n", translation_zh: "n. 猫\n（姓名）牛顿" },
        true,
      ),
      false,
    );
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition(
        { pos: "n", translation_zh: "n. 猫\n人名 爱因斯坦" },
        true,
      ),
      false,
    );
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition(
        { pos: "n", translation_zh: "n. 猫\n[医]专业义项" },
        true,
      ),
      false,
    );
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition({ pos: "n", translation_zh: "人名 爱因斯坦" }, true),
      true,
    );
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition({ pos: "n", translation_zh: "[化]学" }, true),
      true,
    );
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition({ pos: "n", translation_zh: "赫拉德茨" }, true),
      true,
    );
    assert.equal(
      hintWordIsFallbackOnlyFromDefinition({ pos: "", translation_zh: "某术语" }, false),
      true,
    );
  });
});
