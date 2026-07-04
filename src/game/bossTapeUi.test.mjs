import test from "node:test";
import assert from "node:assert/strict";
import { buildBossTapeSubLine } from "./bossTapeUi.js";

test("buildBossTapeSubLine: default uiDescription", () => {
  assert.equal(
    buildBossTapeSubLine({
      slug: "the_hook",
      nameZh: "倒钩",
      uiDescription: "每次拼词后，使棋盘上随机四格变为无效",
    }),
    "每次拼词后，使棋盘上随机四格变为无效",
  );
});

test("buildBossTapeSubLine: club required key", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_club", uiDescription: "fallback" },
      { clubRequiredKey: "n" },
    ),
    "只能拼写名词",
  );
});

test("buildBossTapeSubLine: mouth before first word", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_mouth", uiDescription: "本关内只允许拼写一种长度的单词" },
      { mouthLockedLength: null },
    ),
    "本关内只允许拼写一种长度的单词",
  );
});

test("buildBossTapeSubLine: mouth locked length", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_mouth", uiDescription: "本关内只允许拼写一种长度的单词" },
      { mouthLockedLength: 5 },
    ),
    "本关内只允许拼写一种长度的单词（长度5）",
  );
});

test("buildBossTapeSubLine: ox unique most length", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_ox", uiDescription: "拼出最常拼写的长度的单词时，资金归零" },
      { spellCountsByLength: { 4: 1, 6: 3, 8: 1 } },
    ),
    "拼出最常拼写的长度的单词时，资金归零（长度6）",
  );
});

test("buildBossTapeSubLine: ox tied lengths show 暂无", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_ox", uiDescription: "拼出最常拼写的长度的单词时，资金归零" },
      { spellCountsByLength: { 5: 2, 7: 2 } },
    ),
    "拼出最常拼写的长度的单词时，资金归零（暂无）",
  );
});

test("buildBossTapeSubLine: ox no data show 暂无", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_ox", uiDescription: "拼出最常拼写的长度的单词时，资金归零" },
      { spellCountsByLength: {} },
    ),
    "拼出最常拼写的长度的单词时，资金归零（暂无）",
  );
});
