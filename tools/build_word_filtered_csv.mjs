import fs from "node:fs";
import readline from "node:readline";

/**
 * Build word_filtered.csv from word.csv.
 *
 * Input word.csv columns:
 *   word,pos,translation
 *
 * Output word_filtered.csv columns:
 *   word,pos,translation
 *
 * Rules:
 * - pos is inferred from translation column (any "x." at line start treated as POS; unknown tokens kept as-is).
 * - fallbacks when translation lacks POS prefix:
 *   1) ECDICT pos column (word.csv field 2);
 *   2) Chinese inflection glosses (e.g. "mean的过去式和过去分词" → v);
 *   3) -ing forms whose gloss starts with a bracket tag like [计] → v;
 *   4) [计]/[医]/[人名] 等方括号标注、或纯中文释义（无 n./v. 前缀）→ 推断词性。
 * - drop only when all inference paths fail.
 * - handle translation wrapped in quotes and containing commas.
 * - handle multi-pos / multi-sense entries where translation is split by "\n" or "\\n".
 */

const PROJECT = new URL("../", import.meta.url); // tools/ -> project root
const INPUT = new URL("data/dictionary/word.csv", PROJECT);
const OUTPUT = new URL("data/dictionary/word_filtered.csv", PROJECT);

function parseCsvLine(line) {
	const out = [];
	let i = 0;
	let field = "";
	let inQuotes = false;

	while (i < line.length) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				const next = line[i + 1];
				if (next === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i += 1;
				continue;
			}
			field += ch;
			i += 1;
			continue;
		}

		if (ch === ",") {
			out.push(field);
			field = "";
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
			i += 1;
			continue;
		}
		field += ch;
		i += 1;
	}
	out.push(field);
	return out;
}

function csvEscape(s) {
	if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

const POS_TOKEN_MAP = new Map([
	["n", "n"],
	["v", "v"],
	["vi", "vi"],
	["vt", "vt"],
	["adj", "adj"],
	["a", "adj"], // ECDICT 常用 a. 表示 adjective
	["adv", "adv"],
	["prep", "prep"],
	["conj", "conj"],
	["pron", "pron"],
	["num", "num"],
	["art", "art"],
	["interj", "interj"],
	["aux", "aux"],
	["abbr", "abbr"],
	["det", "det"],
	["int", "interj"],
]);

/** 已知词性映射到统一缩写；未收录的按原样保留（小写、去尾点） */
function normalizePosToken(raw) {
	const t = raw.toLowerCase().replace(/\.$/, "");
	return POS_TOKEN_MAP.get(t) ?? t;
}

/** 从释义中推断词性：凡以「字母+点」开头的均视为词性，无论是否在映射表中 */
function inferPosFromTranslation(translationZh) {
	if (!translationZh) return "";
	const tokens = new Set();

	const lines = translationZh.split(/\\n|\r?\n/);
	for (const lineRaw of lines) {
		const line = lineRaw.trimStart();
		if (!line) continue;

		const m = line.match(/^([A-Za-z]+\.)(\s|$)/);
		if (!m) continue;

		const head = line.split(/\s+/, 10);
		for (const part of head) {
			const cleaned = part.replace(/^[(&\[【]*|[)&\],;:】]*$/g, "");
			if (!/^[A-Za-z]+\.?$/.test(cleaned)) break;
			tokens.add(normalizePosToken(cleaned));
		}
	}

	if (tokens.size === 0) return "";
	return Array.from(tokens).sort().join("|");
}

/** ECDICT pos 列（word.csv 第 2 列）非空时作 fallback */
function inferPosFromEcdictColumn(posField) {
	const raw = String(posField ?? "").trim();
	if (!raw) return "";
	const tokens = new Set();
	for (const part of raw.split(/[|,;/\s]+/)) {
		const t = normalizePosToken(part);
		if (t) tokens.add(t);
	}
	if (tokens.size === 0) return "";
	return Array.from(tokens).sort().join("|");
}

/** 中文释义里的屈折说明（过去式、分词等）→ 动词 */
function inferPosFromChineseInflection(translationZh, word) {
	const t = String(translationZh ?? "");
	const w = String(word ?? "").toLowerCase();
	if (/的过去式|的过去分词|的现在分词|的第三人称单数|的过去时/.test(t)) return "v";
	if (/\b(?:过去式|过去分词|现在分词|第三人称单数)\b/.test(t) && /[A-Za-z]{2,}/.test(t)) return "v";
	if (w.endsWith("ing") && /现在分词/.test(t)) return "v";
	if ((w.endsWith("ed") || w.endsWith("en")) && /过去/.test(t)) return "v";
	return "";
}

/** [计] 等方括号领域标 + -ing 形（如 seeking）→ 动词 */
function inferPosFromBracketTaggedIngForm(word, translationZh) {
	const w = String(word ?? "").toLowerCase();
	if (w.length < 4 || !w.endsWith("ing")) return "";
	if (/^\[[^\]]+\]/.test(String(translationZh ?? "").trim())) return "v";
	return "";
}

