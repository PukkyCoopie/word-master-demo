import { commitWildcardMorphBeforeEnhancementStrip } from "./treasureEnhancementStrip.js";
import { normalizeLetterChar } from "../treasures/treasureLifecycleShared.js";
import { TREASURE_HOOKS_BY_ID } from "../treasures/treasureRegistry.js";

/**
 * 逐字宝藏写回角标：先将万能块按本词计分快照变形，再调用宝藏 `persistTileAfterPerLetterTreasureCue`。
 * @param {{
 *   treasureId: string,
 *   realTile: object | null | undefined,
 *   scoringTile?: object | null | undefined,
 *   band: "score" | "mult",
 *   delta: number,
 * }} opts
 * @returns {boolean}
 */
export function persistTileIntrinsicTreasureCue(opts) {
  const treasureId = String(opts?.treasureId ?? "");
  const realTile = opts?.realTile;
  const delta = opts?.delta;
  if (!treasureId || !realTile || typeof realTile !== "object") return false;
  const hooks = TREASURE_HOOKS_BY_ID.get(treasureId);
  if (!hooks?.persistTileAfterPerLetterTreasureCue) return false;
  const snap =
    opts?.scoringTile && typeof opts.scoringTile === "object" ? opts.scoringTile : realTile;
  commitWildcardMorphBeforeEnhancementStrip(realTile, snap);
  return hooks.persistTileAfterPerLetterTreasureCue({
    realTile,
    scoringTile: snap,
    scoringLetter: normalizeLetterChar(snap.letter),
    band: opts.band,
    delta,
  });
}
