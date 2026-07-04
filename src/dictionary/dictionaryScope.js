import { scopeIdsIncludeFull, scopeIdsKey, normalizeDictionaryScopeIds } from "../settings/dictionaryScopeIds.js";

/** @type {Set<string> | null} null = full / no filter */
let activeScopeWordSet = null;
/** @type {string} */
let activeScopeIdsKey = "full";
/** @type {Map<string, Set<string>>} */
const loadedScopeWordSets = new Map();
/** @type {Promise<void> | null} */
let inFlightLoad = null;

/** @returns {string} */
export function getActiveScopeIdsKey() {
	return activeScopeIdsKey;
}

/** @returns {number | null} union count; null when full (unfiltered) */
export function getActiveScopeUnionCount() {
	if (activeScopeWordSet == null) return null;
	return activeScopeWordSet.size;
}

/** @param {string} word */
export function isWordInDictionaryScope(word) {
	const w = String(word ?? "").toLowerCase().trim();
	if (!w) return false;
	if (activeScopeWordSet == null) return true;
	return activeScopeWordSet.has(w);
}

export function clearDictionaryScopeRuntimeState() {
	activeScopeWordSet = null;
	activeScopeIdsKey = "full";
	loadedScopeWordSets.clear();
	inFlightLoad = null;
}

/** @param {string} scopeId @returns {Promise<Set<string>>} */
async function fetchScopeWordSet(scopeId) {
	const cached = loadedScopeWordSets.get(scopeId);
	if (cached) return cached;

	const baseUrl = `${import.meta.env.BASE_URL}data/dictionary/scopes/`.replace(/\/+/g, "/");
	const url = `${baseUrl}${scopeId}.words.json`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`词汇范围 ${scopeId} 加载失败 (${res.status})`);
	}
	const raw = await res.json();
	if (!Array.isArray(raw)) {
		throw new Error(`词汇范围 ${scopeId} 格式错误`);
	}
	const set = new Set(
		raw
			.map((w) => String(w ?? "").toLowerCase().trim())
			.filter(Boolean),
	);
	loadedScopeWordSets.set(scopeId, set);
	return set;
}

/**
 * @param {string[] | null | undefined} scopeIds
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
export async function loadDictionaryScopes(scopeIds, options = {}) {
	const { shouldAbort } = options;
	const normalized = normalizeDictionaryScopeIds(scopeIds);
	const key = scopeIdsKey(normalized);

	if (key === activeScopeIdsKey && (activeScopeWordSet != null || scopeIdsIncludeFull(normalized))) {
		return;
	}

	if (inFlightLoad) await inFlightLoad;

	inFlightLoad = (async () => {
		if (shouldAbort?.()) return;

		if (scopeIdsIncludeFull(normalized)) {
			activeScopeWordSet = null;
			activeScopeIdsKey = "full";
			return;
		}

		const union = new Set();
		const ids = normalized.filter((id) => id !== "full");
		await Promise.all(
			ids.map(async (id) => {
				const set = await fetchScopeWordSet(id);
				if (shouldAbort?.()) return;
				for (const w of set) union.add(w);
			}),
		);

		if (shouldAbort?.()) return;
		activeScopeWordSet = union;
		activeScopeIdsKey = key;
	})();

	try {
		await inFlightLoad;
	} finally {
		inFlightLoad = null;
	}
}

/** @returns {Promise<{ version: number, fullDictionaryCount?: number, scopes: { id: string, label: string, count?: number, file?: string, metaOnly?: boolean }[] } | null>} */
export async function fetchDictionaryScopesMeta() {
	const baseUrl = `${import.meta.env.BASE_URL}data/dictionary/scopes/`.replace(/\/+/g, "/");
	const url = `${baseUrl}scopes.meta.json`;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
