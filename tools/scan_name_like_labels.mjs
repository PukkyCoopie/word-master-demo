import fs from "node:fs";
import readline from "node:readline";

/** 扫描 ECDICT 释义里「X名」「X称」类标注 */
const LABEL_RE = /(?:^|[\s\[【(（,，；;：:])([\u4e00-\u9fff]{1,4}(?:名|称))(?:[\]】)）\s,，；;：:]|$)/g;

/** @param {string} line */
function parseTranslationField(line) {
	const first = line.indexOf(",");
	const second = line.indexOf(",", first + 1);
	return second >= 0 ? line.slice(second + 1).replace(/^"|"$/g, "") : "";
}

/** @type {Map<string, number>} */
const freq = new Map();
/** @type {Map<string, string[]>} */
const samples = new Map();

const rl = readline.createInterface({
	input: fs.createReadStream(new URL("../data/dictionary/word_filtered.csv", import.meta.url), {
		encoding: "utf8",
	}),
	crlfDelay: Infinity,
});

let first = true;
for await (const line of rl) {
	if (first) {
		first = false;
		continue;
	}
	if (!line) continue;
	const word = line.split(",")[0];
	const trans = parseTranslationField(line);
	for (const m of trans.matchAll(LABEL_RE)) {
		const label = m[1];
		freq.set(label, (freq.get(label) ?? 0) + 1);
		if (!samples.has(label)) samples.set(label, []);
		const arr = samples.get(label);
		if (arr.length < 2) arr.push(`${word}: ${trans.replace(/\\n/g, " ").slice(0, 70)}`);
	}
}

const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
console.log("Top *名/*称 labels:");
for (const [label, count] of sorted.slice(0, 40)) {
	console.log(`${count}\t${label}`);
	if (samples.get(label)?.length) {
		for (const s of samples.get(label)) console.log(`  ${s}`);
	}
}
