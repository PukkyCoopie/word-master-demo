import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildExactLengthWeights,
  pickHintWordForGrid,
  pickRandomWordAtLength,
} from "./gridWordHint.js";
import { pickedLetterMultiset } from "./gridWordFinder.js";
import { applyBossHintLengthWeights, isHintPickAcceptable } from "./gridWordHintBoss.js";
import { hintJudgedLengthForActual } from "./gridWordHintLength.js";

describe("gridWordHint", () => {
  it("在可拼词时返回 pick", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const getCandidatesByLength = (len) => (len === 3 ? ["cat"] : []);
    const resolveWordPattern = (pattern) => (pattern === "cat" ? "cat" : null);
    const pick = pickHintWordForGrid(cells, getCandidatesByLength, resolveWordPattern, () => 0);
    assert.equal(pick?.word, "cat");
    assert.equal(pick?.path.length, 3);
  });

  it("字母不足时返回 null", () => {
    const cells = [
      { row: 0, col: 0, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const pick = pickHintWordForGrid(cells, () => ["a"], () => "a", () => 0);
    assert.equal(pick, null);
  });

  it("lengthWeightShift=1 不包含长度 3", () => {
    const weights = buildExactLengthWeights(1);
    assert.ok(!weights.some((e) => e.len === 3));
    assert.ok(weights.some((e) => e.len === 4 && e.weight === 5));
    assert.ok(weights.some((e) => e.len === 6 && e.weight === 40));
  });

  it("灵媒 Boss 按判定词长 5 反推实际长度", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 3, letter: "s", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const getCandidatesByLength = (len) => {
      if (len === 3) return ["cat"];
      if (len === 4) return ["cast"];
      if (len === 5) return ["caste"];
      return [];
    };
    const resolveWordPattern = (pattern) => pattern;
    const getJudgedLengthTableLen = (n) => n + 1;
    const pick = pickHintWordForGrid(
      cells,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      {
        bossResolveContext: { slug: "the_psychic" },
        getJudgedLengthTableLen,
      },
    );
    assert.equal(pick?.word, "cast");
    assert.equal(hintJudgedLengthForActual(pick.path.length, getJudgedLengthTableLen), 5);
  });

  it("冷眼 Boss 排除已用判定词长", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 3, letter: "s", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const getCandidatesByLength = (len) => {
      if (len === 3) return ["cat"];
      if (len === 4) return ["cats"];
      return [];
    };
    const resolveWordPattern = (pattern) => pattern;
    const getJudgedLengthTableLen = (n) => n + 1;
    const pick = pickHintWordForGrid(
      cells,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      {
        bossResolveContext: {
          slug: "the_eye",
          usedLengthsThisLevel: new Set([4]),
        },
        getJudgedLengthTableLen,
      },
    );
    assert.equal(pick?.word, "cats");
  });

  it("debuff 格降权但仍可拼词", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: true },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 3, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const gridMs = pickedLetterMultiset(cells);
    const getCandidatesByLength = (len) => (len === 3 ? ["cat", "act"] : []);
    const resolveWordPattern = (pattern) => pattern;
    const pick = pickRandomWordAtLength(
      cells,
      3,
      gridMs,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      500,
      { getHintLexicalTierForWord: () => 3 },
    );
    assert.equal(pick?.word, "act");
  });

  it("优先有正常词性的单词，尽量避免缩写", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const gridMs = pickedLetterMultiset(cells);
    const getCandidatesByLength = (len) => (len === 3 ? ["cpu", "cat"] : []);
    const resolveWordPattern = (pattern) => pattern;
    const getHintLexicalTierForWord = (w) => {
      if (w === "cat") return 3;
      if (w === "cpu") return 1;
      return 2;
    };
    const pick = pickRandomWordAtLength(
      cells,
      3,
      gridMs,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      500,
      { getHintLexicalTierForWord },
    );
    assert.equal(pick?.word, "cat");
  });

  it("折臂 Boss 优先判定词长仍为默认等级的长度", () => {
    const base = buildExactLengthWeights(0);
    const filtered = applyBossHintLengthWeights(
      base,
      { slug: "the_arm" },
      null,
      {
        getJudgedLengthTableLen: (n) => n,
        lengthLevelsByLength: { 3: 2, 4: 2, 5: 2, 6: 1, 7: 1 },
      },
    );
    assert.ok(filtered.every((e) => e.len === 6 || e.len === 7));
    assert.ok(!filtered.some((e) => e.len === 5));
  });

  it("折臂 Boss 全部已升级时回退默认权重", () => {
    const base = buildExactLengthWeights(0);
    const filtered = applyBossHintLengthWeights(
      base,
      { slug: "the_arm" },
      null,
      {
        getJudgedLengthTableLen: (n) => n,
        lengthLevelsByLength: { 3: 2, 4: 2, 5: 2, 6: 2, 7: 2 },
      },
    );
    assert.equal(filtered.length, base.length);
  });

  it("青铃 Boss 以强制选中格为首字母", () => {
    const anchor = {
      row: 0,
      col: 0,
      letter: "s",
      isWildcard: false,
      blocked: false,
      bossDebuffed: false,
    };
    const cells = [
      anchor,
      { row: 0, col: 1, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 3, letter: "r", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const getCandidatesByLength = (len) => {
      if (len === 4) return ["star", "arts"];
      return [];
    };
    const resolveWordPattern = (pattern) => pattern;
    const pick = pickHintWordForGrid(
      cells,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      {
        bossResolveContext: { slug: "cerulean_bell" },
        ceruleanAnchorCell: anchor,
      },
    );
    assert.equal(pick?.word, "star");
    assert.equal(pick?.path[0].row, 0);
    assert.equal(pick?.path[0].col, 0);
  });

  it("棘梅 Boss 仅提示符合词性限制的单词", () => {
    const cells = [
      { row: 0, col: 0, letter: "b", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "i", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "g", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const getCandidatesByLength = (len) => (len === 3 ? ["big", "bag"] : []);
    const resolveWordPattern = (pattern) => pattern;
    const getWordDefinition = (w) => {
      if (w === "big") return { pos: "adj", translation_zh: "adj. 大的" };
      if (w === "bag") return { pos: "n", translation_zh: "n. 袋子" };
      return null;
    };
    const bossCtx = {
      slug: "the_club",
      clubRequiredKey: "adj",
      getWordDefinition,
      getJudgedLengthTableLen: (n) => n,
    };
    const pick = pickHintWordForGrid(
      cells,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      { bossResolveContext: bossCtx },
    );
    assert.equal(pick?.word, "big");
    assert.equal(isHintPickAcceptable({ word: "bag", path: cells }, bossCtx), false);
    assert.equal(isHintPickAcceptable({ word: "big", path: cells }, bossCtx), true);
  });

  it("无正常释义词仅在其他词不可拼时兜底", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const getCandidatesByLength = (len) => (len === 3 ? ["cat", "cta"] : []);
    const resolveWordPattern = (pattern) => pattern;
    const getHintLexicalTierForWord = () => 3;
    const getHintWordIsFallbackOnly = (w) => w === "cta";
    const pickWithCommon = pickRandomWordAtLength(
      cells,
      3,
      pickedLetterMultiset(cells),
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      500,
      { getHintLexicalTierForWord, getHintWordIsFallbackOnly },
    );
    assert.equal(pickWithCommon?.word, "cat");

    const pickOnlyFallback = pickHintWordForGrid(
      [
        { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
        { row: 0, col: 1, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
        { row: 0, col: 2, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      ],
      (len) => (len === 3 ? ["cta"] : []),
      resolveWordPattern,
      () => 0,
      {
        getHintLexicalTierForWord,
        getHintWordIsFallbackOnly: () => true,
      },
    );
    assert.equal(pickOnlyFallback?.word, "cta");
  });

  it("reservoir 随机保留一个合法词", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const gridMs = pickedLetterMultiset(cells);
    const getCandidatesByLength = (len) => (len === 3 ? ["cat", "act"] : []);
    const resolveWordPattern = (pattern) => pattern;
    let rngStep = 0;
    const rng = () => {
      rngStep += 1;
      return rngStep === 1 ? 0 : 0.99;
    };
    const pick = pickRandomWordAtLength(
      cells,
      3,
      gridMs,
      getCandidatesByLength,
      resolveWordPattern,
      rng,
    );
    assert.ok(pick?.word === "cat" || pick?.word === "act");
  });

  it("随机抽样候选下标，避免字母序靠前词独占提示", () => {
    const cells = [
      { row: 0, col: 0, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "a", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "t", isWildcard: false, blocked: false, bossDebuffed: false },
    ];
    const gridMs = pickedLetterMultiset(cells);
    /** @type {string[]} */
    const candidates = [];
    for (let i = 0; i < 100; i += 1) {
      candidates.push(`zzz${i}`);
    }
    candidates.push("cat");
    const getCandidatesByLength = (len) => (len === 3 ? candidates : []);
    const resolveWordPattern = (pattern) => (pattern === "cat" ? "cat" : null);
    const pick = pickRandomWordAtLength(
      cells,
      3,
      gridMs,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0.5,
      500,
      { getHintLexicalTierForWord: () => 3 },
    );
    assert.equal(pick?.word, "cat");
  });

  it("万能块主导时用 pattern→resolve 快速路径", () => {
    /** @type {import('./gridWordFinder.js').GridCell[]} */
    const cells = [
      { row: 0, col: 0, letter: "l", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 1, letter: "p", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 2, letter: "g", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 0, col: 3, letter: "c", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 1, col: 0, letter: "l", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 1, col: 1, letter: "e", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 1, col: 2, letter: "q", isWildcard: false, blocked: false, bossDebuffed: false },
      { row: 1, col: 3, letter: "x", isWildcard: true, blocked: false, bossDebuffed: false },
      { row: 2, col: 0, letter: "y", isWildcard: true, blocked: false, bossDebuffed: false },
      { row: 2, col: 1, letter: "z", isWildcard: true, blocked: false, bossDebuffed: false },
    ];
    const gridMs = pickedLetterMultiset(cells);
    const resolveWordPattern = (pattern) => {
      if (pattern === "pl?ce") return "place";
      if (pattern === "???") return "cat";
      if (pattern === "place") return "place";
      return null;
    };
    const getCandidatesByLength = () => ["zzz", "aaa", "place", "cat"];
    const pick = pickRandomWordAtLength(
      cells,
      5,
      gridMs,
      getCandidatesByLength,
      resolveWordPattern,
      () => 0,
      500,
      { getHintLexicalTierForWord: () => 3 },
    );
    assert.equal(pick?.word, "place");
    assert.equal(pick?.path.length, 5);
  });

  it("pickRandomCellPath 洗牌不产生 undefined 格", () => {
    /** @type {import('./gridWordFinder.js').GridCell[]} */
    const cells = Array.from({ length: 16 }, (_, i) => ({
      row: Math.floor(i / 4),
      col: i % 4,
      letter: "a",
      isWildcard: i >= 7,
      blocked: false,
      bossDebuffed: false,
    }));
    for (let t = 0; t < 200; t += 1) {
      const pick = pickHintWordForGrid(
        cells,
        (len) => (len === 5 ? ["place", "apple"] : []),
        (pattern) => (pattern.includes("?") ? "place" : pattern),
        Math.random,
        { getHintLexicalTierForWord: () => 3 },
      );
      if (pick?.path) {
        assert.ok(pick.path.every((c) => c && typeof c.letter === "string"));
      }
    }
  });
});
