import { describe } from "../treasureDescription.js";
import { deckCardRaw } from "../../game/deckCardSync.js";

const ID = "139";

/** @param {object | null | undefined} tile */
function tileIsEnhanced(tile) {
  if (!tile || typeof tile !== "object") return false;
  const t = /** @type {Record<string, unknown>} */ (tile);
  if (t.materialId) return true;
  if (Math.floor(Number(t.tileScoreBonus) || 0) > 0) return true;
  if (Math.floor(Number(t.letterMultBonus) || 0) > 0) return true;
  if (Math.floor(Number(t.materialScoreBonus) || 0) > 0) return true;
  if (Math.floor(Number(t.materialMultBonus) || 0) > 0) return true;
  if (String(t.accessoryId ?? "").trim()) return true;
  if (String(t.treasureAccessoryId ?? "").trim()) return true;
  return false;
}

/** @param {object} card */
function deckCardToSpec(card) {
  return {
    raw: deckCardRaw(card),
    materialId: card.materialId ?? null,
    accessoryId: card.accessoryId ?? null,
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)) || undefined,
    letterMultBonus: Math.max(0, Math.floor(Number(card.letterMultBonus) || 0)) || undefined,
  };
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "epic",
  description: describe("在每个关卡的第一次拼写中，将第一个具有增强效果的字母复制并洗入你的牌库"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.level139FaxCopyDone) return;
    const tiles = ctx.submittedScoringTiles ?? [];
    let sourceCard = null;
    let sourceIndex = -1;
    for (let i = 0; i < tiles.length; i += 1) {
      const tile = tiles[i];
      if (!tileIsEnhanced(tile)) continue;
      const card = tile._deckCard;
      if (card && typeof card === "object") {
        sourceCard = card;
        sourceIndex = i;
        break;
      }
    }
    if (!sourceCard || sourceIndex < 0) return;
    ctx.appendDeckCardSpecToRunDeck?.(deckCardToSpec(sourceCard));
    rs.level139FaxCopyDone = true;
    await Promise.all([
      ctx.wobbleOwnedTreasureById?.(ID),
      ctx.playWordSlotCopyFxAtIndex?.(sourceIndex),
    ]);
  },
};
