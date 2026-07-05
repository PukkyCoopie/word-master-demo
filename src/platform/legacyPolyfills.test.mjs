import test from "node:test";
import assert from "node:assert/strict";
import { installLegacyPolyfills } from "./legacyPolyfills.js";

test("installLegacyPolyfills supplies Object.hasOwn on legacy runtimes", () => {
  const prev = Object.hasOwn;
  try {
    // eslint-disable-next-line no-delete-var
    delete Object.hasOwn;
    installLegacyPolyfills();
    assert.equal(Object.hasOwn({ a: 1 }, "a"), true);
    assert.equal(Object.hasOwn({ a: 1 }, "b"), false);
  } finally {
    if (prev === undefined) {
      // eslint-disable-next-line no-delete-var
      delete Object.hasOwn;
    } else {
      Object.hasOwn = prev;
    }
  }
});

test("installLegacyPolyfills supplies Array.prototype.at when deletable", () => {
  const prev = Array.prototype.at;
  const deleted = Reflect.deleteProperty(Array.prototype, "at");
  if (!deleted) return;
  try {
    installLegacyPolyfills();
    assert.equal([1, 2, 3].at(-1), 3);
    assert.equal([1, 2, 3].at(99), undefined);
  } finally {
    if (prev === undefined) {
      Reflect.deleteProperty(Array.prototype, "at");
    } else {
      Array.prototype.at = prev;
    }
  }
});
