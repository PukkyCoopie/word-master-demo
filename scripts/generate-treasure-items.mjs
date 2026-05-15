/**
 * 一次性生成 src/treasures/items/*.js 与更新 design/treasure_concepts.txt
 * 运行: node scripts/generate-treasure-items.mjs
 *
 * 注意：当前仓库内简介已改为 describe()/rarity/mult/score/money 片段数组，
 * 若再运行本脚本会覆盖为纯字符串；请改脚本输出或手改后再生成。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const itemsDir = path.join(root, "src", "treasures", "items");
const conceptsPath = path.join(root, "design", "treasure_concepts.txt");
const jsonPath = path.join(root, "design", "treasure_concepts_with_emoji.json");

/**
 * 顺序与 treasure_concepts.txt 中非空宝藏行一致。
 * emoji 全表唯一（便于货架与飞行动效区分）。
 */
const ITEMS = [
  ["global_mult", 2, "rare", "老式闹钟", "⏰", "+4倍率"],
  ["letter_common_mult", 5, "rare", "绘图铅笔", "✏️", "拼写的普通字母在记分时给予+1倍率"],
  ["letter_rare_mult", 5, "rare", "钢笔", "🖋️", "拼写的稀有字母在记分时给予+2倍率"],
  ["letter_epic_mult", 5, "rare", "蘸水羽毛笔", "🪶", "拼写的史诗字母在记分时给予+4倍率"],
  ["letter_legend_mult", 5, "rare", "冠军奖杯", "🏆", "拼写的传说字母在记分时给予+7倍率"],
  ["streak_letter_mult", 4, "rare", "铁链扣", "🔗", "如果单词中包含连续的相同字母，+10倍率"],
  ["triple_letter_mult", 5, "rare", "复读机", "📻", "如果单词中某个字母出现的次数为3次或以上，+10倍率"],
  ["unique_letters_mult", 3, "rare", "手持镜", "🪞", "如果单词中不包含重复的字母，+6倍率"],
  ["three_rarities_mult", 4, "rare", "三色团子", "🍡", "如果单词中包含至少3种稀有度，+16倍率"],
  ["uniform_rarity_mult", 4, "rare", "红砖", "🧱", "如果单词中所有字母的稀有度相同，+12倍率"],
  ["streak_letter_score", 4, "rare", "传真机", "📠", "如果单词中包含连续的相同字母，+100分数"],
  ["triple_letter_score", 5, "rare", "三明治", "🥪", "如果单词中某个字母出现的次数为3次或以上，+100分数"],
  ["unique_letters_score", 3, "rare", "雪花挂件", "❄️", "如果单词中不包含重复的字母，+60分数"],
  ["three_rarities_score", 4, "rare", "甜筒", "🍦", "如果单词中包含至少3种稀有度，+150分数"],
  ["uniform_rarity_score", 4, "rare", "西装领带", "👔", "如果单词中所有字母的稀有度相同，+120分数"],
  ["short_word_mult", 5, "rare", "腕表", "⌚", "如果单词的长度为3或更短，+30倍率"],
  ["empty_slot_mult", 8, "epic", "空礼盒", "🎁", "你每有一个空的宝藏槽位便获得x1倍率（当前x1）"],
  ["spare_removal_score", 5, "rare", "餐刀", "🔪", "你每剩余一次移除机会，+40分数"],
  ["no_removal_mult", 5, "rare", "挂锁", "🔒", "当没有移除机会时，+20倍率"],
  ["word_streak_x4", 5, "epic", "篮球", "🏀", "每拼写5个单词，具有一次x4倍率"],
  ["random_0_26_mult", 4, "rare", "骰子", "🎲", "随机+0-26倍率"],
  ["last_word_rescore", 5, "epic", "助威喇叭", "📣", "每关最后一个单词会额外触发一次字母计分"],
  ["top_rarity_score_to_mult", 5, "rare", "望远镜", "🔭", "会将棋盘中最高的稀有度对应的奖励分数添加至倍率"],
  ["shop_free_refresh", 4, "rare", "入场券", "🎟️", "每次进入商店获得1次免费刷新"],
  ["subset_letters_mult", 8, "epic", "邮简", "💌", "每一个拼写的A,B,C,E,H,M,U给予+4倍率"],
  ["per_treasure_mult", 4, "rare", "念珠", "📿", "你每有一个宝藏，+4倍率"],
  ["idle_removal_payout", 4, "rare", "存钱罐", "🐷", "在关卡完成时，如果你没有使用过移除，则每个移除机会会给予你$2"],
  ["retrigger_abcde", 6, "epic", "电钢琴", "🎹", "重新触发所有拼写的A,B,C,D,E"],
  ["fragile_mult", 5, "rare", "泡泡棒", "🫧", "+20倍率，在关卡完成时1/6的概率摧毁自身"],
  ["vowel_mode", 5, "epic", "小提琴", "🎻", "所有字母均视为元音字母"],
  ["consonant_mode", 5, "epic", "架子鼓", "🥁", "所有字母均视为辅音字母"],
  ["vowel_flat_score", 5, "rare", "蜂蜜罐", "🍯", "每一个拼写的元音字母给予+40分数"],
  ["vowel_flat_mult", 5, "rare", "气球", "🎈", "每一个拼写的元音字母给予+4倍率"],
  ["consonant_flat_score", 5, "rare", "卵石", "🪨", "每一个拼写的辅音字母给予+40分数"],
  ["consonant_flat_mult", 5, "rare", "冰块", "🧊", "每一个拼写的辅音字母给予+4倍率"],
  ["letter_e_bonus", 4, "rare", "头戴耳机", "🎧", "字母E在记分时给予+20分数和+4倍率"],
  ["vowel_gamble_coin", 4, "rare", "老虎机", "🎰", "元音字母在记分时有1/2概率使你获得$2"],
  ["word_length_counts_mult", 5, "rare", "家用梯", "🪜", "将每种长度的单词在本轮游戏内被拼写过的次数添加至倍率"],
  ["length_level_chance", 5, "epic", "冲浪板", "🏄", "有1/4的几率升级拼写单词的长度等级"],
  ["non_noun_streak", 6, "rare", "戏剧面具", "🎭", "每当你拼写出一个不是名词的单词，获得+1倍率（当前+0）"],
  ["sell_price_tick", 4, "rare", "旧行李箱", "🧳", "在关卡完成时本宝藏的出售价格提高$3"],
  ["removal_to_spell_start", 7, "epic", "礼帽", "🎩", "开局时候将你的所有移除机会转换为拼写机会"],
  ["rare_board_mult", 6, "epic", "小油灯", "🪔", "如果棋盘中剩下的都是普通或稀有字母，x3倍率"],
  ["unique_word_score", 5, "rare", "滑板", "🛹", "每当你拼写的单词不包含重复的字母，获得+20分数（当前+0）"],
  ["first_word_dup_legend", 8, "legendary", "双人立牌", "👯", "如果关卡中拼写的第一个单词只有3个字母或更少，则将第一个字母的一个相同的复制洗入牌库"],
  ["tiny_words_ok", 3, "rare", "水果糖", "🍬", "你可以拼写长度为1或2的单词"],
  ["deck_remain_score", 5, "rare", "钓鱼竿", "🎣", "你的牌库中每剩余一个字母，+2分数（当前+0）"],
  ["first_solo_removal_cut", 6, "epic", "裁缝剪", "✂️", "如果关卡的第一次移除只有一个字母，则将其从牌库中永久移除并获得$3"],
];

function escStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

{
  const seen = new Map();
  for (const row of ITEMS) {
    const [, , , , emoji] = row;
    if (seen.has(emoji)) {
      throw new Error(`重复 emoji：${emoji}（${seen.get(emoji)} 与 ${row[0]}）`);
    }
    seen.set(emoji, row[0]);
  }
}

fs.mkdirSync(itemsDir, { recursive: true });
for (const file of fs.readdirSync(itemsDir)) {
  if (file.endsWith(".js")) fs.unlinkSync(path.join(itemsDir, file));
}

for (const [index, [treasureId, price, rarity, name, emoji, description]] of ITEMS.entries()) {
  const body = `/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  treasureId: '${treasureId}',
  price: ${price},
  rarity: '${rarity}',
  name: '${escStr(name)}',
  emoji: '${emoji}',
  description: '${escStr(description)}',
};
`;
  fs.writeFileSync(path.join(itemsDir, `treasure_${index + 1}.js`), body, "utf8");
}

const lines = ITEMS.map(
  ([id, price, rarity, name, emoji, desc]) =>
    `${price}\t${rarity}\t${name}\t${emoji}\t${desc}`,
);
fs.writeFileSync(conceptsPath, [...lines, ""].join("\n"), "utf8");

const json = {
  version: 2,
  source: "design/treasure_concepts.txt",
  treasures: ITEMS.map(([treasureId, price, rarity, name, emoji, description], i) => ({
    index: i + 1,
    treasureId,
    price,
    rarity,
    name,
    emoji,
    description,
  })),
};
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");

console.log(`Wrote ${ITEMS.length} files to ${path.relative(root, itemsDir)}`);
