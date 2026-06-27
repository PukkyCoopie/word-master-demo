import test from "node:test";
import assert from "node:assert/strict";
import { buildBossTapeSubLine } from "./bossTapeUi.js";

test("buildBossTapeSubLine: default uiDescription", () => {
  assert.equal(
    buildBossTapeSubLine({
      slug: "the_hook",
      nameZh: "倒钩",
      uiDescription: "每次拼词后，场上随机四格被削弱",
    }),
    "每次拼词后，场上随机四格被削弱",
  );
});

test("buildBossTapeSubLine: club required key", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_club", uiDescription: "fallback" },
      { clubRequiredKey: "n" },
    ),
    "本关要求：名词",
  );
});

test("buildBossTapeSubLine: mouth locked length", () => {
  assert.equal(
    buildBossTapeSubLine(
      { slug: "the_mouth", uiDescription: "fallback" },
      { mouthLockedLength: 5 },
    ),
    "固定长度：5",
  );
});
