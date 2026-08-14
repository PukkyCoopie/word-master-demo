/**
 * Apply dict_overrides.generated.csv onto word_filtered.csv.
 * Existing words: overwrite pos + translation.
 * New words: append (rare; overrides are usually corrections).
 */

import fs from "node:fs";
import readline from "node:readline";
import { materializeTranslationWithPosPrefix } from "./dictionary_pos_prefix.mjs";
import { csvEscape, csvReadyTranslation, isPureWord, parseCsvLine } from "./dictionary_csv_utils.mjs";

const PROJECT = new URL("../", import.meta.url);
const FILTERED = new URL("data/dictionary/word_filtered.csv", PROJECT);
const OVERRIDES = new URL("data/dictionary/dict_overrides.generated.csv", PROJECT);
const TEMP = new URL("data/dictionary/word_filtered.csv.tmp", PROJECT);

/**
 * @param {URL} path
 * @returns {Promise<Map<string, { pos: string, translation: string }>>}
 */
async function loadOverrides(path) {
	/** @type {Map<string, { pos: string, translation: string }>} */
	const map = new Map();
	if (!fs.existsSync(path)) return map;

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
		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim().toLowerCase();
		const pos = (fields[1] ?? "").trim();
		const translation = (fields[2] ?? "").trim();
		if (!isPureWord(word) || !pos || !translation) continue;
		map.set(word, { pos, translation });
	}
	return map;
}

async function main() {
	if (!fs.existsSync(FILTERED)) {
		console.error(`Missing ${FILTERED.pathname}`);
		process.exitCode = 1;
		return;
	}

	const overrides = await loadOverrides(OVERRIDES);
	if (overrides.size === 0) {
		console.log("No overrides to apply (dict_overrides.generated.csv missing or empty).");
		return;
	}

	const rl = readline.createInterface({
		input: fs.createReadStream(FILTERED, { encoding: "utf8" }),
		crlfDelay: Infinity,
	});
	const out = fs.createWriteStream(TEMP, { encoding: "utf8" });

	let first = true;
	let rows = 0;
	let applied = 0;
	/** @type {Set<string>} */
	const seen = new Set();

	for await (const line of rl) {
		if (first) {
			first = false;
			out.write("word,pos,translation\n");
			continue;
		}
		if (!line.trim()) continue;
		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim().toLowerCase();
		let pos = (fields[1] ?? "").trim();
		let translation = (fields[2] ?? "").trim();
		if (!word) continue;

		seen.add(word);
		const ov = overrides.get(word);
		if (ov) {
			pos = ov.pos;
			translation = materializeTranslationWithPosPrefix(ov.translation, ov.pos);
			applied += 1;
		}
		if (!isPureWord(word) || !pos) continue;
		rows += 1;
		out.write(`${word},${csvEscape(pos)},${csvEscape(csvReadyTranslation(translation))}\n`);
	}

	/** @type {string[]} */
	const toAppend = [];
	for (const [word, ov] of overrides) {
		if (seen.has(word)) continue;
		if (!isPureWord(word)) continue;
		const translation = materializeTranslationWithPosPrefix(ov.translation, ov.pos);
		toAppend.push(`${word},${csvEscape(ov.pos)},${csvEscape(csvReadyTranslation(translation))}\n`);
	}
	toAppend.sort();
	for (const row of toAppend) out.write(row);

	await new Promise((resolve, reject) => {
		out.end(() => resolve(undefined));
		out.on("error", reject);
	});
	fs.renameSync(TEMP, FILTERED);

	console.log(
		`Applied overrides: matched=${applied} appended=${toAppend.length} rows=${rows} override_file=${overrides.size} -> ${FILTERED.pathname}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
