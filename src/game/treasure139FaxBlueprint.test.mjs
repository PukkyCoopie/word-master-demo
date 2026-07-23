import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  isTreasureHookContributionActive,
  shouldTreasureRunAccumulationMutate,
} from "./treasureBlueprintMirror.js";

const faxSrcPath = join(dirname(fileURLToPath(import.meta.url)), "../treasures/items/treasure_139.js");

test("面具+传真机：[98][139] 面具槽 blueprint 贡献有效", () => {
  const slots = ["98", "139"];
  assert.equal(
    isTreasureHookContributionActive(slots, { slotIndex: 0, treasureId: "139", source: "blueprint" }),
    true,
  );
  assert.equal(
    isTreasureHookContributionActive(slots, { slotIndex: 1, treasureId: "139", source: "self" }),
    true,
  );
});

test("传真机效果复现：不得用银行累加闸门拦 blueprint", () => {
  const slots = ["98", "139"];
  assert.equal(shouldTreasureRunAccumulationMutate(slots, 0, "139", "blueprint"), false);
  assert.equal(shouldTreasureRunAccumulationMutate(slots, 1, "139", "self"), true);

  const src = readFileSync(faxSrcPath, "utf8");
  assert.doesNotMatch(
    src,
    /import\s*\{[^}]*\bshouldTreasureRunAccumulationMutate\b/,
    "treasure_139 不应 import 银行累加闸门（会误拦面具/绵羊镜像）",
  );
  assert.match(src, /isTreasureHookContributionActive/);
});

test("传真机：首次拼写机会须在查找增强前消耗（避免次词才复制）", () => {
  const src = readFileSync(faxSrcPath, "utf8");
  const addIdx = src.indexOf("rs.level139FaxCopyContributions.add(key)");
  const noCopyReturnIdx = src.indexOf("if (!appendSpec || sourceIndex < 0) return false");
  assert.ok(addIdx >= 0, "须写入 level139FaxCopyContributions");
  assert.ok(noCopyReturnIdx >= 0, "须保留无增强早退");
  assert.ok(
    addIdx < noCopyReturnIdx,
    "add(key) 须在无增强 return 之前，否则首词无增强时次词仍会复制",
  );
  assert.equal(
    src.split("rs.level139FaxCopyContributions.add(key)").length - 1,
    1,
    "本关机会应只在一处 claim，勿在复制成功后再 add",
  );
});
