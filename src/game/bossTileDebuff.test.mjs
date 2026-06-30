import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBossTileDebuffState,
  isUndeformedWildcardGridTile,
  resolvePresentationBossTileDebuffed,
} from "./bossTileDebuff.js";

const ctx = Object.freeze({ ownedSlotTreasureIds: [] });

test("未变形万能块在棋盘上不受元音/辅音/稀有/立柱类 Boss 无效化", () => {
  const tile = {
    letter: "?",
    rarity: "rare",
    isWildcard: true,
    materialId: "wildcard",
    _deckCard: { _dcUid: 42 },
    bossTileDebuffed: false,
  };
  assert.equal(isUndeformedWildcardGridTile(tile), true);
  for (const slug of ["the_vowel", "the_consonant", "the_plant", "the_pillar"]) {
    applyBossTileDebuffState(tile, slug, {
      ...ctx,
      pillarUsedDeckUids: new Set([42]),
    });
    assert.equal(tile.bossTileDebuffed, false, slug);
  }
});

test("未变形万能块仍受绿叶 Boss 全局无效化", () => {
  const tile = {
    letter: "?",
    isWildcard: true,
    materialId: "wildcard",
    bossTileDebuffed: false,
  };
  applyBossTileDebuffState(tile, "verdant_leaf", { verdantTreasureSold: false });
  assert.equal(tile.bossTileDebuffed, true);
});

test("词槽展示：万能块变形为元音后受口罩 Boss 无效化", () => {
  const tile = {
    letter: "a",
    rarity: "common",
    isWildcard: true,
    materialId: "wildcard",
    bossTileDebuffed: false,
  };
  assert.equal(
    resolvePresentationBossTileDebuffed(tile, "the_vowel", ctx),
    true,
  );
});

test("词槽展示：保留倒钩等格上已有无效化", () => {
  const tile = {
    letter: "b",
    rarity: "common",
    isWildcard: true,
    materialId: "wildcard",
    bossTileDebuffed: true,
  };
  assert.equal(
    resolvePresentationBossTileDebuffed(tile, "the_vowel", ctx),
    true,
  );
});
