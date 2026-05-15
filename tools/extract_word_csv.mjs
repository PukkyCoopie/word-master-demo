import fs from "node:fs";
import readline from "node:readline";

/**
 * Extract a "word-only" CSV from ECDICT ecdict.csv.
 *
 * Output: word.csv with columns:
 *   word,pos,translation
 *
 * Filters (same as current game constraints):
 * - Keep only pure ASCII A-Z words (no spaces, punctuation, hyphens, apostrophes, prefixes).
 * - Drop anything not starting with A-Z.
 * - Lowercase + dedupe.
 * - Drop 1-2 letter words (min length = 3).
 *
 * Notes:
 * - Does NOT attempt to infer/fill pos here; we keep original pos column as-is.
 *   (Your later build steps can do fallbacks.)
 */

const PROJECT = new URL("../", import.meta.url); // tools/ -> project root
const INPUT = new URL("data/dictionary/ecdict.csv", PROJECT);
const OUTPUT = new URL("data/dictionary/word.csv", PROJECT);

const MIN_LEN = 3;
const MAX_LEN = 32;

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

function isPureWord(w) {
	return /^[A-Za-z]+$/.test(w) && w.length >= MIN_LEN && w.length <= MAX_LEN;
}

function csvEscape(s) {
	// minimal csv escaping
	if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
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
	const seen = new Set();
	let kept = 0;
	let dropped = 0;

	for await (const line of rl) {
		if (isFirst) {
			isFirst = false;
			continue; // header
		}
		if (!line) continue;

		const fields = parseCsvLine(line);
		const wordRaw = (fields[0] ?? "").trim();
		if (!isPureWord(wordRaw) || !/^[A-Za-z]/.test(wordRaw)) {
			dropped += 1;
			continue;
		}
		const word = wordRaw.toLowerCase();
		if (seen.has(word)) continue;
		seen.add(word);

		const pos = (fields[1] ?? "").trim();
		const translation = (fields[2] ?? "").trim();

		outStream.write(`${word},${csvEscape(pos)},${csvEscape(translation)}\n`);
		kept += 1;
	}

	await new Promise((resolve) => outStream.end(resolve));
	console.log(`Done. kept=${kept} dropped=${dropped} unique=${seen.size} -> ${OUTPUT.pathname}`);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});

