import fs from "node:fs";
import readline from "node:readline";

/**
 * Merge supplemental word rows into word_filtered.csv.
 * Skips words already present (case-insensitive). Supplement rows must have word,pos,translation.
 */

const PROJECT = new URL("../", import.meta.url);
const FILTERED = new URL("data/dictionary/word_filtered.csv", PROJECT);
const SUPPLEMENT = new URL("data/dictionary/supplement_words.csv", PROJECT);
const EXTRA = new URL("data/dictionary/supplement_words_generated.csv", PROJECT);

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

function isPureWord(w) {
	return /^[a-z]{3,32}$/.test(w);
}

async function loadExistingWords(path) {
	const set = new Set();
	const rl = readline.createInterface({
		input: fs.createReadStream(path, { encoding: "utf8" }),
		crlfDelay: Infinity,
	});
	let first = true;
	for await (const line of rl) {
		if (first) {
			first = false;
			continue;
		}
		if (!line) continue;
		set.add((parseCsvLine(line)[0] ?? "").trim().toLowerCase());
	}
	return set;
}

async function readSupplementFile(path, existing, rowsOut) {
	if (!fs.existsSync(path)) return { read: 0, added: 0, skipped: 0 };
	let read = 0;
	let added = 0;
	let skipped = 0;
	const rl = readline.createInterface({
		input: fs.createReadStream(path, { encoding: "utf8" }),
		crlfDelay: Infinity,
	});
	let first = true;
	for await (const line of rl) {
		if (first) {
			first = false;
			continue;
		}
		if (!line.trim()) continue;
		read++;
		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim().toLowerCase();
		const pos = (fields[1] ?? "").trim();
		const translation = (fields[2] ?? "").trim();
		if (!isPureWord(word) || !pos || !translation) {
			skipped++;
			continue;
		}
		if (existing.has(word)) {
			skipped++;
			continue;
		}
		existing.add(word);
		rowsOut.push([word, pos, translation]);
		added++;
	}
	return { read, added, skipped };
}

async function main() {
	if (!fs.existsSync(FILTERED)) {
		console.error(`Missing ${FILTERED.pathname}`);
		process.exitCode = 1;
		return;
	}

	const existing = await loadExistingWords(FILTERED);
	const toAppend = [];
	const stats = { read: 0, added: 0, skipped: 0 };

	for (const src of [SUPPLEMENT, EXTRA]) {
		const part = await readSupplementFile(src, existing, toAppend);
		stats.read += part.read;
		stats.added += part.added;
		stats.skipped += part.skipped;
	}

	if (toAppend.length === 0) {
		console.log("No supplemental words to merge.");
		return;
	}

	toAppend.sort((a, b) => a[0].localeCompare(b[0]));
	const out = fs.createWriteStream(FILTERED, { flags: "a", encoding: "utf8" });
	for (const [word, pos, translation] of toAppend) {
		out.write(`${word},${csvEscape(pos)},${csvEscape(translation)}\n`);
	}
	await new Promise((resolve) => out.end(resolve));
	console.log(
		`Merged supplement: read=${stats.read} added=${stats.added} skipped=${stats.skipped} -> ${FILTERED.pathname}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
