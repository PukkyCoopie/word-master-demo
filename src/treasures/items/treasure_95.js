import { describe } from "../treasureDescription.js";
import {
  VOWEL_SUBSTITUTE_TREASURE_ID,
  cycleVowelDisplayShiftOnDeckCard,
  isLetterSubstitutableForMouth,
  letterSubstituteNeighborTrio,
} from "../../game/vowelNeighborSubstitute.js";
import { resolveLetterFromRaw } from "../../settings/letterQ.js";

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
    const owned = ctx.ownedSlotTreasureIds ?? [];
    if (!resolved || letters.length !== resolved.length) return;
    for (let i = 0; i < letters.length; i++) {
      const tile = ctx.submittedScoringTiles?.[i];
      const card = tile?._deckCard;
      const natural = card && typeof card === "object"
        ? String(card.raw ?? "").toLowerCase()
        : String(letters[i]?.letter ?? "").toLowerCase();
      if (!isLetterSubstitutableForMouth(natural, owned)) continue;
      const used = natural !== resolved[i];
      if (card && typeof card === "object") {
        cycleVowelDisplayShiftOnDeckCard(card, used, owned);
        if (tile && typeof tile === "object") {
          const raw = String(card.raw ?? natural);
          const disp = letterSubstituteNeighborTrio(raw, owned);
          if (disp && card.vowelDisplayShift) {
            const sh = Math.sign(Number(card.vowelDisplayShift) || 0);
            const ch = sh < 0 ? (disp.prev ?? disp.self) : sh > 0 ? (disp.next ?? disp.self) : disp.self;
            tile.letter = resolveLetterFromRaw(ch);
          }
        }
      }
    }
  },
};

export { VOWEL_SUBSTITUTE_TREASURE_ID };
