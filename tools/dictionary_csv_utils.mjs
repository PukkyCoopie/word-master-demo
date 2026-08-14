/**
 * Shared minimal CSV helpers for dictionary build scripts.
 */

/**
 * @param {string} line
 * @returns {string[]}
 */
export function parseCsvLine(line) {
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

/**
 * @param {string} s
 * @returns {string}
 */
export function csvEscape(s) {
	if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

/**
 * @param {string} w
 * @returns {boolean}
 */
export function isPureWord(w) {
	return /^[a-z]{3,32}$/.test(w);
}

/**
 * Keep CSV rows single-line (ECDICT convention: literal \n between senses).
 * @param {string} s
 */
export function csvReadyTranslation(s) {
	return String(s ?? "")
		.replace(/\r\n/g, "\n")
		.replace(/\n/g, "\\n");
}
