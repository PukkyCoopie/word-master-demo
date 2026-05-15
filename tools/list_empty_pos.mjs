import fs from "node:fs";

/**
 * Scan dict.min.js and list words whose pos is empty string.
 *
 * dict.min.js format:
 *   export default [["word","pos","translation"], ...];
 *
 * We do a streaming regex scan for patterns:
 *   ["<word>","","<translation>
 *
 * Since <word> is pure [a-z]+ in our build, it's safe to capture via regex.
 */

const INPUT = new URL("../dict.min.js", import.meta.url);
const OUTPUT = new URL("../empty-pos-words.txt", import.meta.url);

const stream = fs.createReadStream(INPUT, { encoding: "utf8", highWaterMark: 1024 * 1024 });

const re = /\["([a-z]+)","","/g;
let tail = "";
let words = [];
let count = 0;

stream.on("data", (chunk) => {
	const text = tail + chunk;
	re.lastIndex = 0;
	let m;
	while ((m = re.exec(text)) !== null) {
		words.push(m[1]);
		count += 1;
	}
	// keep a tail to handle boundary matches
	tail = text.slice(Math.max(0, text.length - 64));
});

stream.on("end", () => {
	// dedupe + sort for stable output
	const unique = Array.from(new Set(words)).sort();
	fs.writeFileSync(OUTPUT, unique.join("\n") + "\n", "utf8");
	console.log(`empty-pos words: ${unique.length} (raw matches=${count}) -> ${OUTPUT.pathname}`);
});

stream.on("error", (err) => {
	console.error(err);
	process.exitCode = 1;
});

