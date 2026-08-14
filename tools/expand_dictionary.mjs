import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backupDictionary } from "./backup_dictionary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function runNode(script, label, { optional = false } = {}) {
	console.log(`\n==> ${label}`);
	const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
		cwd: ROOT,
		stdio: "inherit",
	});
	if (r.status !== 0) {
		if (optional) {
			console.warn(`${script} failed with code ${r.status} (optional; continuing)`);
			return false;
		}
		throw new Error(`${script} failed with code ${r.status}`);
	}
	return true;
}

function spotCheck() {
	const dictPath = path.join(ROOT, "data", "dictionary", "dict.json");
	const raw = JSON.parse(fs.readFileSync(dictPath, "utf8"));
	const byWord = new Map(raw.map((r) => [r[0], r]));
	const set = new Set(byWord.keys());
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

	/** Abbr enrichment spot-checks (soft warnings). */
	const faa = byWord.get("faa");
	const who = byWord.get("who");
	const fbi = byWord.get("fbi");
	if (faa) {
		const [w, pos, zh] = faa;
		if (pos !== "abbr") console.warn(`Spot-check faa: expected pos=abbr, got ${pos}`);
		else if (!/航空|Federal Aviation|FAA/i.test(String(zh))) {
			console.warn(`Spot-check faa: expected aviation gloss, got ${String(zh).slice(0, 80)}`);
		} else {
			console.log(`Spot-check faa ok: ${w}/${pos}/${String(zh).slice(0, 60)}`);
		}
	}
	if (who) {
		const [, pos] = who;
		if (pos === "abbr") console.warn("Spot-check who: should not be pure abbr");
		else console.log(`Spot-check who ok: pos=${pos}`);
	}
	if (fbi) {
		const [, pos] = fbi;
		if (pos !== "abbr") console.warn(`Spot-check fbi: expected pos=abbr, got ${pos}`);
		else console.log("Spot-check fbi ok: pos=abbr");
	}
}

async function main() {
	const backup = backupDictionary();
	console.log(`Backup saved to ${backup.backupDir}`);
	console.log(`Files: ${backup.copied.join(", ")}`);

	runNode("build_word_filtered_csv.mjs", "Rebuild word_filtered.csv (improved POS inference)");
	runNode("merge_supplement_words.mjs", "Merge supplemental words");
	runNode("detect_and_enrich_abbrs.mjs", "Detect abbrs + build dict_overrides.generated.csv");
	runNode("apply_dict_overrides.mjs", "Apply abbr/gloss overrides onto word_filtered.csv");
	runNode("materialize_word_filtered_pos_prefix.mjs", "Inject POS prefixes into gloss lines (scheme A)");
	runNode("build_dict.mjs", "Build dict.json");
	runNode("build_dict_scopes.mjs", "Build dictionary scope sidecars", { optional: true });

	spotCheck();
	console.log("\nDictionary expansion complete.");
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
