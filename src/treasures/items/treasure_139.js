import { describe } from "../treasureDescription.js";
import { deckCardRaw } from "../../game/deckCardSync.js";

const ID = "139";

/** @param {import('../treasureRunState.js').TreasureRunState | null | undefined} rs @param {number} slotIndex @param {'self' | 'blueprint'} source */
function fax139ContributionKey(rs, slotIndex, source) {
  if (!rs) return "";
  if (!rs.level139FaxCopyContributions) rs.level139FaxCopyContributions = new Set();
  if (rs.level139FaxCopyContributions.has("__legacy_done__")) return "__legacy_done__";
  return `${Math.floor(Number(slotIndex) || 0)}:${source}`;
}

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
  description: describe("在每个关卡的第一次拼写中，将第一个具有增强效果的字母复制并洗入你的字母库"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const slotIndex = Math.floor(Number(ctx.hookSlotIndex) || 0);
    const source = ctx.hookSource === "blueprint" ? "blueprint" : "self";
    const key = fax139ContributionKey(rs, slotIndex, source);
    if (!key || rs.level139FaxCopyContributions.has(key)) return;
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
    rs.level139FaxCopyContributions.add(key);
    ctx.appendDeckCardSpecToRunDeck?.(deckCardToSpec(sourceCard));
    await Promise.all([
      ctx.wobbleOwnedTreasureById?.(ID),
      ctx.playWordSlotCopyFxAtIndex?.(sourceIndex),
    ]);
  },
};
