import { isBossTileDebuffed } from "../game/bossTileDebuff.js";
import { iterTreasureHookContributions } from "../game/treasureBlueprintMirror.js";
import { TREASURE_HOOKS_BY_ID } from "./treasureRegistry.js";

/**
 * 提交计分时预掷逐字金币 cue（如摇杆）；与 `runSingleLetterScoringStep` 的 visit 序对齐。
 * @param {object[]} tiles
 * @param {{ letter?: string }[]} letterParts
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {number[]} scoringVisitCountsByLetter
 * @param {() => number} [rng]
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} [treasureRun]
 * @returns {{ slotIndex: number, treasureId: string, money: number }[][][]}
 */
export function collectPerLetterMoneyCuesByLetter(
  tiles,
  letterParts,
  ownedSlotTreasureIds,
  scoringVisitCountsByLetter,
  rng = Math.random,
  treasureRun = null,
) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  const slots = ownedSlotTreasureIds ?? [];
  const n = tiles?.length ?? 0;
  /** @type {{ slotIndex: number, treasureId: string, money: number }[][][]} */
  const byLetter = [];

  for (let i = 0; i < n; i++) {
    byLetter[i] = [];
    if (isBossTileDebuffed(tiles[i])) continue;
    const visits = Math.max(0, Math.floor(Number(scoringVisitCountsByLetter[i]) || 0));
    const part = letterParts[i];
    for (let v = 0; v < visits; v++) {
      /** @type {{ slotIndex: number, treasureId: string, money: number }[]} */
      const cues = [];
      for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(slots)) {
        const hooks = TREASURE_HOOKS_BY_ID.get(tid);
        if (!hooks?.getPerLetterMoneyCue) continue;
        const ctx = {
          ownedSlotTreasureIds: slots,
          rng: rnd,
          scoringVisitIndex: v,
          treasureRun: treasureRun ?? undefined,
        };
        const cue = hooks.getPerLetterMoneyCue(ctx, part, i);
        const money = Math.max(0, Math.round(Number(cue?.money) || 0));
        if (money > 0) cues.push({ slotIndex: si, treasureId: tid, money });
      }
      byLetter[i].push(cues);
    }
  }

  return byLetter;
}
