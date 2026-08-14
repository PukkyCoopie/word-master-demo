/**
 * 构建期：为缺行首词性前缀的释义补上 `n.` / `vi.` 等（方案 A）。
 */

import {
	repairTranslationLinePosArtifacts,
	translationLineHasPosPrefix,
} from "../src/dictionary/translationPosPrefix.js";

export const POS_TOKEN_MAP = new Map([
	["n", "n"],
	["v", "v"],
	["vi", "vi"],
	["vt", "vt"],
	["adj", "adj"],
	["a", "adj"],
	["adv", "adv"],
	["prep", "prep"],
	["conj", "conj"],
	["pron", "pron"],
	["num", "num"],
	["art", "art"],
	["interj", "interj"],
	["aux", "aux"],
	["abbr", "abbr"],
	["det", "det"],
	["int", "interj"],
]);

/** 已知词性映射到统一缩写；未收录的按原样保留（小写、去尾点） */
export function normalizePosToken(raw) {
	const t = String(raw ?? "")
		.trim()
		.toLowerCase()
		.replace(/\.$/, "");
	return POS_TOKEN_MAP.get(t) ?? t;
}

/** @param {string | null | undefined} posField */
export function splitPosFieldTokens(posField) {
	const raw = String(posField ?? "").trim();
	if (!raw) return [];
	return raw
		.split("|")
		.map((part) => normalizePosToken(part))
		.filter(Boolean);
}

/** @param {string | null | undefined} translationZh */
export function splitTranslationLines(translationZh) {
	return String(translationZh ?? "").split(/\\n|\r?\n/);
}

export { translationLineHasPosPrefix };

/**
 * @param {string | null | undefined} translationZh
 * @param {string | null | undefined} posField
 * @returns {string}
 */
export function materializeTranslationWithPosPrefix(translationZh, posField) {
	const raw = String(translationZh ?? "");
	const posTokens = splitPosFieldTokens(posField);
	if (!raw || !posTokens.length) return raw;

	const lines = splitTranslationLines(raw);
	if (!lines.length) return raw;

	let assignIdx = 0;
	const out = lines.map((line) => {
		if (translationLineHasPosPrefix(line) || !String(line).trim()) {
			return repairTranslationLinePosArtifacts(line);
		}
		const token =
			posTokens.length === 1
				? posTokens[0]
				: posTokens[Math.min(assignIdx++, posTokens.length - 1)];
		return repairTranslationLinePosArtifacts(`${token}. ${String(line).trimStart()}`);
	});

	const joined = out.join("\\n");
	return joined !== raw ? joined : raw;
}
