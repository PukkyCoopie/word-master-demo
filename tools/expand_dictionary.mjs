import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backupDictionary } from "./backup_dictionary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function runNode(script, label) {
	console.log(`\n==> ${label}`);
	const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
		cwd: ROOT,
		stdio: "inherit",
	});
	if (r.status !== 0) {
		throw new Error(`${script} failed with code ${r.status}`);
	}
}

function spotCheck() {
	const dictPath = path.join(ROOT, "data", "dictionary", "dict.json");
	const raw = JSON.parse(fs.readFileSync(dictPath, "utf8"));
	const set = new Set(raw.map((r) => r[0]));
	const mustHave = [
		"google",
		"online",
		"internet",
		"covid",
		"chatgpt",
		"tiktok",
		"multiplayer",
		"speedrun",
		"roguelike",
		"dont",
		"wasnt",
		"whats",
	];
	// 游戏最短单词长度为 3，2 字母词（如 ai、ok） intentionally 不在词库中。
	const missing = mustHave.filter((w) => !set.has(w));
	console.log(`\nDict entries: ${set.size}`);
	console.log(`dict.json size: ${(fs.statSync(dictPath).size / 1024 / 1024).toFixed(2)} MB`);
	if (missing.length) {
		console.warn("Spot-check missing:", missing.join(", "));
	} else {
		console.log("Spot-check passed for priority words.");
	}
}

async function main() {
	const backup = backupDictionary();
	console.log(`Backup saved to ${backup.backupDir}`);
	console.log(`Files: ${backup.copied.join(", ")}`);

	runNode("build_word_filtered_csv.mjs", "Rebuild word_filtered.csv (improved POS inference)");
	runNode("merge_supplement_words.mjs", "Merge supplemental words");
	runNode("materialize_word_filtered_pos_prefix.mjs", "Inject POS prefixes into gloss lines (scheme A)");
	runNode("build_dict.mjs", "Build dict.json");

	spotCheck();
	console.log("\nDictionary expansion complete.");
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
