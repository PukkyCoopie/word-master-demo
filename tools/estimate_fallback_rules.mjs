import fs from "node:fs";
import readline from "node:readline";
import {
	hintTranslationLineIsFallbackOnly,
	hintWordIsFallbackOnlyFromDefinition,
} from "../src/dictionary/dictionaryLexical.js";
import { parseTranslationLines } from "../src/dictionary/parseTranslationLines.js";

/** @param {string} line */
function parseCsvRow(line) {
	const first = line.indexOf(",");
	const second = line.indexOf(",", first + 1);
	return {
		word: line.slice(0, first),
		pos: line.slice(first + 1, second),
		translation: line.slice(second + 1).replace(/^"|"$/g, ""),
	};
}

const RULES = [
	["人名(已有)", /人名/],
	["地名", /地名/],
	["国名|州|城市|镇|山|河|湖", /(?:国名|州名|城市名|镇名|山名|河名|湖名)/],
	["男子名|女子名", /(?:男子名|女子名)/],
	["男名|女名", /(?:男名|女名)/],
	["昵称|绰号|外号", /(?:昵称|绰号|外号)/],
	["教名", /教名/],
	["姓氏|姓氏名", /(?:姓氏|姓氏名)/],
	["英格兰/苏格兰/爱尔兰姓氏", /(?:英格兰人姓氏|苏格兰人姓氏|爱尔兰姓氏)/],
	["商品|商标|品牌|公司", /(?:商品名|商标名|商标名称|品牌名|公司名称|公司名)/],
	["影视书游歌曲", /(?:电影名|电影名称|书名|剧名|游戏名|歌曲名)/],
	["俚语|方言|古语|罕旧", /(?:俚语|方言|古语|废词|\[罕\]|\[旧\]|\[口\]|\[俚\]|\[方\])/],
];

/** @param {string} line @param {RegExp | null} extraRe */
function isFallbackLine(line, extraRe) {
	if (hintTranslationLineIsFallbackOnly(line)) return true;
	if (extraRe?.test(line)) return true;
	return false;
}

/** @param {{ pos: string, translation: string }} def @param {RegExp | null} extraRe */
function isWordFallbackAll(def, extraRe) {
	const lines = parseTranslationLines(def.translation);
	if (!lines.length) {
		return hintWordIsFallbackOnlyFromDefinition(
			{ pos: def.pos, translation_zh: def.translation },
			Boolean(def.pos),
		);
	}
	return lines.every((line) => isFallbackLine(line, extraRe));
}

/** @type {Map<string, { hit: number, newlyAll: number, newlyAny: number, samples: string[] }>} */
const stats = new Map(
	RULES.map(([k]) => [k, { hit: 0, newlyAll: 0, newlyAny: 0, samples: [] }]),
);

const rl = readline.createInterface({
	input: fs.createReadStream(new URL("../data/dictionary/word_filtered.csv", import.meta.url), {
		encoding: "utf8",
	}),
	crlfDelay: Infinity,
});

let first = true;
let total = 0;
let currentAll = 0;

for await (const line of rl) {
	if (first) {
		first = false;
		continue;
	}
	if (!line) continue;
	total++;
	const def = parseCsvRow(line);
	const already = isWordFallbackAll(def, null);
	if (already) currentAll++;

	for (const [key, re] of RULES) {
		const lines = parseTranslationLines(def.translation);
		const anyHit = lines.some((l) => re.test(l));
		if (!anyHit) continue;
		const st = stats.get(key);
		st.hit++;
		if (!already) {
			st.newlyAny++;
			if (isWordFallbackAll(def, re)) {
				st.newlyAll++;
				if (st.samples.length < 3) {
					st.samples.push(
						`${def.word}: ${def.translation.replace(/\\n/g, " | ").slice(0, 95)}`,
					);
				}
			}
		}
	}
}

console.log(`总词条 ${total}，当前整词兜底 ${currentAll} (${((currentAll / total) * 100).toFixed(1)}%)`);
console.log("\n规则\t任一行命中\t其中非兜底词\t新增整词兜底");
for (const [key] of RULES) {
	const st = stats.get(key);
	console.log(`${key}\t${st.hit}\t${st.newlyAny}\t+${st.newlyAll}`);
	for (const s of st.samples) console.log(`  例: ${s}`);
}

// 若改为：任一行命中即整词兜底
let anyLinePolicy = 0;
const rl2 = readline.createInterface({
	input: fs.createReadStream(new URL("../data/dictionary/word_filtered.csv", import.meta.url), {
		encoding: "utf8",
	}),
	crlfDelay: Infinity,
});
first = true;
const ANY_RE =
	/(?:人名|地名|(?:男子|女子|男|女)名|教名|昵称|绰号|外号|姓氏|国名|州名|城市名|镇名|商品名|商标名|品牌名|公司名|电影名|书名|剧名|游戏名|歌曲名)/;
for await (const line of rl2) {
	if (first) {
		first = false;
		continue;
	}
	if (!line) continue;
	const def = parseCsvRow(line);
	if (!isWordFallbackAll(def, null) && parseTranslationLines(def.translation).some((l) => ANY_RE.test(l))) {
		anyLinePolicy++;
	}
}
console.log(`\n若「任一行命中专名/人名类即整词兜底」：额外 ${anyLinePolicy} 词进入兜底池`);
