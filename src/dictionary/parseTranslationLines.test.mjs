import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWordDefinitionPreview,
  parseTranslationLinesPreferringPos,
  reorderTranslationLinesByPreferredPos,
} from "./parseTranslationLines.js";

describe("reorderTranslationLinesByPreferredPos", () => {
  it("把匹配目标词性的行稳定提到前面", () => {
    const lines = ["n. 书", "vi. 预订", "adj. 预定的"];
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, "v"), [
      "vi. 预订",
      "n. 书",
      "adj. 预定的",
    ]);
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, "adj"), [
      "adj. 预定的",
      "n. 书",
      "vi. 预订",
    ]);
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, "n"), [
      "n. 书",
      "vi. 预订",
      "adj. 预定的",
    ]);
  });

  it("无匹配或无 preferred 时保持原序", () => {
    const lines = ["n. 书", "prep. 在…上"];
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, "v"), lines);
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, null), lines);
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, ""), lines);
  });

  it("多行同词性时保持相对顺序", () => {
    const lines = ["n. 一", "v. 甲", "n. 二", "vt. 乙"];
    assert.deepEqual(reorderTranslationLinesByPreferredPos(lines, "v"), [
      "v. 甲",
      "vt. 乙",
      "n. 一",
      "n. 二",
    ]);
  });
});

describe("buildWordDefinitionPreview preferredPosKey", () => {
  it("预览行优先为 Boss 词性释义", () => {
    const def = { translation_zh: "n. 书\\nvi. 预订\\nadj. 预定的" };
    const preview = buildWordDefinitionPreview(def, { preferredPosKey: "v" });
    assert.equal(preview.previewLine, "vi. 预订");
    assert.equal(preview.lines[0], "vi. 预订");
    assert.equal(preview.extraCount, 2);
  });

  it("parseTranslationLinesPreferringPos 与预览一致", () => {
    const zh = "n. 名词\nvt. 动词义";
    assert.deepEqual(parseTranslationLinesPreferringPos(zh, "v"), ["vt. 动词义", "n. 名词"]);
  });
});
