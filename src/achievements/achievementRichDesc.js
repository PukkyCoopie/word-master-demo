import { describe, gain, money, rarity } from "../treasures/treasureDescription.js";

/** @type {Readonly<Record<string, import('../treasures/treasureDescription.js').TreasureDescSegment[]>>} */
export const ACHIEVEMENT_RICH_DESCRIPTIONS = Object.freeze({
  reach_4_1: describe("达到关卡", "4-1"),
  reach_8_1: describe("达到关卡", "8-1"),
  win_run: describe("赢得一轮游戏"),
  words_50: describe("拼写", "50", "个单词"),
  words_100: describe("拼写", "100", "个单词"),
  words_200: describe("拼写", "200", "个单词"),
  tiles_used_250: describe("使用", "250", "个字母块"),
  tiles_used_500: describe("使用", "500", "个字母块"),
  tiles_used_1000: describe("使用", "1000", "个字母块"),
  discard_200: describe("弃掉", "200", "个字母块"),
  discard_400: describe("弃掉", "400", "个字母块"),
  discard_800: describe("弃掉", "800", "个字母块"),
  wallet_400: describe("拥有", money("400")),
  interest_200: describe("在一轮游戏中获得", money("200"), "利息"),
  spend_500: describe("在一轮游戏中花费", money("500")),
  all_wildcard_word: describe("拼写一个仅由", gain("万能块"), "组成的单词"),
  one_word_per_level_win: describe("在每个关卡仅拼写", "1", "个单词的情况下赢得一轮游戏"),
  no_discard_win: describe("在没有使用任何丢弃次数的情况下赢得一轮游戏"),
  no_reroll_win: describe("在没有重掷过商店的情况下赢得一轮游戏"),
  letter_score_4: describe("在一次拼写中对一个字母触发", "4", "次计分"),
  double_ice_break: describe("在一次拼写中使", "2", "张碎冰块同时碎裂"),
  five_vouchers_at_4_1: describe("在抵达关卡", "4-1", "时拥有", "5", "张优惠券"),
  length_level_10: describe("使任何长度等级提升至", "10"),
  rarity_level_8: describe("使任何稀有度等级提升至", "8"),
  score_10k: describe("单次拼写获得", "10,000", "分"),
  score_1m: describe("单次拼写获得", "1,000,000", "分"),
  score_1b: describe("单次拼写获得", "1,000,000,000", "分"),
  word_len_9: describe("拼写一个长度为", "9", "或更高的单词"),
  word_len_11: describe("拼写一个长度为", "11", "或更高的单词"),
  word_len_16: describe("拼写一个长度为", "16", "的单词"),
  deck_100: describe("使你字母库中的字母块数增加到", "100", "或更高"),
  deck_40: describe("使你字母库中的字母块数减少到", "40", "或更低"),
  all_treasures: describe("发现所有宝藏"),
  all_spells: describe("发现所有法术卡"),
  all_upgrades: describe("发现所有升级卡"),
  all_vouchers: describe("发现所有优惠券"),
  all_materials: describe("发现所有材质"),
  all_accessories: describe("发现所有配饰"),
  diff_3_win: describe("在开启难度", "3", "的情况下赢得一轮游戏"),
  diff_6_win: describe("在开启难度", "6", "的情况下赢得一轮游戏"),
  diff_8_win: describe("在开启难度", "8", "的情况下赢得一轮游戏"),
  safe_bomb_blast: describe("使一个炸弹在爆炸时不摧毁其他宝藏"),
  volcano_eruption: describe("经历一次火山喷发"),
  lucky_five_run: describe("在一轮游戏中触发", "5", "次", gain("幸运块"), "的效果"),
  steel_four_submit: describe("在一次计分中获得", "4", "次来自", gain("钢铁块"), "的增强"),
  legendary_treasure: describe("获得一个", rarity("传说"), "级宝藏"),
});

/** @param {import('./achievementTypes.js').AchievementDefinition} def */
export function getAchievementDescriptionSegments(def) {
  if (!def?.id) return describe("");
  return ACHIEVEMENT_RICH_DESCRIPTIONS[def.id] ?? describe(String(def.description ?? ""));
}
