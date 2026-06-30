/**
 * 字母库牌张是否具「增益」（书包等）：材质、配饰、或计分板/回形针等写入牌张的持久平面分/倍率。
 * 玩家本关标记（`playerMarked` 折角）仅棋盘提示、不进字母库 multiset，不在此统计。
 */

import { entityHasAccessory } from "../accessories/accessoryState.js";
import { deckCardHasPersistedIntrinsicGain } from "../game/tileIntrinsicGains.js";

/** @param {unknown} card */
export function deckCardHasEnhancement(card) {
  if (!card || typeof card !== "object") return false;
  const c = /** @type {{ materialId?: string | null }} */ (card);
  const mat = String(c.materialId ?? "").trim();
  if (mat) return true;
  if (entityHasAccessory(c)) return true;
  return deckCardHasPersistedIntrinsicGain(c);
}

/** @param {readonly unknown[] | null | undefined} deck */
export function countDeckCardsWithEnhancement(deck) {
  let n = 0;
  for (const c of deck ?? []) {
    if (deckCardHasEnhancement(c)) n += 1;
  }
  return n;
}
