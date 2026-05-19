import { describe } from "../treasureDescription.js";
import {
  VOWEL_SUBSTITUTE_TREASURE_ID,
  cycleVowelDisplayShiftOnDeckCard,
  isSubstitutableVowel,
  vowelNeighborLetters,
} from "../../game/vowelNeighborSubstitute.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "epic",
  description: describe("允许相邻的元音字母彼此替换"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onSuccessfulWordSubmit(ctx) {
    const resolved = String(ctx.resolvedWord ?? "").toLowerCase();
    const letters = ctx.submittedLetters ?? [];
    if (!resolved || letters.length !== resolved.length) return;
    for (let i = 0; i < letters.length; i++) {
      const tile = ctx.submittedScoringTiles?.[i];
      const card = tile?._deckCard;
      const natural = card && typeof card === "object"
        ? String(card.raw ?? "").toLowerCase()
        : String(letters[i]?.letter ?? "").toLowerCase();
      if (!isSubstitutableVowel(natural)) continue;
      const used = natural !== resolved[i];
      if (card && typeof card === "object") {
        cycleVowelDisplayShiftOnDeckCard(card, used);
        if (tile && typeof tile === "object") {
          const raw = String(card.raw ?? natural);
          const disp = vowelNeighborLetters(raw);
          if (disp && card.vowelDisplayShift) {
            const sh = Math.sign(Number(card.vowelDisplayShift) || 0);
            const ch = sh < 0 ? (disp.prev ?? disp.self) : sh > 0 ? (disp.next ?? disp.self) : disp.self;
            tile.letter = ch === "q" ? "Qu" : ch.toUpperCase();
          }
        }
      }
    }
  },
};

export { VOWEL_SUBSTITUTE_TREASURE_ID };