/** [计]/[医]/[人名] 等标注，或纯中文/口语释义 → 词性 */
function inferPosFromBracketOrBareChinese(translationZh) {
	const t = String(translationZh ?? "").trim();
	if (!t) return "";

	if (/^啊|^哦|^嗯|^哎|^呀|表大叫|表惊叹|非正式.*叫/.test(t)) return "interj";
	if (/\[人名\]|\[地名\]|\[电影\]|\[品牌\]|人名\]|地名\]/.test(t)) return "n";
	if (/\[形\]|\[形语\]|形容词/.test(t)) return "adj";
	if (/\[副\]|副词/.test(t)) return "adv";
	if (/\[动\]|动词/.test(t)) return "v";
	if (/\[介\]|介词/.test(t)) return "prep";
	if (/\[连\]|连词/.test(t)) return "conj";
	if (/\[代\]|代词/.test(t)) return "pron";
	if (/\[数\]|数词/.test(t)) return "num";
	if (/\[叹\]|叹词/.test(t)) return "interj";

	if (/^\[[^\]]+\]/.test(t)) {
		if (/缩略|缩写|\bof\b|\bfor\b|\bthe\b/i.test(t)) return "abbr";
		return "n";
	}

	// 纯中文或中英混排、但无 n./v. 前缀（如 google → 谷歌；搜索引擎…）
	if (/[\u4e00-\u9fff]/.test(t) && !/^[A-Za-z]+\./.test(t)) return "n";

	return "";
}

function inferPos(word, posField, translationZh) {
	return (
		inferPosFromTranslation(translationZh) ||
		inferPosFromEcdictColumn(posField) ||
		inferPosFromChineseInflection(translationZh, word) ||
		inferPosFromBracketTaggedIngForm(word, translationZh) ||
		inferPosFromBracketOrBareChinese(translationZh)
	);
}

async function main() {
	if (!fs.existsSync(INPUT)) {
		console.error(`Missing input: ${INPUT.pathname}`);
		process.exitCode = 1;
		return;
	}

	const inStream = fs.createReadStream(INPUT, { encoding: "utf8" });
	const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity });

	const outStream = fs.createWriteStream(OUTPUT, { encoding: "utf8" });
	outStream.write("word,pos,translation\n");

	let isFirst = true;
	let kept = 0;
	let dropped = 0;

	for await (const line of rl) {
		if (isFirst) {
			isFirst = false;
			continue; // header
		}
		if (!line) continue;

		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim();
		const posField = (fields[1] ?? "").trim();
		const translation = (fields[2] ?? "").trim();

		const pos = inferPos(word, posField, translation);
		if (!pos) {
			dropped += 1;
			continue;
		}

		outStream.write(`${word},${csvEscape(pos)},${csvEscape(translation)}\n`);
		kept += 1;
	}

	await new Promise((resolve) => outStream.end(resolve));
	console.log(`Done. kept=${kept} dropped=${dropped} -> ${OUTPUT.pathname}`);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});

