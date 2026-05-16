/**
 * 关底 / 终局 Boss 定义（与策划 v3.2 表一致）。
 * `m` = scoreRequirementMult，Boss 关目标 = round(B × 2 × m)。
 */

/** @typedef {{ slug: string, nameZh: string, m: number, uiDescription: string, kind: 'normal' | 'showdown' | 'disabled' }} BossBlindDef */

/** @type {Record<string, BossBlindDef>} */
export const BOSS_BY_SLUG = Object.freeze({
  the_hook: {
    slug: "the_hook",
    nameZh: "倒钩",
    m: 1,
    uiDescription: "每次拼词后，场上随机四格被削弱",
    kind: "normal",
  },
  the_ox: {
    slug: "the_ox",
    nameZh: "公牛",
    m: 1,
    uiDescription: "拼出最常拼写的长度的单词时，资金归零",
    kind: "normal",
  },
  the_wall: {
    slug: "the_wall",
    nameZh: "高墙",
    m: 2,
    uiDescription: "通关所需分数大幅提高",
    kind: "normal",
  },
  the_arm: {
    slug: "the_arm",
    nameZh: "折臂",
    m: 1,
    uiDescription: "成功计分后，本词的词长等级降一级",
    kind: "normal",
  },
  the_club: {
    slug: "the_club",
    nameZh: "棘梅",
    m: 1,
    uiDescription: "仅允许拼写指定词性（开局随机）",
    kind: "normal",
  },
  the_psychic: {
    slug: "the_psychic",
    nameZh: "灵媒",
    m: 1,
    uiDescription: "仅允许拼写长度为5的单词",
    kind: "normal",
  },
  the_water: {
    slug: "the_water",
    nameZh: "死水",
    m: 1,
    uiDescription: "本关不能移除字母。",
    kind: "normal",
  },
  the_manacle: {
    slug: "the_manacle",
    nameZh: "镣铐",
    m: 1,
    uiDescription: "棋盘仅拥有3行容量",
    kind: "normal",
  },
  the_eye: {
    slug: "the_eye",
    nameZh: "冷眼",
    m: 1,
    uiDescription: "本关内不得拼写重复长度的单词",
    kind: "normal",
  },
  the_mouth: {
    slug: "the_mouth",
    nameZh: "独口",
    m: 1,
    uiDescription: "本关内只允许拼写一种长度的单词",
    kind: "normal",
  },
  the_plant: {
    slug: "the_plant",
    nameZh: "枯植",
    m: 1,
    uiDescription: "所有稀有字母被削弱",
    kind: "normal",
  },
  the_vowel: {
    slug: "the_vowel",
    nameZh: "枯元",
    m: 1,
    uiDescription: "所有元音字母被削弱",
    kind: "normal",
  },
  the_consonant: {
    slug: "the_consonant",
    nameZh: "枯辅",
    m: 1,
    uiDescription: "所有辅音字母被削弱",
    kind: "normal",
  },
  the_serpent: {
    slug: "the_serpent",
    nameZh: "游蛇",
    m: 1,
    uiDescription: "拼写或丢弃字母后，总是补充4个字母",
    kind: "normal",
  },
  the_pillar: {
    slug: "the_pillar",
    nameZh: "残柱",
    m: 1,
    uiDescription: "前两小关使用过的字母会被削弱",
    kind: "normal",
  },
  the_needle: {
    slug: "the_needle",
    nameZh: "细针",
    m: 0.5,
    uiDescription: "本关只能拼一次单词",
    kind: "normal",
  },
  the_tooth: {
    slug: "the_tooth",
    nameZh: "獠牙",
    m: 1,
    uiDescription: "每拼写一个字母，损失$1",
    kind: "normal",
  },
  the_flint: {
    slug: "the_flint",
    nameZh: "燧石",
    m: 1,
    uiDescription: "词长和稀有度提供的基础分数和倍率减半",
    kind: "normal",
  },
  amber_acorn: {
    slug: "amber_acorn",
    nameZh: "琥珀橡子",
    m: 1,
    uiDescription: "翻转并打乱所有宝藏",
    kind: "showdown",
  },
  verdant_leaf: {
    slug: "verdant_leaf",
    nameZh: "苍翠叶",
    m: 1,
    uiDescription: "在你卖出一个宝藏前，所有卡牌都是削弱状态",
    kind: "showdown",
  },
  violet_vessel: {
    slug: "violet_vessel",
    nameZh: "紫晶瓮",
    m: 3,
    uiDescription: "通关所需分数巨幅提高",
    kind: "showdown",
  },
  crimson_heart: {
    slug: "crimson_heart",
    nameZh: "绯红之心",
    m: 1,
    uiDescription: "每次拼词，使随机一个宝藏失效",
    kind: "showdown",
  },
  cerulean_bell: {
    slug: "cerulean_bell",
    nameZh: "青铃锁",
    m: 1,
    uiDescription: "迫使一个字母总是被选中",
    kind: "showdown",
  },
});

/** 普通关底 Boss 池（x-3） */
export const NORMAL_BOSS_SLUGS = Object.freeze(Object.keys(BOSS_BY_SLUG).filter((s) => BOSS_BY_SLUG[s].kind === "normal"));

/** 终局 Showdown 池（8-3） */
export const SHOWDOWN_BOSS_SLUGS = Object.freeze(
  Object.keys(BOSS_BY_SLUG).filter((s) => BOSS_BY_SLUG[s].kind === "showdown"),
);

/**
 * @param {string | null | undefined} slug
 * @returns {BossBlindDef | null}
 */
export function getBossDef(slug) {
  const k = String(slug ?? "");
  return BOSS_BY_SLUG[k] ?? null;
}

/**
 * @param {string | null | undefined} slug
 * @returns {number}
 */
export function getBossScoreMult(slug) {
  const d = getBossDef(slug);
  if (!d) return 1;
  const m = Number(d.m);
  return Number.isFinite(m) && m > 0 ? m : 1;
}
