import { isStandardRunFinalLevelIndex } from "../levelDefinitions.js";
import { deserializeScore, scoreGte, scoreLt } from "../utils/scoreInteger.js";
import { isContinuableRunPhase, normalizeRunSavePhase } from "./runSaveSchema.js";
import { resolveSavedIsEndlessRun } from "./runSaveEndless.js";

/**
 * 记分动画中途强制落盘可能留下：
 * - remainingWords 已扣、本手分未入账 → 继续后无法提交也无失败层（软锁）
 * - 或分已达标、结算/终局层未开 → 同样无法推进
 *
 * @param {import('./runSavePayload.js').RunSavePayload | null | undefined} payload
 * @returns {{
 *   kind: 'none' | 'restore_submit_chance' | 'open_stage_settlement' | 'open_run_end_win',
 *   payload: import('./runSavePayload.js').RunSavePayload | null | undefined,
 * }}
 */
export function repairSoftLockedPlayingSave(payload) {
  if (!payload || typeof payload !== "object" || !payload.deckState) {
    return { kind: "none", payload };
  }

  const phase = normalizeRunSavePhase(payload.phase);
  if (!isContinuableRunPhase(phase) || phase !== "playing") {
    return { kind: "none", payload };
  }
  if (payload.showShop === true || payload.showSettlement === true || payload.showRunEnd === true) {
    return { kind: "none", payload };
  }

  const remainingWords = Math.max(0, Math.floor(Number(payload.deckState.remainingWords) || 0));
  if (remainingWords > 0) {
    return { kind: "none", payload };
  }

  const currentScore = deserializeScore(payload.deckState.currentScore);
  const targetScore = deserializeScore(payload.deckState.targetScore);

  if (scoreGte(currentScore, targetScore)) {
    const endless = resolveSavedIsEndlessRun(payload);
    const levelIndex = Math.max(0, Math.floor(Number(payload.levelIndex) || 0));
    return {
      kind:
        !endless && isStandardRunFinalLevelIndex(levelIndex)
          ? "open_run_end_win"
          : "open_stage_settlement",
      payload,
    };
  }

  if (scoreLt(currentScore, targetScore)) {
    return {
      kind: "restore_submit_chance",
      payload: {
        ...payload,
        deckState: {
          ...payload.deckState,
          remainingWords: 1,
        },
      },
    };
  }

  return { kind: "none", payload };
}
