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
 *   3) -ing forms whose gloss starts with a bracket tag like [计] → v.
 * - drop only when all inference paths fail.
 * - handle translation wrapped in quotes and containing commas.
 * - handle multi-pos / multi-sense entries where translation is split by "\n" or "\\n".
 * - when pos is known but a gloss line lacks a leading "x." prefix, inject it (scheme A).
 */

import {
	materializeTranslationWithPosPrefix,
	normalizePosToken,
} from "./dictionary_pos_prefix.mjs";
import { csvEscape, csvReadyTranslation, parseCsvLine } from "./dictionary_csv_utils.mjs";

const PROJECT = new URL("../", import.meta.url); // tools/ -> project root
const INPUT = new URL("data/dictionary/word.csv", PROJECT);
const OUTPUT = new URL("data/dictionary/word_filtered.csv", PROJECT);

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

function inferPos(word, posField, translationZh) {
	return (
		inferPosFromTranslation(translationZh) ||
		inferPosFromEcdictColumn(posField) ||
		inferPosFromChineseInflection(translationZh, word) ||
		inferPosFromBracketTaggedIngForm(word, translationZh) ||
		// ECDICT 大量词条 pos 为空且中文无 n./v. 前缀；有释义时默认名词，避免整词丢失
		(String(translationZh ?? "").trim() ? "n" : "")
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

		const translationOut = csvReadyTranslation(
			materializeTranslationWithPosPrefix(translation, pos),
		);
		outStream.write(`${word},${csvEscape(pos)},${csvEscape(translationOut)}\n`);
		kept += 1;
	}

	await new Promise((resolve) => outStream.end(resolve));
	console.log(`Done. kept=${kept} dropped=${dropped} -> ${OUTPUT.pathname}`);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});

