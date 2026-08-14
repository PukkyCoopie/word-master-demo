/**
 * Refresh data/dictionary/cache/abbr_enrichment.json from Wiktionary + Wikidata.
 *
 * Usage:
 *   node tools/fetch_abbr_enrichment_cache.mjs           # candidates missing from cache
 *   node tools/fetch_abbr_enrichment_cache.mjs --refresh  # re-fetch all candidates
 *   node tools/fetch_abbr_enrichment_cache.mjs --limit=200
 *
 * Network only at build-time; detect_and_enrich_abbrs.mjs reads the cache offline.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
	FUNCTION_WORD_BLOCKLIST,
	isAbbrEnrichmentCandidate,
	translationHasAbbrMarker,
} from "./abbr_enrichment_lib.mjs";
import { parseCsvLine } from "./dictionary_csv_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FILTERED = path.join(ROOT, "data", "dictionary", "word_filtered.csv");
const CACHE_PATH = path.join(ROOT, "data", "dictionary", "cache", "abbr_enrichment.json");

const UA = "word-master-demo-dict-enrich/1.0 (local build script; contact: local)";
const WIKIDATA_SEARCH = "https://www.wikidata.org/w/api.php";
const WIKTIONARY_DEF = "https://en.wiktionary.org/api/rest_v1/page/definition";

/** Org / agency / standard-ish instance ids (string match on claims P31). */
const ORG_INSTANCE_IDS = new Set([
	"Q43229", // organization
	"Q327333", // government agency
	"Q35798", // aviation
	"Q783794", // company
	"Q4830453", // business
	"Q6881511", // enterprise
	"Q2659904", // government organization
	"Q484652", // international organization
	"Q31855", // research institute
	"Q3918", // university (sometimes abbreviated)
	"Q317623", // technical standard
	"Q7889", // information technology? skip — too broad, use carefully
	"Q1664720", // institute
	"Q178706", // collaboration
	"Q2085381", // publisher
	"Q11032", // newspaper
	"Q1616075", // television channel / network-ish
	"Q24634210", // streaming? skip
	"Q5", // human — reject as org match
]);

const REJECT_INSTANCE_IDS = new Set([
	"Q5", // human
	"Q1656682", // event
	"Q515", // city
	"Q6256", // country
	"Q82794", // geographic region
]);

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	let refresh = false;
	let limit = Infinity;
	for (const a of argv) {
		if (a === "--refresh") refresh = true;
		else if (a.startsWith("--limit=")) limit = Number(a.slice("--limit=".length)) || Infinity;
	}
	return { refresh, limit };
}

/**
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJson(url) {
	const res = await fetch(url, {
		headers: { "User-Agent": UA, Accept: "application/json" },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return res.json();
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} word
 */
async function fetchWiktionaryAbbrSignal(word) {
	const url = `${WIKTIONARY_DEF}/${encodeURIComponent(word)}`;
	try {
		const data = await fetchJson(url);
		const en = data?.en;
		if (!Array.isArray(en)) return { found: false, isAbbr: false, strongNonAbbr: false };

		let hasAbbr = false;
		let strongNonAbbr = false;
		const strongPos = new Set(["pronoun", "prep", "conjunction", "article", "particle"]);
		for (const entry of en) {
			const pos = String(entry?.partOfSpeech ?? "").toLowerCase();
			if (pos.includes("abbreviation") || pos.includes("initialism") || pos.includes("acronym")) {
				hasAbbr = true;
			}
			if (strongPos.has(pos)) strongNonAbbr = true;
			const defs = entry?.definitions;
			if (Array.isArray(defs)) {
				for (const d of defs) {
					const text = String(d?.definition ?? "").toLowerCase();
					if (text.includes("initialism") || text.includes("abbreviation of") || text.includes("acronym")) {
						hasAbbr = true;
					}
				}
			}
		}
		return { found: true, isAbbr: hasAbbr, strongNonAbbr };
	} catch {
		return { found: false, isAbbr: false, strongNonAbbr: false };
	}
}

/**
 * @param {string} word
 */
