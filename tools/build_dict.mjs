import fs from "node:fs";
import readline from "node:readline";

/**
 * Build a compact JSON dictionary from data/dictionary/word_filtered.csv.
 *
 * Output:
 * - dict.json is a JSON array of tuples:
 *   [word, pos, translation_zh]
 */

const PROJECT = new URL("../", import.meta.url); // tools/ -> project root
const INPUT = new URL("data/dictionary/word_filtered.csv", PROJECT);
const OUTPUT = new URL("data/dictionary/dict.json", PROJECT);

function parseCsvLine(line) {
	// Minimal RFC4180-ish parser for a single line.
	// Assumes fields don't contain literal newlines (ecdict uses \n escapes inside quotes).
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

async function main() {
	if (!fs.existsSync(INPUT)) {
		console.error(`Missing input: ${INPUT.pathname}`);
		process.exitCode = 1;
		return;
	}

	const inStream = fs.createReadStream(INPUT, { encoding: "utf8" });
	const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity });

	let isFirstLine = true;
	const rows = [];

	let kept = 0;
	let dropped = 0;

	for await (const line of rl) {
		if (isFirstLine) {
			isFirstLine = false;
			continue; // header: word,pos,translation
		}
		if (!line) continue;

		const fields = parseCsvLine(line);
		const word = (fields[0] ?? "").trim();
		const pos = (fields[1] ?? "").trim();
		const translationZh = (fields[2] ?? "").trim();

		// word_filtered.csv should already ensure these, but keep a guard.
		if (!word || !pos) {
			dropped += 1;
			continue;
		}
		rows.push([word, pos, translationZh]);
		kept += 1;
	}

	// Write JSON; let transport compression (gzip/br) do the heavy lifting.
	const json = JSON.stringify(rows);
	fs.writeFileSync(OUTPUT, json + "\n", "utf8");

	console.log(
		`Done. kept=${kept} dropped=${dropped} output=${OUTPUT.pathname}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});

