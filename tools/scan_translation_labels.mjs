import fs from "node:fs";
import readline from "node:readline";

const patterns = [
	["人名", /人名/],
	["姓名", /姓名/],
	["男名", /男名/],
	["女名", /女名/],
	["男姓名", /男姓名/],
	["女姓名", /女姓名/],
	["地名", /地名/],
	["国名", /国名/],
	["州名", /州名/],
	["城市名", /城市名/],
	["镇名", /镇名/],
	["山名", /山名/],
	["河名", /河名/],
	["湖名", /湖名/],
	["专名", /专名/],
	["商标", /商标/],
	["品牌", /品牌/],
	["公司名", /公司名/],
	["机构名", /机构名/],
	["电影名", /电影名/],
	["书名", /书名/],
	["剧名", /剧名/],
	["歌曲名", /歌曲名/],
	["绰号", /绰号/],
	["昵称", /昵称/],
	["外号", /外号/],
	["俚语", /俚语/],
	["方言", /方言/],
	["古语", /古语/],
	["废词", /废词/],
	["罕", /\[罕\]|罕用/],
	["旧", /\[旧\]|旧词/],
	["口", /\[口\]/],
	["俚", /\[俚\]/],
	["方", /\[方\]/],
	["医", /\[医\]/],
	["化", /\[化\]/],
	["计", /\[计\]/],
	["经", /\[经\]/],
	["法", /\[法\]/],
	["物", /\[物\]/],
	["数", /\[数\]/],
	["生", /\[生\]/],
	["动", /\[动\]/],
	["植", /\[植\]/],
	["矿", /\[矿\]/],
	["史", /\[史\]/],
	["哲", /\[哲\]/],
	["神", /\[神\]/],
	["宗", /\[宗\]/],
	["外", /\[外\]/],
	["括号专名标签", /[\[【(（](?:人名|姓名|男名|女名|男姓名|女姓名|地名|国名|专名|商标|品牌|绰号|昵称|外号)[\]】)）]/],
	["括号姓", /[\[【(（]姓[\]】)）]/],
];

/** @param {string} line */
function parseTranslationField(line) {
	const first = line.indexOf(",");
	const second = line.indexOf(",", first + 1);
	return second >= 0 ? line.slice(second + 1).replace(/^"|"$/g, "") : "";
}

const counts = Object.fromEntries(patterns.map(([k]) => [k, 0]));
const samples = Object.fromEntries(patterns.map(([k]) => [k, []]));

const rl = readline.createInterface({
	input: fs.createReadStream(new URL("../data/dictionary/word_filtered.csv", import.meta.url), {
		encoding: "utf8",
	}),
	crlfDelay: Infinity,
});

let first = true;
let rows = 0;
for await (const line of rl) {
	if (first) {
		first = false;
		continue;
	}
	if (!line) continue;
	rows++;
	const word = line.split(",")[0];
	const trans = parseTranslationField(line);
	for (const [name, re] of patterns) {
		if (!re.test(trans)) continue;
		counts[name]++;
		if (samples[name].length < 3) {
			samples[name].push(`${word}: ${trans.replace(/\\n/g, " ").slice(0, 90)}`);
		}
	}
}

console.log(`rows ${rows}`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
	if (v === 0) continue;
	console.log(`\n${k}: ${v}`);
	for (const s of samples[k]) console.log(`  ${s}`);
}
