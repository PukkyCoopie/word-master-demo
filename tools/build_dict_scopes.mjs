import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "dictionary", "ecdict-sqlite-tmp", "stardict.db");
const WORD_FILTERED = path.join(ROOT, "data", "dictionary", "word_filtered.csv");
const OUT_DIR = path.join(ROOT, "data", "dictionary", "scopes");

const MIN_LEN = 3;
const MAX_LEN = 32;

/** @type {readonly { id: string, label: string, file?: string, metaOnly?: boolean, match: (row: { tag: string, oxford: number | null, bnc: number | null }) => boolean }[]} */
const SCOPE_DEFS = [
	{
		id: "full",
		label: "全量",
		metaOnly: true,
		match: () => false,
	},
	{
		id: "cet4",
		label: "四级",
		file: "cet4.words.json",
		match: (row) => hasTag(row.tag, "cet4"),
	},
	{
		id: "cet6",
		label: "六级",
		file: "cet6.words.json",
		match: (row) => hasTag(row.tag, "cet6"),
	},
	{
		id: "ky",
		label: "考研",
		file: "ky.words.json",
		match: (row) => hasTag(row.tag, "ky"),
	},
	{
		id: "toefl",
		label: "托福",
		file: "toefl.words.json",
		match: (row) => hasTag(row.tag, "toefl"),
	},
	{
		id: "ielts",
		label: "雅思",
		file: "ielts.words.json",
		match: (row) => hasTag(row.tag, "ielts"),
	},
	{
		id: "gre",
		label: "GRE",
		file: "gre.words.json",
		match: (row) => hasTag(row.tag, "gre"),
	},
	{
		id: "oxford3000",
		label: "牛津3000",
		file: "oxford3000.words.json",
		match: (row) => Number(row.oxford) === 1,
	},
	{
		id: "bnc3000",
		label: "常用3000",
		file: "bnc3000.words.json",
		match: (row) => {
			const bnc = Number(row.bnc);
			return Number.isFinite(bnc) && bnc >= 1 && bnc <= 3000;
		},
	},
];

/** @param {string | null | undefined} tagField @param {string} token */
function hasTag(tagField, token) {
	const tag = String(tagField ?? "").toLowerCase();
	if (!tag) return false;
	return tag.split(/\s+/).includes(token);
}

/** @param {string} w */
function isPureWord(w) {
	return /^[A-Za-z]+$/.test(w) && w.length >= MIN_LEN && w.length <= MAX_LEN;
}

function resolveDbPath() {
	if (fs.existsSync(DB_PATH)) return DB_PATH;
	const alt = path.join(ROOT, "data", "dictionary", "stardict.db");
	if (fs.existsSync(alt)) return alt;
	throw new Error(
		`Missing ECDICT sqlite at ${DB_PATH}. Download ecdict-sqlite-28.zip from skywind3000/ECDICT releases.`,
	);
}

function loadPlayableWordSet() {
	if (!fs.existsSync(WORD_FILTERED)) {
		throw new Error(`Missing ${WORD_FILTERED}. Run build_word_filtered_csv.mjs first.`);
	}
	const text = fs.readFileSync(WORD_FILTERED, "utf8");
	const set = new Set();
	let isFirst = true;
	for (const line of text.split(/\r?\n/)) {
		if (isFirst) {
			isFirst = false;
			continue;
		}
		if (!line) continue;
		const word = line.split(",")[0]?.trim().toLowerCase();
		if (word) set.add(word);
	}
	return set;
}

function main() {
	const playableWords = loadPlayableWordSet();
	const dbPath = resolveDbPath();
	const db = new DatabaseSync(dbPath, { readOnly: true });

	/** @type {Map<string, Set<string>>} */
	const scopeSets = new Map();
	for (const def of SCOPE_DEFS) {
		if (def.metaOnly) continue;
		scopeSets.set(def.id, new Set());
	}

	const seen = new Set();
	const stmt = db.prepare("SELECT word, tag, oxford, bnc FROM stardict");
	for (const row of stmt.iterate()) {
		const wordRaw = String(row.word ?? "").trim();
		if (!isPureWord(wordRaw) || !/^[A-Za-z]/.test(wordRaw)) continue;
		const word = wordRaw.toLowerCase();
		if (seen.has(word)) continue;
		if (!playableWords.has(word)) continue;
		seen.add(word);

		const normalized = {
			tag: String(row.tag ?? ""),
			oxford: row.oxford == null ? null : Number(row.oxford),
			bnc: row.bnc == null ? null : Number(row.bnc),
		};

		for (const def of SCOPE_DEFS) {
			if (def.metaOnly || !def.match(normalized)) continue;
			scopeSets.get(def.id)?.add(word);
		}
	}

	fs.mkdirSync(OUT_DIR, { recursive: true });

	/** @type {{ id: string, label: string, file?: string, count: number, metaOnly?: boolean }[]} */
	const metaScopes = [];
	for (const def of SCOPE_DEFS) {
		if (def.metaOnly) {
			metaScopes.push({ id: def.id, label: def.label, metaOnly: true, count: seen.size });
			continue;
		}
		const words = Array.from(scopeSets.get(def.id) ?? []).sort();
		const file = def.file ?? `${def.id}.words.json`;
		fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(words), "utf8");
		metaScopes.push({ id: def.id, label: def.label, file, count: words.length });
		console.log(`${def.label} (${def.id}): ${words.length}`);
	}

	const meta = {
		version: 1,
		fullDictionaryCount: seen.size,
		scopes: metaScopes,
	};
	fs.writeFileSync(path.join(OUT_DIR, "scopes.meta.json"), JSON.stringify(meta, null, 2), "utf8");
	console.log(`Done -> ${OUT_DIR}`);
}

main();
