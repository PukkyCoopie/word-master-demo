import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildAbbrOverride } from "./abbr_enrichment_lib.mjs";
import { parseCsvLine } from "./dictionary_csv_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

describe("apply_dict_overrides / detect integration", () => {
	it("buildAbbrOverride produces faa pure abbr row", () => {
		const row = buildAbbrOverride("faa", "n", "n. 一切海损均不赔偿", {
			isAbbr: true,
			zhLabel: "美国联邦航空管理局",
			enLabel: "Federal Aviation Administration",
		});
		assert.ok(row);
		assert.equal(row.pos, "abbr");
		assert.match(row.translation, /航空/);
		assert.match(row.translation, /一切海损/);
	});

	it("detect_and_enrich_abbrs keeps who non-abbr; faa is abbr in filtered or overrides", () => {
		const detect = spawnSync(process.execPath, [path.join(__dirname, "detect_and_enrich_abbrs.mjs")], {
			cwd: ROOT,
			encoding: "utf8",
		});
		assert.equal(detect.status, 0, detect.stderr || detect.stdout);
		const ovPath = path.join(ROOT, "data", "dictionary", "dict_overrides.generated.csv");
		assert.ok(fs.existsSync(ovPath));
		const ovText = fs.readFileSync(ovPath, "utf8");
		assert.doesNotMatch(ovText, /(^|\n)who,abbr,/);
		assert.doesNotMatch(ovText, /(^|\n)[^,\n]*[\u4e00-\u9fff]/);

		const filtered = fs.readFileSync(path.join(ROOT, "data", "dictionary", "word_filtered.csv"), "utf8");
		const faaLine = filtered.split(/\n/).find((l) => l.startsWith("faa,"));
		assert.ok(faaLine, "faa must exist in word_filtered");
		const faa = parseCsvLine(faaLine);
		assert.equal(faa[1], "abbr");
		assert.match(faa[2], /航空|Federal Aviation/i);

		const whoLine = filtered.split(/\n/).find((l) => l.startsWith("who,"));
		assert.ok(whoLine);
		assert.notEqual(parseCsvLine(whoLine)[1], "abbr");
	});
});
