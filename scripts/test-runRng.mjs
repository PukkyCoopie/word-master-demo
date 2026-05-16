import assert from "node:assert/strict";
import {
  createRunRng,
  hashSeed32,
  mulberry32,
  normalizeRunSeedInput,
  stringToRunSeed,
} from "../src/game/runRng.js";

const a = mulberry32(12345);
const b = mulberry32(12345);
assert.equal(a(), b());
assert.equal(a(), b());

const r1 = createRunRng(stringToRunSeed("TESTSEED"));
const r2 = createRunRng(stringToRunSeed("TESTSEED"));
assert.equal(r1.next(), r2.next());

assert.equal(normalizeRunSeedInput("ab0c!"), "ABOC");
assert.notEqual(stringToRunSeed("A"), stringToRunSeed("B"));

const bossA = hashSeed32(90210, "boss", 1, 0);
const bossB = hashSeed32(90210, "boss", 1, 0);
assert.equal(bossA, bossB);

console.log("runRng: ok");
