import test from "node:test";
import assert from "node:assert/strict";
import {
	normalizeDictionaryScopeIds,
	toggleDictionaryScopeId,
	scopeIdsKey,
} from "./dictionaryScopeIds.js";

test("normalizeDictionaryScopeIds defaults to full when empty", () => {
	assert.deepEqual(normalizeDictionaryScopeIds([]), ["full"]);
});

test("normalizeDictionaryScopeIds migrates legacy cet46 to cet4+cet6", () => {
	assert.deepEqual(normalizeDictionaryScopeIds(["cet46"]), ["cet4", "cet6"]);
});

test("full is exclusive", () => {
	assert.deepEqual(normalizeDictionaryScopeIds(["cet4", "full", "toefl"]), ["full"]);
});

test("toggleDictionaryScopeId selects full exclusively", () => {
	assert.deepEqual(toggleDictionaryScopeId(["cet4"], "full"), ["full"]);
});

test("toggleDictionaryScopeId removes full when selecting another scope", () => {
	assert.deepEqual(toggleDictionaryScopeId(["full"], "cet4"), ["cet4"]);
});

test("toggleDictionaryScopeId unions multiple scopes", () => {
	assert.deepEqual(toggleDictionaryScopeId(["cet4"], "toefl"), ["cet4", "toefl"]);
});

test("toggleDictionaryScopeId blocks empty selection", () => {
	assert.equal(toggleDictionaryScopeId(["cet4"], "cet4"), null);
});

test("scopeIdsKey is stable regardless of order", () => {
	assert.equal(scopeIdsKey(["toefl", "cet4"]), scopeIdsKey(["cet4", "toefl"]));
});
