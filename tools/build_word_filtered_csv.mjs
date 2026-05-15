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
 * - drop only when no line in translation has a POS-like prefix.
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
		const translation = (fields[2] ?? "").trim();

		const pos = inferPosFromTranslation(translation);
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

