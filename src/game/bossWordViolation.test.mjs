import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bossWildcardComplianceMode,
  dictionaryPosMatchesClubKey,
  evaluateBossSoftWordViolation,
  inferPosFromTranslationHead,
} from "./bossWordViolation.js";

test("cooperate（pos=vi）在动词 Boss 下通过", () => {
  assert.equal(dictionaryPosMatchesClubKey("vi", "v"), true);
  assert.equal(
    inferPosFromTranslationHead("vi. 合作, 协力, 配合\\n[化] 合作"),
    "vi",
  );
});

test("vt / vi / vbl / v 均算作动词", () => {
  assert.equal(dictionaryPosMatchesClubKey("vt", "v"), true);
  assert.equal(dictionaryPosMatchesClubKey("vi", "v"), true);
  assert.equal(dictionaryPosMatchesClubKey("vbl", "v"), true);
  assert.equal(dictionaryPosMatchesClubKey("v", "v"), true);
  assert.equal(dictionaryPosMatchesClubKey("vt|n", "v"), true);
});

test("词性字段缺失时可从释义 vi. 前缀回退", () => {
  assert.equal(
    dictionaryPosMatchesClubKey("", "v", "vi. 合作, 协力, 配合"),
    true,
  );
});

test("棘梅动词限制：cooperate 不违规", () => {
  const raw = JSON.parse(readFileSync(new URL("../../data/dictionary/dict.json", import.meta.url), "utf8"));
  const map = new Map();
  for (const [word, pos, translation_zh] of raw) {
    const w = word.toLowerCase();
    if (!map.has(w)) map.set(w, { word: w, pos, translation_zh });
  }
  const getWordDefinition = (w) => map.get(String(w).toLowerCase().trim()) ?? null;

  const soft = evaluateBossSoftWordViolation({
    slug: "the_club",
    wordLen: 10,
    resolvedWord: "cooperate",
    getWordDefinition,
    usedLengthsThisLevel: new Set(),
    mouthLockedLength: null,
    clubRequiredKey: "v",
  });
  assert.equal(soft.violated, false);
});

test("形容词 token 不因 adj 子串误匹配（如 adjust）", () => {
  assert.equal(dictionaryPosMatchesClubKey("adjust", "adj"), false);
  assert.equal(dictionaryPosMatchesClubKey("adj", "adj"), true);
});

test("bossWildcardComplianceMode: 独口锁定长度", () => {
  const ctx = {
    slug: "the_mouth",
    mouthLockedLength: 8,
    getJudgedWordLen: (w) => w.length,
  };
  assert.equal(bossWildcardComplianceMode(ctx, 8), "all_pass");
  assert.equal(bossWildcardComplianceMode(ctx, 5), "all_fail");
});

test("bossWildcardComplianceMode: 棘梅需逐词判定", () => {
  const ctx = { slug: "the_club", clubRequiredKey: "n" };
  assert.equal(bossWildcardComplianceMode(ctx, 5), "per_candidate");
});
