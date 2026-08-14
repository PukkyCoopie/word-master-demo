/**
 * Pure helpers: abbr POS detection + gloss merge for dictionary enrichment.
 */

import { materializeTranslationWithPosPrefix, splitTranslationLines } from "./dictionary_pos_prefix.mjs";

/** High-frequency function / content words that must never become abbr-only. */
export const FUNCTION_WORD_BLOCKLIST = new Set([
	"who",
	"whom",
	"whose",
	"what",
	"when",
	"where",
	"why",
	"which",
	"how",
	"that",
	"this",
	"these",
	"those",
	"there",
	"their",
	"them",
	"then",
	"than",
	"and",
	"but",
	"for",
	"not",
	"are",
	"was",
	"were",
	"been",
	"have",
	"has",
	"had",
	"does",
	"did",
	"will",
	"would",
	"could",
	"should",
	"may",
	"might",
	"must",
	"shall",
	"can",
	"the",
	"a",
	"an",
	"all",
	"any",
	"each",
	"every",
	"some",
	"such",
	"own",
	"same",
	"other",
	"into",
	"from",
	"with",
	"without",
	"about",
	"over",
	"under",
	"after",
	"before",
	"between",
	"through",
	"during",
	"above",
	"below",
	"out",
	"off",
	"up",
	"down",
	"in",
	"on",
	"at",
	"by",
	"to",
	"of",
	"as",
	"if",
	"or",
	"nor",
	"so",
	"yet",
	"both",
	"either",
	"neither",
	"once",
	"also",
	"just",
	"more",
	"most",
	"less",
	"least",
	"very",
	"too",
	"only",
	"even",
	"still",
	"already",
	"always",
	"never",
	"often",
	"sometimes",
	"here",
	"now",
	"yes",
	"no",
	"ok",
	"okay",
	"one",
	"two",
	"few",
	"many",
	"much",
	"lot",
	"get",
	"got",
	"make",
	"made",
	"take",
	"took",
	"come",
	"came",
	"go",
	"went",
	"see",
	"saw",
	"know",
	"knew",
	"think",
	"thought",
	"say",
	"said",
	"tell",
	"told",
	"ask",
	"use",
	"used",
	"try",
	"tried",
	"need",
	"want",
	"like",
	"look",
	"find",
	"give",
	"gave",
	"put",
	"keep",
	"let",
	"begin",
	"seem",
	"help",
	"show",
	"hear",
	"play",
	"run",
	"move",
	"live",
	"believe",
	"hold",
	"bring",
	"happen",
	"write",
	"provide",
	"sit",
	"stand",
	"lose",
	"pay",
	"meet",
	"include",
	"continue",
	"set",
	"learn",
	"change",
	"lead",
	"understand",
	"watch",
	"follow",
	"stop",
	"create",
	"speak",
	"read",
	"allow",
	"add",
	"spend",
	"grow",
	"open",
	"walk",
	"win",
	"offer",
	"remember",
	"love",
	"consider",
	"appear",
	"buy",
	"wait",
	"serve",
	"die",
	"send",
	"expect",
	"build",
	"stay",
	"fall",
	"cut",
	"reach",
	"kill",
	"remain",
	"suggest",
	"raise",
	"pass",
	"sell",
	"require",
	"report",
	"decide",
	"pull",
]);

const ABBR_IN_TRANS_RE = /\babbr\./i;
const INFLECTION_PREFIX_RE = /^\([^)]*(?:的过去|的复数|的现在分词|的过去分词|第三人称)[^)]*\)\s*/;
const ORG_GLOSS_RE =
	/管理局|委员会|协会|联邦|情报局|调查局|广播公司|航空局|宇宙航行|国税|药物管理|应用程序接口|中央处理器|石油协会|联合国|政府|标准|协议/;