async function fetchWikidataOrgSense(word) {
	const upper = word.toUpperCase();
	const searchUrl =
		`${WIKIDATA_SEARCH}?` +
		new URLSearchParams({
			action: "wbsearchentities",
			search: upper,
			language: "en",
			uselang: "en",
			type: "item",
			limit: "8",
			format: "json",
			origin: "*",
		}).toString();

	const search = await fetchJson(searchUrl);
	const hits = Array.isArray(search?.search) ? search.search : [];
	if (!hits.length) return { match: null, ambiguous: false };

	/** @type {Array<{ id: string, label: string, description: string, score: number }>} */
	const exact = [];
	for (const h of hits) {
		const label = String(h?.label ?? "");
		const id = String(h?.id ?? "");
		const description = String(h?.description ?? "");
		const aliases = Array.isArray(h?.aliases) ? h.aliases.map(String) : [];
		const labelEq = label.toUpperCase() === upper;
		const aliasEq = aliases.some((a) => a.toUpperCase() === upper);
		// Prefer entries whose label is the expansion (not just "FAA") OR alias is FAA
		const score =
			(aliasEq || labelEq ? 2 : 0) +
			(description.toLowerCase().includes("abbreviation") ||
			description.toLowerCase().includes("initialism") ||
			description.toLowerCase().includes("agency") ||
			description.toLowerCase().includes("organization") ||
			description.toLowerCase().includes("administration")
				? 1
				: 0);
		if (labelEq || aliasEq || label.split(/\s+/).length >= 2) {
			exact.push({ id, label, description, score: score + (label.split(/\s+/).length >= 2 ? 1 : 0) });
		}
	}

	if (!exact.length) return { match: null, ambiguous: false };
	exact.sort((a, b) => b.score - a.score);

	const topIds = exact.slice(0, 5).map((e) => e.id);
	const getUrl =
		`${WIKIDATA_SEARCH}?` +
		new URLSearchParams({
			action: "wbgetentities",
			ids: topIds.join("|"),
			props: "labels|descriptions|aliases|claims",
			languages: "en|zh|zh-cn|zh-hans",
			format: "json",
			origin: "*",
		}).toString();

	const entities = await fetchJson(getUrl);
	/** @type {Array<{ id: string, zh: string, en: string, orgLike: boolean }>} */
	const orgHits = [];

	for (const id of topIds) {
		const ent = entities?.entities?.[id];
		if (!ent || ent.missing) continue;
		const claims = ent.claims?.P31;
		let orgLike = false;
		let rejected = false;
		if (Array.isArray(claims)) {
			for (const c of claims) {
				const iid = c?.mainsnak?.datavalue?.value?.id;
				if (!iid) continue;
				if (REJECT_INSTANCE_IDS.has(iid)) rejected = true;
				if (ORG_INSTANCE_IDS.has(iid)) orgLike = true;
			}
		}
		const enLabel = ent.labels?.en?.value ?? "";
		const zhLabel =
			ent.labels?.zh?.value ||
			ent.labels?.["zh-cn"]?.value ||
			ent.labels?.["zh-hans"]?.value ||
			"";
		const enDesc = ent.descriptions?.en?.value ?? "";
		const aliasesEn = (ent.aliases?.en ?? []).map((a) => String(a.value ?? ""));
		const aliasHit = aliasesEn.some((a) => a.toUpperCase() === upper) || enLabel.toUpperCase() === upper;

		// Expansion-style English label with alias FAA
		const expansion =
			enLabel && enLabel.toUpperCase() !== upper && enLabel.split(/\s+/).length >= 2;

		if (rejected && !orgLike) continue;
		if (!aliasHit && !expansion) continue;

		const descOrg =
			/agency|organization|administration|authority|institute|corporation|company|standard|protocol/i.test(
				enDesc,
			);
		if (!orgLike && !descOrg && !expansion) continue;

		orgHits.push({
			id,
			zh: zhLabel,
			en: expansion ? enLabel : enLabel.toUpperCase() === upper ? enDesc || enLabel : enLabel,
			orgLike: orgLike || descOrg || expansion,
		});
	}

	if (!orgHits.length) return { match: null, ambiguous: false };
	if (orgHits.length > 1) {
		// Unique if one clearly dominates with zh label + org
		const withZh = orgHits.filter((h) => h.zh);
		if (withZh.length === 1) {
			return {
				match: { zhLabel: withZh[0].zh, enLabel: withZh[0].en, source: "wikidata" },
				ambiguous: false,
			};
		}
		// Same zh label?
		const zhSet = new Set(withZh.map((h) => h.zh));
		if (zhSet.size === 1 && withZh[0]) {
			return {
				match: { zhLabel: withZh[0].zh, enLabel: withZh[0].en, source: "wikidata" },
				ambiguous: false,
			};
		}
		return { match: null, ambiguous: true };
	}

	const only = orgHits[0];
	return {
		match: {
			zhLabel: only.zh || "",
			enLabel: only.en || "",
			source: "wikidata",
		},
		ambiguous: false,
	};
}

