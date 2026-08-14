import fs from "node:fs";
import readline from "node:readline";
import { materializeTranslationWithPosPrefix } from "./dictionary_pos_prefix.mjs";
import { csvEscape, csvReadyTranslation, parseCsvLine } from "./dictionary_csv_utils.mjs";

/**
 * 在现有 word_filtered.csv 上就地补释义行首词性前缀（不重建 word.csv）。
 * 输出覆盖原文件；可先 backup_dictionary.mjs。
 */

const PROJECT = new URL("../", import.meta.url);
const FILTERED = new URL("data/dictionary/word_filtered.csv", PROJECT);
const TEMP = new URL("data/dictionary/word_filtered.csv.tmp", PROJECT);

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
	let skipped = 0;

	for await (const line of rl) {
		if (isFirst) {
			isFirst = false;
			out.write("word,pos,translation\n");
			continue;
		}
		if (!line) continue;

		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim().toLowerCase();
		const pos = (fields[1] ?? "").trim();
		const translation = (fields[2] ?? "").trim();
		// Skip corrupt rows (e.g. prior multiline CSV breakage)
		if (!/^[a-z]{3,32}$/.test(word) || !pos) {
			skipped += 1;
			continue;
		}

		const translationOut = csvReadyTranslation(
			materializeTranslationWithPosPrefix(translation, pos),
		);
		if (translationOut !== translation) changed += 1;
		out.write(`${word},${csvEscape(pos)},${csvEscape(translationOut)}\n`);
		rows += 1;
	}

	await new Promise((resolve) => out.end(resolve));
	fs.renameSync(TEMP, FILTERED);
	console.log(
		`Done. rows=${rows} translation_updated=${changed} skipped_corrupt=${skipped} -> ${FILTERED.pathname}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
