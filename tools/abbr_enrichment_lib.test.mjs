import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FUNCTION_WORD_BLOCKLIST,
	buildAbbrOverride,
	isAbbrEnrichmentCandidate,
	mergeAbbrGloss,
	shouldForcePureAbbr,
	translationHasAbbrMarker,
} from "./abbr_enrichment_lib.mjs";

describe("abbr enrichment: force pure abbr", () => {
	it("does not force who (blocklist)", () => {
		assert.equal(FUNCTION_WORD_BLOCKLIST.has("who"), true);
		assert.equal(shouldForcePureAbbr("who", "pron", "pron. 谁", { isAbbr: true }), false);
	});

	it("forces when translation has abbr. marker", () => {
		assert.equal(translationHasAbbrMarker("abbr. 美国国税局"), true);
		assert.equal(shouldForcePureAbbr("irs", "n", "abbr. 美国国税局", null), true);
	});

	it("forces when pos already includes abbr", () => {
		assert.equal(shouldForcePureAbbr("fda", "abbr|n", "（美）食品及药物管理局", null), true);
	});

	it("forces faa when cache marks abbr", () => {
		assert.equal(
			shouldForcePureAbbr("faa", "n", "n. 一切海损均不赔偿", {
				isAbbr: true,
				zhLabel: "美国联邦航空管理局",
				enLabel: "Federal Aviation Administration",
			}),
			true,
		);
	});

	it("forces fbi from org-like short gloss without cache", () => {
		assert.equal(shouldForcePureAbbr("fbi", "n", "n. 美国联邦调查局", null), true);
	});

	it("does not force long brand-like org gloss alone", () => {
		assert.equal(shouldForcePureAbbr("abbott", "n", "n. 雅培（公司名）", null), false);
	});

	it("respects cache isAbbr=false", () => {
		assert.equal(
			shouldForcePureAbbr("run", "n", "n. 跑步", { isAbbr: false }),
			false,
		);
	});
});

describe("abbr enrichment: gloss merge", () => {
	it("prepends Wikidata sense before ECDICT maritime gloss", () => {
		const { translation, glossPrepended } = mergeAbbrGloss("n. 一切海损均不赔偿", {
			zhLabel: "美国联邦航空管理局",
			enLabel: "Federal Aviation Administration",
		});
		assert.equal(glossPrepended, true);
		assert.match(translation, /^美国联邦航空管理局/);
		assert.match(translation, /一切海损均不赔偿/);
	});

	it("skips duplicate prepend", () => {
		const { glossPrepended } = mergeAbbrGloss("abbr. 美国联邦航空管理局（Federal Aviation Administration）", {
			zhLabel: "美国联邦航空管理局",
			enLabel: "Federal Aviation Administration",
		});
		assert.equal(glossPrepended, false);
	});

	it("skips ambiguous cache gloss", () => {
		const { glossPrepended } = mergeAbbrGloss("n. 一切海损均不赔偿", {
			zhLabel: "某某",
			ambiguous: true,
		});
		assert.equal(glossPrepended, false);
	});
});

describe("abbr enrichment: build override", () => {
	it("builds faa override with pure abbr + aviation first", () => {
		const row = buildAbbrOverride("faa", "n", "n. 一切海损均不赔偿", {
			isAbbr: true,
			zhLabel: "美国联邦航空管理局",
			enLabel: "Federal Aviation Administration",
		});
		assert.ok(row);
		assert.equal(row.pos, "abbr");
		assert.equal(row.forcedAbbr, true);
		assert.match(row.translation, /^abbr\./);
		assert.match(row.translation, /航空/);
		assert.match(row.translation, /一切海损/);
		assert.match(row.translation, /\\n/);
	});

	it("returns null when nothing changes", () => {
		const row = buildAbbrOverride("cat", "n", "n. 猫", null);
		assert.equal(row, null);
	});
});

describe("abbr enrichment: candidates", () => {
	it("flags faa as candidate", () => {
		assert.equal(isAbbrEnrichmentCandidate("faa", "n", "n. 一切海损均不赔偿"), true);
	});

	it("skips who", () => {
		assert.equal(isAbbrEnrichmentCandidate("who", "pron", "pron. 谁"), false);
	});
});
