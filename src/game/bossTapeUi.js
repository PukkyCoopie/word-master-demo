/**
 * Boss 条带 UI 纯逻辑：副标题文案与动效时序常量。
 * 触发 cue 状态机见 `useBossTapeCue.js`；进关限制分类见 `bossRestrictionCue.js`。
 */

import { BOSS_CLUB_POS_OPTIONS } from "./bossWordViolation.js";
import { resolveUniqueMostSpellLength } from "./bossMechanicsContext.js";

/** Boss 条 wobble 单次时长（与 CSS `boss-tape-wobble` 对齐） */
export const BOSS_TAPE_WOBBLE_MS = 520;

/** 与 `boss-tape-ripple-out-trigger` 末段 delay 对齐 */
export const BOSS_TAPE_TRIGGER_RIPPLE_MS = 1180;

/**
 * @param {Record<string | number, number> | Map<number, number> | null | undefined} spellCountsByLength
 * @returns {string}
 */
export function formatOxBossLengthSuffix(spellCountsByLength) {
  const len = resolveUniqueMostSpellLength(spellCountsByLength);
  return len != null ? `（长度${len}）` : "（暂无）";
}

/**
 * @param {import("./bossBlindDefinitions.js").BossBlindDef | null | undefined} bossDef
 * @param {{ clubRequiredKey?: string, mouthLockedLength?: number | null, spellCountsByLength?: Record<string | number, number> | Map<number, number> | null }} [opts]
 * @returns {string}
 */
export function buildBossTapeSubLine(bossDef, opts = {}) {
  if (!bossDef) return "";
  const clubRequiredKey = String(opts.clubRequiredKey ?? "").trim();
  const mouthLockedLength = opts.mouthLockedLength;
  if (bossDef.slug === "the_club" && clubRequiredKey) {
    const opt = BOSS_CLUB_POS_OPTIONS.find((o) => o.key === clubRequiredKey);
    return opt ? `本关要求：${opt.labelZh}` : bossDef.uiDescription;
  }
  if (bossDef.slug === "the_mouth") {
    const base = bossDef.uiDescription;
    if (mouthLockedLength != null) {
      return `${base}（长度${mouthLockedLength}）`;
    }
    return base;
  }
  if (bossDef.slug === "the_ox") {
    return `${bossDef.uiDescription}${formatOxBossLengthSuffix(opts.spellCountsByLength)}`;
  }
  return bossDef.uiDescription;
}
