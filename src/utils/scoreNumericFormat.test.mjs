import assert from "node:assert/strict";
import {
  countScoreIntegerDigits,
  estimateLocaleIntegerTextLength,
  formatScoreScientificDirect,
  resolveScoreNumericPresentation,
  SCORE_DIRECT_SCIENTIFIC_ABS_THRESHOLD,
  SCORE_LOCALE_FULL_SIZE_MAX_DIGITS,
  shouldFormatScoreAsScientificDirect,
  shouldLockScoreResultBoxWidth,
} from "./scoreNumericFormat.js";

assert.equal(shouldFormatScoreAsScientificDirect(0), false);
assert.equal(shouldFormatScoreAsScientificDirect(100_000_000), false);
assert.equal(shouldFormatScoreAsScientificDirect(999_999_999), false);
assert.equal(
  shouldFormatScoreAsScientificDirect(SCORE_DIRECT_SCIENTIFIC_ABS_THRESHOLD),
  true,
);
assert.equal(shouldFormatScoreAsScientificDirect(5e20), true);
assert.equal(shouldFormatScoreAsScientificDirect(-2e15), true);

const direct = formatScoreScientificDirect(1_500_000_000_000);
assert.match(direct, /^1\.50000e\+12$/);

assert.equal(countScoreIntegerDigits(100_000_000), SCORE_LOCALE_FULL_SIZE_MAX_DIGITS);
assert.equal(countScoreIntegerDigits(1_000_000_000), SCORE_LOCALE_FULL_SIZE_MAX_DIGITS + 1);
assert.equal(estimateLocaleIntegerTextLength(999_999_999), 11);

{
  const p = resolveScoreNumericPresentation(1234);
  assert.equal(p.text, "1,234");
  assert.equal(p.scientific, false);
  assert.equal(p.wrapped, false);
  assert.equal(p.fontScale, 1);
}

{
  const p = resolveScoreNumericPresentation(100_000_000);
  assert.equal(p.text, "100,000,000");
  assert.equal(p.scientific, false);
  assert.equal(p.fontScale, 1);
}

{
  const p = resolveScoreNumericPresentation(99_999_999, { singleLine: true });
  assert.equal(p.scientific, false);
  assert.equal(p.fontScale, 1);
}

{
  const p = resolveScoreNumericPresentation(999_999_999);
  assert.equal(p.scientific, false);
  assert.equal(p.wrapped, false);
  assert.equal(p.fontScale, 1);
}

{
  const p = resolveScoreNumericPresentation(1_000_000_000);
  assert.equal(p.scientific, true);
  assert.equal(p.fontScale, 1);
}

{
  const p = resolveScoreNumericPresentation(5e20);
  assert.equal(p.scientific, true);
  assert.equal(p.fontScale, 1);
}

assert.equal(
  shouldLockScoreResultBoxWidth(50_000, resolveScoreNumericPresentation(50_000)),
  false,
);
assert.equal(
  shouldLockScoreResultBoxWidth(5e15, resolveScoreNumericPresentation(5e15)),
  true,
);

console.log("scoreNumericFormat.test.mjs ok");
