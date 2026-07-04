/** @typedef {'full' | 'cet4' | 'cet6' | 'ky' | 'toefl' | 'ielts' | 'gre' | 'oxford3000' | 'bnc3000'} DictionaryScopeId */

export const DICTIONARY_SCOPE_FULL_ID = "full";

/** @type {readonly { id: DictionaryScopeId, label: string }[]} */
export const DICTIONARY_SCOPE_OPTIONS = Object.freeze([
	{ id: "cet4", label: "四级" },
	{ id: "cet6", label: "六级" },
	{ id: "ky", label: "考研" },
	{ id: "toefl", label: "托福" },
	{ id: "ielts", label: "雅思" },
	{ id: "gre", label: "GRE" },
	{ id: "oxford3000", label: "牛津3000" },
	{ id: "bnc3000", label: "常用3000" },
	{ id: "full", label: "全量" },
]);

/** @type {readonly DictionaryScopeId[]} */
export const DICTIONARY_SCOPE_IDS = DICTIONARY_SCOPE_OPTIONS.map((o) => o.id);

const VALID_SCOPE_IDS = new Set(DICTIONARY_SCOPE_IDS);

/** @param {unknown} ids @returns {DictionaryScopeId[]} */
export function normalizeDictionaryScopeIds(ids) {
	if (!Array.isArray(ids)) return ["full"];
	/** @type {DictionaryScopeId[]} */
	const out = [];
	for (const raw of ids) {
		const id = String(raw ?? "");
		if (id === "cet46") {
			for (const repl of /** @type {DictionaryScopeId[]} */ (["cet4", "cet6"])) {
				if (!out.includes(repl)) out.push(repl);
			}
			continue;
		}
		if (!VALID_SCOPE_IDS.has(/** @type {DictionaryScopeId} */ (id))) continue;
		if (!out.includes(/** @type {DictionaryScopeId} */ (id))) {
			out.push(/** @type {DictionaryScopeId} */ (id));
		}
	}
	if (out.length === 0) return ["full"];
	if (out.includes("full")) return ["full"];
	return out;
}

/** @param {DictionaryScopeId[]} ids */
export function scopeIdsIncludeFull(ids) {
	return normalizeDictionaryScopeIds(ids).includes("full");
}

/** @param {DictionaryScopeId[]} ids @returns {string} */
export function scopeIdsKey(ids) {
	return normalizeDictionaryScopeIds(ids).slice().sort().join(",");
}

/**
 * @param {DictionaryScopeId[]} current
 * @param {DictionaryScopeId} clickedId
 * @returns {DictionaryScopeId[] | null} null = no change (e.g. last item unchecked)
 */
export function toggleDictionaryScopeId(current, clickedId) {
	const normalized = normalizeDictionaryScopeIds(current);
	const id = /** @type {DictionaryScopeId} */ (String(clickedId ?? ""));
	if (!VALID_SCOPE_IDS.has(id)) return null;

	if (id === "full") {
		return normalized.includes("full") ? null : ["full"];
	}

	let next = normalized.filter((x) => x !== "full");
	const has = next.includes(id);
	if (has) {
		if (next.length <= 1) return null;
		next = next.filter((x) => x !== id);
	} else {
		next = [...next, id];
	}
	return normalizeDictionaryScopeIds(next);
}
