import test from "node:test";
import assert from "node:assert/strict";
import {
  NEWSPAPER_PLURAL_S_MULT,
  NEWSPAPER_TEMP_TILE_ID,
  createNewspaperPluralSTile,
  getSubmitScoringWordForAppend,
  qualifiesForPluralS,
  treasureHooks,
} from "./treasure_140.js";

test("qualifiesForPluralS：基于词典判定 word+s，已含 s 的词仅在 catss 等无效时不追加", () => {
  const lookup = (w) => (w === "cats" ? { pos: "noun" } : null);
  assert.equal(
    qualifiesForPluralS({ resolvedWord: "cat", getWordDefinition: lookup }),
    true,
  );
  assert.equal(
    qualifiesForPluralS({ resolvedWord: "cats", getWordDefinition: lookup }),
    false,
  );
  assert.equal(
    qualifiesForPluralS({ resolvedWord: "dog", getWordDefinition: lookup }),
    false,
  );
});

test("链式 +s：每追加一次 S 后重新判定下一份报纸", () => {
  const lookup = (w) => (w === "cros" || w === "cross" ? {} : null);
  const orig = [
    { letter: "c" },
    { letter: "r" },
    { letter: "o", rarity: "common" },
  ];
  assert.equal(
    getSubmitScoringWordForAppend({ resolvedWord: "cro", tiles: orig }),
    "cro",
  );
  assert.equal(
    qualifiesForPluralS({ resolvedWord: "cro", tiles: orig, getWordDefinition: lookup }),
    true,
  );

  const after1 = [...orig, createNewspaperPluralSTile(orig[2], [], null, 0)];
  assert.equal(
    getSubmitScoringWordForAppend({ resolvedWord: "cro", tiles: after1 }),
    "cros",
  );
  assert.equal(
    qualifiesForPluralS({ resolvedWord: "cro", tiles: after1, getWordDefinition: lookup }),
    true,
  );

  const after2 = [...after1, createNewspaperPluralSTile(after1[after1.length - 1], [], null, 1)];
  assert.equal(
    getSubmitScoringWordForAppend({ resolvedWord: "cro", tiles: after2 }),
    "cross",
  );
  assert.equal(
    qualifiesForPluralS({ resolvedWord: "cro", tiles: after2, getWordDefinition: lookup }),
    false,
  );
});

test("三份报纸 cro→cros→cross：仅前两份生效", () => {
  const lookup = (w) => (w === "cros" || w === "cross" ? {} : null);
  const tiles = [{ letter: "c" }, { letter: "r" }, { letter: "o", rarity: "common" }];
  const slots = ["140", "140", "140"];
  let working = [...tiles];
  const appended = [];
  for (const tid of slots) {
    if (tid !== "140") continue;
    const ctx = {
      resolvedWord: "cro",
      tiles: working,
      getWordDefinition: lookup,
      ownedSlotTreasureIds: slots,
      rarityLevelsByRarity: { common: 1 },
    };
    const tile = treasureHooks.buildSubmitScoringAppendTile?.(ctx);
    if (tile) {
      working.push(tile);
      appended.push(tile);
    }
  }
  assert.equal(appended.length, 2);
  assert.equal(appended[0].id, NEWSPAPER_TEMP_TILE_ID);
  assert.equal(appended[1].id, `${NEWSPAPER_TEMP_TILE_ID}:1`);
});

test("buildSubmitScoringAppendTile：临时 S 带 +20 倍率角标", () => {
  const tile = treasureHooks.buildSubmitScoringAppendTile?.({
    resolvedWord: "cat",
    getWordDefinition: (w) => (w === "cats" ? {} : null),
    tiles: [{ letter: "c" }, { letter: "a" }, { letter: "t", rarity: "rare" }],
    ownedSlotTreasureIds: ["140"],
    rarityLevelsByRarity: { common: 1, rare: 1 },
  });
  assert.equal(tile?.id, NEWSPAPER_TEMP_TILE_ID);
  assert.equal(tile?.letter, "s");
  assert.equal(tile?.letterMultBonus, NEWSPAPER_PLURAL_S_MULT);
  assert.equal(tile?.isNewspaperTempTile, true);
  assert.equal(tile?.rarity, "rare");
});

test("getSubmitScoringWordLetterCountBonus：命中时 +1", () => {
  const bonus = treasureHooks.getSubmitScoringWordLetterCountBonus?.({
    resolvedWord: "cat",
    getWordDefinition: (w) => (w === "cats" ? {} : null),
  });
  assert.equal(bonus, 1);
  assert.equal(
    treasureHooks.getSubmitScoringWordLetterCountBonus?.({
      resolvedWord: "dog",
      getWordDefinition: (w) => (w === "cats" ? {} : null),
    }),
    0,
  );
});

test("报纸无 buildPostLetterStep（倍率在临时 S 角标上）", () => {
  assert.equal(typeof treasureHooks.buildPostLetterStep, "undefined");
});