/**
 * @returns {Promise<Array<{ word: string, pos: string, translation: string }>>}
 */
async function loadCandidates() {
	const out = [];
	const rl = readline.createInterface({
		input: fs.createReadStream(FILTERED, { encoding: "utf8" }),
		crlfDelay: Infinity,
	});
	let first = true;
	for await (const line of rl) {
		if (first) {
			first = false;
			continue;
		}
		if (!line.trim()) continue;
		const [wordRaw, pos, translation] = parseCsvLine(line);
		const word = (wordRaw ?? "").trim().toLowerCase();
		if (!word || FUNCTION_WORD_BLOCKLIST.has(word)) continue;
		if (!isAbbrEnrichmentCandidate(word, pos ?? "", translation ?? "")) continue;
		out.push({ word, pos: pos ?? "", translation: translation ?? "" });
	}
	return out;
}

/**
 * @param {string} cachePath
 */
function loadCacheFile(cachePath) {
	if (!fs.existsSync(cachePath)) {
		return { version: 1, updatedAt: null, words: {} };
	}
	try {
		const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
		return {
			version: 1,
			updatedAt: raw.updatedAt ?? null,
			words: raw.words && typeof raw.words === "object" ? { ...raw.words } : {},
		};
	} catch {
		return { version: 1, updatedAt: null, words: {} };
	}
}

async function main() {
	const { refresh, limit } = parseArgs(process.argv.slice(2));
	if (!fs.existsSync(FILTERED)) {
		console.error(`Missing ${FILTERED}`);
		process.exitCode = 1;
		return;
	}

	const cache = loadCacheFile(CACHE_PATH);
	const candidates = await loadCandidates();
	console.log(`Candidates: ${candidates.length}; cache entries: ${Object.keys(cache.words).length}`);

	let fetched = 0;
	let errors = 0;
	for (const row of candidates) {
		if (fetched >= limit) break;
		if (!refresh && cache.words[row.word]) continue;

		try {
			const wt = await fetchWiktionaryAbbrSignal(row.word);
			await sleep(80);
			const wd = await fetchWikidataOrgSense(row.word);
			await sleep(80);

			/** @type {import("./abbr_enrichment_lib.mjs").AbbrCacheEntry} */
			const entry = {
				source: "mixed",
			};

			const localAbbr = translationHasAbbrMarker(row.translation);
			if (wt.found && wt.strongNonAbbr && !wt.isAbbr && !localAbbr) {
				entry.isAbbr = false;
			} else if (wt.isAbbr || localAbbr || (wd.match && !wd.ambiguous)) {
				entry.isAbbr = true;
			} else if (wd.ambiguous) {
				entry.isAbbr = localAbbr || Boolean(row.pos.split("|").includes("abbr"));
				entry.ambiguous = true;
			} else if (localAbbr || row.pos.split("|").includes("abbr")) {
				entry.isAbbr = true;
			}

			if (wd.match && !wd.ambiguous) {
				if (wd.match.zhLabel) entry.zhLabel = wd.match.zhLabel;
				if (wd.match.enLabel) entry.enLabel = wd.match.enLabel;
				entry.source = "wikidata";
			}
			if (wt.isAbbr) entry.source = entry.zhLabel ? "wiktionary+wikidata" : "wiktionary";

			cache.words[row.word] = entry;
			fetched += 1;
			if (fetched % 25 === 0) {
				console.log(`… fetched ${fetched} (last=${row.word})`);
				fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
				cache.updatedAt = new Date().toISOString();
				fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache)}\n`, "utf8");
			}
		} catch (err) {
			errors += 1;
			console.warn(`fetch failed for ${row.word}:`, err?.message ?? err);
			await sleep(200);
		}
	}

	cache.updatedAt = new Date().toISOString();
	fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
	fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 0)}\n`, "utf8");
	console.log(
		`Done. newlyFetched=${fetched} errors=${errors} cacheSize=${Object.keys(cache.words).length} -> ${CACHE_PATH}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
