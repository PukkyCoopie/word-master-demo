/**
 * 匕首等宝藏：Boss「限制」触发时机分类。
 * 整词软违规见 `bossWordViolation.js`；此处覆盖进关即生效与事件型 Boss。
 */

/** 进关即生效：进入 Boss 小关后匕首 wobble +$8 一次 */
export const BOSS_LEVEL_ENTER_RESTRICTION_SLUGS = Object.freeze(
  new Set([
    "the_manacle",
    "the_plant",
    "the_vowel",
    "the_consonant",
    "the_pillar",
    "verdant_leaf",
    "the_water",
    "the_wall",
    "violet_vessel",
    "the_needle",
    "amber_acorn",
    "the_club",
    "the_psychic",
    "the_eye",
    "the_noble_end",
  ]),
);

/** @param {string | null | undefined} slug */
export function isBossLevelEnterRestrictionSlug(slug) {
  return BOSS_LEVEL_ENTER_RESTRICTION_SLUGS.has(String(slug ?? ""));
}