const EN_EXPANSION_RE = /\(([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z./-]*){1,8})\)/;
const POS_PREFIX_STRIP_RE =
	/^(?:n|v|vi|vt|adj|adv|a|prep|conj|pron|num|art|interj|aux|det|abbr)\.\s*/i;

/**
 * @param {string | null | undefined} translationZh
 * @returns {boolean}
 */
export function translationHasAbbrMarker(translationZh) {
	return ABBR_IN_TRANS_RE.test(String(translationZh ?? ""));
}

/**
 * Abbr marker only appears after Chinese inflection wrapper → weak signal alone.
 * @param {string | null | undefined} translationZh
 */
export function translationAbbrIsInflectionOnly(translationZh) {
	const lines = splitTranslationLines(translationZh).map((l) => l.trim()).filter(Boolean);
	if (!lines.length) return false;
	return lines.every((line) => {
		const stripped = line.replace(INFLECTION_PREFIX_RE, "");
		return ABBR_IN_TRANS_RE.test(stripped) && INFLECTION_PREFIX_RE.test(line);
	});
}

/**
 * @param {string | null | undefined} translationZh
 */
export function translationLooksOrgLike(translationZh) {
	return ORG_GLOSS_RE.test(String(translationZh ?? ""));
}

/**
 * @param {string | null | undefined} posField
 * @returns {Set<string>}
 */
export function posTokenSet(posField) {
	return new Set(
		String(posField ?? "")
			.split("|")
			.map((p) => p.trim().toLowerCase())
			.filter(Boolean),
	);
}

/**
 * @typedef {{
 *   isAbbr?: boolean,
 *   zhLabel?: string,
 *   enLabel?: string,
 *   source?: string,
 *   ambiguous?: boolean,
 * }} AbbrCacheEntry
 */

/**
 * Local / cache positive evidence that word should be pure abbr.
 * @param {string} word
 * @param {string} pos
 * @param {string} translation
 * @param {AbbrCacheEntry | null | undefined} cacheEntry
 * @returns {boolean}
 */
export function shouldForcePureAbbr(word, pos, translation, cacheEntry) {
	const w = String(word ?? "")
		.trim()
		.toLowerCase();
	if (!w || FUNCTION_WORD_BLOCKLIST.has(w)) return false;
	if (cacheEntry?.isAbbr === false) return false;
	if (cacheEntry?.isAbbr === true && !cacheEntry.ambiguous) return true;

	const tags = posTokenSet(pos);
	// Any abbr tag → pure abbr (drop n/v/… per product rule)
	if (tags.has("abbr")) return true;

	if (translationHasAbbrMarker(translation) && !translationAbbrIsInflectionOnly(translation)) {
		return true;
	}

	// Short initialism-shaped tokens whose ECDICT gloss already names an org/agency
	const vowels = (String(word ?? "").toLowerCase().match(/[aeiou]/g) || []).length;
	const wlen = String(word ?? "").trim().length;
	if (
		wlen >= 3 &&
		wlen <= 6 &&
		vowels / wlen <= 0.5 &&
		translationLooksOrgLike(translation)
	) {
		return true;
	}

	if (cacheEntry?.isAbbr === true) return true;
	return false;
}

/**
 * Whether to request remote enrichment for this row.
 * @param {string} word
 * @param {string} pos
 * @param {string} translation
 */
export function isAbbrEnrichmentCandidate(word, pos, translation) {
	const w = String(word ?? "")
		.trim()
		.toLowerCase();
	if (!w || FUNCTION_WORD_BLOCKLIST.has(w)) return false;
	if (w.length < 3 || w.length > 8) return false;

	const tags = posTokenSet(pos);
	if (tags.has("abbr")) return true;
	if (translationHasAbbrMarker(translation)) return true;
	if (w.length <= 6 && translationLooksOrgLike(translation)) return true;

	const vowels = (w.match(/[aeiou]/g) || []).length;
	const vowelRatio = vowels / w.length;

	// Consonant-heavy short tokens (fbi, html, http)
	if (w.length <= 5 && vowelRatio <= 0.4) return true;

	// Leading consonant(s) + trailing vowels only (faa, aaa-style initialisms)
	if (w.length <= 5 && /^[bcdfghjklmnpqrstvwxyz]{1,3}[aeiou]{2,}$/.test(w)) return true;

	return false;
}

