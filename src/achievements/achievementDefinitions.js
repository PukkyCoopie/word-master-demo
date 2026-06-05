import { ACHIEVEMENT_ICON_URL, getAchievementIconPath } from "./achievementAssets.js";

/** @type {readonly import('./achievementTypes.js').AchievementDefinition[]} */
export const ACHIEVEMENT_DEFINITIONS = Object.freeze([
  { id: "reach_4_1", name: "赛程过半", description: "达到关卡4-1", condition: { kind: "career_level_reached", levelId: "4-1" } },
  { id: "reach_8_1", name: "胜利在望", description: "达到关卡8-1", condition: { kind: "career_level_reached", levelId: "8-1" } },
  { id: "win_run", name: "胜利！", description: "赢得一轮游戏", condition: { kind: "run_win" } },
  { id: "words_50", name: "小试牛刀", description: "拼写50个单词", condition: { kind: "career_words", threshold: 50 } },
  { id: "words_100", name: "渐入佳境", description: "拼写100个单词", condition: { kind: "career_words", threshold: 100 } },
  { id: "words_200", name: "大显身手", description: "拼写200个单词", condition: { kind: "career_words", threshold: 200 } },
  { id: "tiles_used_250", name: "一小堆字母", description: "使用250个字母块", condition: { kind: "career_tiles_used", threshold: 250 } },
  { id: "tiles_used_500", name: "一大堆字母", description: "使用500个字母块", condition: { kind: "career_tiles_used", threshold: 500 } },
  { id: "tiles_used_1000", name: "字母山！", description: "使用1000个字母块", condition: { kind: "career_tiles_used", threshold: 1000 } },
  { id: "discard_200", name: "丢垃圾", description: "弃掉200个字母块", condition: { kind: "career_tiles_discarded", threshold: 200 } },
  { id: "discard_400", name: "大扫除", description: "弃掉400个字母块", condition: { kind: "career_tiles_discarded", threshold: 400 } },
  { id: "discard_800", name: "垃圾清运", description: "弃掉800个字母块", condition: { kind: "career_tiles_discarded", threshold: 800 } },
  { id: "wallet_400", name: "大富翁", description: "拥有$400", condition: { kind: "career_wallet_peak", threshold: 400 } },
  { id: "interest_200", name: "理财专家", description: "在一轮游戏中获得$200利息", condition: { kind: "run_interest_total", threshold: 200 } },
  { id: "spend_500", name: "挥金如土", description: "在一轮游戏中花费$500", condition: { kind: "run_money_spent", threshold: 500 } },
  { id: "all_wildcard_word", name: "光彩夺目", description: "拼写一个仅由万能块组成的单词", condition: { kind: "submit_all_wildcard" } },
  { id: "one_word_per_level_win", name: "一字千金", description: "在每个关卡仅拼写1个单词的情况下赢得一轮游戏", condition: { kind: "run_one_word_per_level_win" } },
  { id: "no_discard_win", name: "环境保护", description: "在没有使用任何丢弃次数的情况下赢得一轮游戏", condition: { kind: "run_no_discard_win" } },
  { id: "no_reroll_win", name: "顺其自然", description: "在没有重掷过商店的情况下赢得一轮游戏", condition: { kind: "run_no_reroll_win" } },
  { id: "letter_score_4", name: "似曾相识", description: "在一次拼写中对一个字母触发4次计分", condition: { kind: "submit_letter_score_triggers", threshold: 4 } },
  { id: "double_ice_break", name: "雪上加霜", description: "在一次拼写中使2张碎冰块同时碎裂", condition: { kind: "submit_double_ice" } },
  { id: "five_vouchers_at_4_1", name: "购物狂人", description: "在抵达关卡4-1时拥有5张优惠券", condition: { kind: "level_vouchers", levelId: "4-1", voucherCount: 5 } },
  { id: "length_level_10", name: "登峰造极", description: "使任何长度等级提升至10", condition: { kind: "max_length_level", threshold: 10 } },
  { id: "rarity_level_8", name: "炉火纯青", description: "使任何稀有度等级提升至8", condition: { kind: "max_rarity_level", threshold: 8 } },
  { id: "score_10k", name: "初露锋芒", description: "单次拼写获得10,000分", condition: { kind: "submit_score", threshold: 10000 } },
  { id: "score_1m", name: "技惊四座", description: "单次拼写获得1,000,000分", condition: { kind: "submit_score", threshold: 1000000 } },
  { id: "score_100m", name: "威震天下", description: "单次拼写获得100,000,000分", condition: { kind: "submit_score", threshold: 100000000 } },
  { id: "word_len_9", name: "屈指可数", description: "拼写一个长度为9或更高的单词", condition: { kind: "submit_word_length", threshold: 9 } },
  { id: "word_len_11", name: "凤毛麟角", description: "拼写一个长度为11或更高的单词", condition: { kind: "submit_word_length", threshold: 11 } },
  { id: "word_len_16", name: "举世无双", description: "拼写一个长度为16的单词", condition: { kind: "submit_word_length", threshold: 16, exactLength: true } },
  { id: "deck_100", name: "包罗万象", description: "使你牌库中的字母块数增加到100或更高", condition: { kind: "deck_size", threshold: 100 } },
  { id: "deck_40", name: "大道至简", description: "使你牌库中的字母块数减少到40或更低", condition: { kind: "deck_size", threshold: 40, exactLength: false } },
  { id: "all_treasures", name: "琳琅满目", description: "发现所有宝藏", condition: { kind: "discover_all_treasures" } },
  { id: "all_spells", name: "奥术大师", description: "发现所有法术卡", condition: { kind: "discover_all_spells" } },
  { id: "all_upgrades", name: "更上一层楼", description: "发现所有升级卡", condition: { kind: "discover_all_upgrades" } },
  { id: "all_vouchers", name: "精打细算", description: "发现所有优惠券", condition: { kind: "discover_all_vouchers" } },
  { id: "all_materials", name: "点石成金", description: "发现所有材质", condition: { kind: "discover_all_materials" } },
  { id: "all_accessories", name: "珠光宝气", description: "发现所有配饰", condition: { kind: "discover_all_accessories" } },
  { id: "diff_3_win", name: "单词高手", description: "在开启难度3的情况下赢得一轮游戏", condition: { kind: "run_difficulty_win", difficultyIndex: 2 } },
  { id: "diff_6_win", name: "单词专家", description: "在开启难度6的情况下赢得一轮游戏", condition: { kind: "run_difficulty_win", difficultyIndex: 5 } },
  { id: "diff_8_win", name: "单词大师", description: "在开启难度8的情况下赢得一轮游戏", condition: { kind: "run_difficulty_win", difficultyIndex: 7 } },
]);

export const ACHIEVEMENT_TOTAL = ACHIEVEMENT_DEFINITIONS.length;

/** @type {ReadonlyMap<string, import('./achievementTypes.js').AchievementDefinition>} */
export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENT_DEFINITIONS.map((d) => [d.id, d]));

/** @param {string} id */
export function getAchievementDef(id) {
  return ACHIEVEMENTS_BY_ID.get(String(id ?? "").trim()) ?? null;
}

/** @param {import('./achievementTypes.js').AchievementDefinition} def */
export function getAchievementIconUrl(def) {
  if (!def) return ACHIEVEMENT_ICON_URL;
  return def.iconUrl ?? getAchievementIconPath(def.id);
}
