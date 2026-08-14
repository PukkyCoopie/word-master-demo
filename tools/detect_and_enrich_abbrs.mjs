/**
 * Scan word_filtered.csv + abbr enrichment cache → write dict_overrides.generated.csv
 * Does not hit the network; use fetch_abbr_enrichment_cache.mjs to refresh cache.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
	buildAbbrOverride,
	getCacheEntry,
	isAbbrEnrichmentCandidate,
} from "./abbr_enrichment_lib.mjs";
import { csvEscape, isPureWord, parseCsvLine } from "./dictionary_csv_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FILTERED = path.join(ROOT, "data", "dictionary", "word_filtered.csv");
const WORD_CSV = path.join(ROOT, "data", "dictionary", "word.csv");
const CACHE = path.join(ROOT, "data", "dictionary", "cache", "abbr_enrichment.json");
const OUT = path.join(ROOT, "data", "dictionary", "dict_overrides.generated.csv");

/**
 * @returns {Record<string, import("./abbr_enrichment_lib.mjs").AbbrCacheEntry>}
 */
function loadCache() {
	if (!fs.existsSync(CACHE)) {
		console.warn(`Cache missing: ${CACHE} (run tools/fetch_abbr_enrichment_cache.mjs)`);
		return {};
	}
	const raw = JSON.parse(fs.readFileSync(CACHE, "utf8"));
	return raw?.words && typeof raw.words === "object" ? raw.words : {};
}

/**
 * @param {string} filePath
 * @returns {Promise<Map<string, { pos: string, translation: string }>>}
 */
async function loadWordMap(filePath) {
	/** @type {Map<string, { pos: string, translation: string }>} */
	const map = new Map();
	if (!fs.existsSync(filePath)) return map;
	const rl = readline.createInterface({
		input: fs.createReadStream(filePath, { encoding: "utf8" }),
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
		if (!word) continue;
		map.set(word, {
			pos: (fields[1] ?? "").trim(),
			translation: (fields[2] ?? "").trim(),
		});
	}
	return map;
}

async function main() {
	if (!fs.existsSync(FILTERED)) {
		console.error(`Missing ${FILTERED}`);
		process.exitCode = 1;
		return;
	}

	const cacheWords = loadCache();
	const filteredMap = await loadWordMap(FILTERED);
	const wordCsvMap = await loadWordMap(WORD_CSV);

	/** @type {Map<string, { pos: string, translation: string }>} */
	const work = new Map(filteredMap);
	// Ensure cache-marked abbrs exist even if filtered rebuild dropped them earlier
	for (const [w, entry] of Object.entries(cacheWords)) {
		if (entry?.isAbbr !== true) continue;
		if (work.has(w)) continue;
		const fromCsv = wordCsvMap.get(w);
		if (fromCsv?.translation) {
			work.set(w, { pos: fromCsv.pos || "n", translation: fromCsv.translation });
		}
	}

	/** @type {Array<[string, string, string]>} */
	const overrides = [];
	let candidates = 0;
	let forcedAbbr = 0;
	let glossPrepended = 0;
	let skippedAmbiguous = 0;

	for (const [word, row] of work) {
		if (!isPureWord(word)) continue;
		const pos = row.pos;
		const translation = row.translation;
		const cacheEntry = getCacheEntry(cacheWords, word);
		const candidate =
			isAbbrEnrichmentCandidate(word, pos, translation) || Boolean(cacheEntry);
		if (!candidate && !cacheEntry) continue;
		candidates += 1;

		if (cacheEntry?.ambiguous && cacheEntry?.isAbbr) skippedAmbiguous += 1;

		const built = buildAbbrOverride(word, pos, translation, cacheEntry);
		if (!built) continue;
		overrides.push([built.word, built.pos, built.translation]);
		if (built.forcedAbbr) forcedAbbr += 1;
		if (built.glossPrepended) glossPrepended += 1;
	}

	overrides.sort((a, b) => a[0].localeCompare(b[0]));
	const body = [
		"word,pos,translation",
		...overrides.map(([w, p, t]) => `${w},${csvEscape(p)},${csvEscape(t)}`),
	].join("\n");
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, `${body}\n`, "utf8");

	console.log(
		`detect_and_enrich_abbrs: scanned=${work.size} candidates=${candidates} overrides=${overrides.length} forcedAbbr=${forcedAbbr} glossPrepended=${glossPrepended} ambiguousSkipNote=${skippedAmbiguous} -> ${OUT}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
