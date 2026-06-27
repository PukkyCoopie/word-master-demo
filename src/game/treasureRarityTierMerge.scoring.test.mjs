import assert from "node:assert/strict";
import { computeWordScoreDetailed } from "../composables/useScoring.js";
import { resolveScoringLetterRarity } from "./treasureRarityTierMerge.js";

assert.equal(resolveScoringLetterRarity("common", ["97"]), "rare");
assert.equal(resolveScoringLetterRarity("epic", ["97"]), "legendary");
assert.equal(resolveScoringLetterRarity("rare", ["97"]), "rare");
assert.equal(resolveScoringLetterRarity("common", []), "common");

const tile = { letter: "a", rarity: "common" };
const without = computeWordScoreDetailed([tile], 1, null, null);
const with97 = computeWordScoreDetailed([tile], 1, null, null, 1, 0, {
  ownedSlotTreasureIds: ["97"],
  resolvedWord: "a",
});

assert.equal(with97.letterParts[0].rarity, "common");
assert.ok(with97.letterParts[0].rarityBonus > without.letterParts[0].rarityBonus);

console.log("treasureRarityTierMerge.scoring.test.mjs ok");
