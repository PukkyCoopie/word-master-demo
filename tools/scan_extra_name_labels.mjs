import fs from "node:fs";
import readline from "node:readline";

const EXTRA = [
	["姓氏", /姓氏/],
	["男子名", /男子名/],
	["女子名", /女子名/],
	["男孩名", /男孩名/],
	["女孩名", /女孩名/],
	["日本人名", /日本人名/],
	["英格兰人姓氏", /英格兰人姓氏/],
	["姓氏\]", /\[.*姓氏.*\]/],
	["来源于", /来源于/],
	["源于", /源于/],
	["人名\)", /人名\)/],
	["\(人名", /\(人名/],
	["\[人名\]", /\[人名\]/],
];

/** @param {string} line */
function parseTranslationField(line) {
	const first = line.indexOf(",");
	const second = line.indexOf(",", first + 1);
	return second >= 0 ? line.slice(second + 1).replace(/^"|"$/g, "") : "";
}

const counts = Object.fromEntries(EXTRA.map(([k]) => [k, 0]));
const samples = Object.fromEntries(EXTRA.map(([k]) => [k, []]));

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
	for (const [name, re] of EXTRA) {
		if (!re.test(trans)) continue;
		counts[name]++;
		if (samples[name].length < 3) {
			samples[name].push(`${word}: ${trans.replace(/\\n/g, " ").slice(0, 100)}`);
		}
	}
}

for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
	console.log(`\n${k}: ${v}`);
	for (const s of samples[k]) console.log(`  ${s}`);
}