/**
 * Normalize a gloss line for duplicate detection.
 * @param {string} line
 */
export function normalizeGlossForCompare(line) {
	return String(line ?? "")
		.trim()
		.replace(POS_PREFIX_STRIP_RE, "")
		.replace(/\s+/g, "")
		.toLowerCase();
}

/**
 * @param {string} line
 */
export function stripLeadingPosPrefix(line) {
	return String(line ?? "")
		.trim()
		.replace(POS_PREFIX_STRIP_RE, "")
		.trim();
}

/**
 * Build enriched translation: optional common sense first, keep ECDICT lines after.
 * @param {string} existingTranslation
 * @param {AbbrCacheEntry | null | undefined} cacheEntry
 * @returns {{ translation: string, glossPrepended: boolean }}
 */
export function mergeAbbrGloss(existingTranslation, cacheEntry) {
	const existing = String(existingTranslation ?? "").trim();
	const lines = splitTranslationLines(existing).map((l) => l.trim()).filter(Boolean);

	const zh = String(cacheEntry?.zhLabel ?? "").trim();
	const en = String(cacheEntry?.enLabel ?? "").trim();
	if (!zh && !en) {
		return { translation: existing, glossPrepended: false };
	}
	if (cacheEntry?.ambiguous) {
		return { translation: existing, glossPrepended: false };
	}

	let newSense = zh || en;
	if (zh && en && !zh.includes(en) && !EN_EXPANSION_RE.test(zh)) {
		newSense = `${zh}（${en}）`;
	}

	const newNorm = normalizeGlossForCompare(newSense);
	const already = lines.some((line) => {
		const n = normalizeGlossForCompare(line);
		return n === newNorm || n.includes(newNorm) || newNorm.includes(n);
	});
	if (already) {
		return { translation: existing, glossPrepended: false };
	}

	const merged = [newSense, ...lines].join("\\n");
	return { translation: merged, glossPrepended: true };
}

/**
 * @param {string} word
 * @param {string} pos
 * @param {string} translation
 * @param {AbbrCacheEntry | null | undefined} cacheEntry
 * @returns {{ word: string, pos: string, translation: string, forcedAbbr: boolean, glossPrepended: boolean } | null}
 *   null = no override needed
 */
export function buildAbbrOverride(word, pos, translation, cacheEntry) {
	const w = String(word ?? "")
		.trim()
		.toLowerCase();
	const force = shouldForcePureAbbr(w, pos, translation, cacheEntry);
	if (!force) return null;

	// Strip old n./v. prefixes so materialize can stamp abbr.
	const stripped = splitTranslationLines(translation)
		.map((l) => stripLeadingPosPrefix(l))
		.filter(Boolean)
		.join("\\n");

	const { translation: mergedTrans, glossPrepended } = mergeAbbrGloss(stripped, cacheEntry);
	const nextPos = "abbr";
	const nextTrans = materializeTranslationWithPosPrefix(mergedTrans, nextPos);

	const samePos = nextPos === String(pos ?? "").trim();
	const sameTrans = nextTrans === String(translation ?? "").trim();
	if (samePos && sameTrans) return null;

	return {
		word: w,
		pos: nextPos,
		translation: nextTrans,
		forcedAbbr: true,
		glossPrepended,
	};
}

/**
 * @param {Record<string, AbbrCacheEntry>} cacheWords
 * @param {string} word
 * @returns {AbbrCacheEntry | undefined}
 */
export function getCacheEntry(cacheWords, word) {
	const w = String(word ?? "")
		.trim()
		.toLowerCase();
	return cacheWords?.[w];
}
