import fs from "node:fs";
import readline from "node:readline";
import { materializeTranslationWithPosPrefix } from "./dictionary_pos_prefix.mjs";

/**
 * 在现有 word_filtered.csv 上就地补释义行首词性前缀（不重建 word.csv）。
 * 输出覆盖原文件；可先 backup_dictionary.mjs。
 */

const PROJECT = new URL("../", import.meta.url);
const FILTERED = new URL("data/dictionary/word_filtered.csv", PROJECT);
const TEMP = new URL("data/dictionary/word_filtered.csv.tmp", PROJECT);

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

async function main() {
	if (!fs.existsSync(FILTERED)) {
		console.error(`Missing ${FILTERED.pathname}`);
		process.exitCode = 1;
		return;
	}

	const rl = readline.createInterface({
		input: fs.createReadStream(FILTERED, { encoding: "utf8" }),
		crlfDelay: Infinity,
	});
	const out = fs.createWriteStream(TEMP, { encoding: "utf8" });

	let isFirst = true;
	let rows = 0;
	let changed = 0;

	for await (const line of rl) {
		if (isFirst) {
			isFirst = false;
			out.write("word,pos,translation\n");
			continue;
		}
		if (!line) continue;

		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim();
		const pos = (fields[1] ?? "").trim();
		const translation = (fields[2] ?? "").trim();
		if (!word || !pos) continue;

		const translationOut = materializeTranslationWithPosPrefix(translation, pos);
		if (translationOut !== translation) changed += 1;
		out.write(`${word},${csvEscape(pos)},${csvEscape(translationOut)}\n`);
		rows += 1;
	}

	await new Promise((resolve) => out.end(resolve));
	fs.renameSync(TEMP, FILTERED);
	console.log(`Done. rows=${rows} translation_updated=${changed} -> ${FILTERED.pathname}`);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
