import { getEffectiveAnimSpeed } from "../settings/animationSpeed.js";
import { pauseAwareDelay } from "./gamePause.js";

const SUBMIT_SCORING_LENGTH_BASE_MAX = 2;
const SUBMIT_SCORING_LENGTH_TAU_BEATS = 18;
const SUBMIT_SCORING_RAMP_PER_BEAT = 0.062;
const SUBMIT_SCORING_RAMP_DAMP_REF_BEATS = 12;
const SUBMIT_SCORING_RAMP_DAMP_EXP = 0.42;
const SUBMIT_SCORING_RAMP_MULT_MAX = 1.82;
const SUBMIT_SCORING_SPEED_GLOBAL_MAX = 3;
const SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS = 6;

function countActivePostLetterTreasureSteps(postSteps) {
  let c = 0;
  for (const step of postSteps ?? []) {
    const multAdd = Number(step.multAdd) || 0;
    const scoreAdd = Number(step.scoreAdd) || 0;
    const multMul = Number(step.multMul) || 0;
    const moneyAdd = Number(step.moneyAdd) || 0;
    const hasMultMul = multMul > 0 && multMul !== 1;
    if (multAdd <= 0 && scoreAdd <= 0 && !hasMultMul && moneyAdd <= 0) continue;
    c += 1;
  }
  return c;
}

/** 用于渐进加速：逐字母步 + 额外轮前 cue + 字后宝藏步 */
export function getSubmitScoringTotalBeats(detailed) {
  const n = detailed.letterParts?.length ?? 0;
  const letterPassCount = Math.max(1, Math.round(Number(detailed.letterScoringPassCount)) || 1);
  const post = countActivePostLetterTreasureSteps(detailed.postLetterTreasureSteps);
  const extraCues = Math.max(0, letterPassCount - 1);
  const replayExtra = (detailed.letterReplayExtraCounts ?? []).reduce(
    (s, v) => s + Math.max(0, Math.floor(Number(v) || 0)),
    0,
  );
  const perLetterTreasureReplayCues = (detailed.perLetterTreasureReplayCueSteps ?? []).reduce(
    (s, steps) => s + (steps?.length ?? 0),
    0,
  );
  return letterPassCount * n + replayExtra + perLetterTreasureReplayCues + extraCues + post;
}

function getSubmitScoringLengthBaseSpeed(totalBeats) {
  if (totalBeats < SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS) return 1;
  const span = totalBeats - SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS;
  const t = 1 - Math.exp(-span / SUBMIT_SCORING_LENGTH_TAU_BEATS);
  return 1 + (SUBMIT_SCORING_LENGTH_BASE_MAX - 1) * t;
}

function getSubmitScoringRampFactor(beatIndex, totalBeats) {
  if (totalBeats < SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS) return 1;
  const ref = SUBMIT_SCORING_RAMP_DAMP_REF_BEATS;
  const damp =
    1 /
    Math.pow(
      Math.max(SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS, totalBeats) / ref,
      SUBMIT_SCORING_RAMP_DAMP_EXP,
    );
  const mult = 1 + SUBMIT_SCORING_RAMP_PER_BEAT * damp * Math.max(0, beatIndex);
  return Math.min(SUBMIT_SCORING_RAMP_MULT_MAX, mult);
}

export function getSubmitScoringBeatSpeed(beatIndex, totalBeats) {
  const base = getSubmitScoringLengthBaseSpeed(totalBeats);
  const ramp = getSubmitScoringRampFactor(beatIndex, totalBeats);
  const s = base * ramp;
  return Math.min(SUBMIT_SCORING_SPEED_GLOBAL_MAX, Math.max(0.35, s));
}

export async function scoringSleep(ms, speed) {
  const s = getEffectiveAnimSpeed(speed);
  return pauseAwareDelay(Math.max(1, Math.round(ms / s)));
}
