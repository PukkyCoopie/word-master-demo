import test from "node:test";
import assert from "node:assert/strict";
import { deckStackPileVisibleEntries } from "./deckStackPileLayout.js";

test("抽牌堆为空时 pile 仅展示顶面一张", () => {
  const stack = {
    inDrawPile: 0,
    entries: [{ kind: "grid" }, { kind: "grid" }, { kind: "spent" }],
  };
  assert.deepEqual(deckStackPileVisibleEntries(stack), [{ kind: "spent" }]);
});

test("抽牌堆有牌时 pile 展示全部 entries", () => {
  const stack = {
    inDrawPile: 2,
    entries: [{ kind: "deck" }, { kind: "deck" }],
  };
  assert.equal(deckStackPileVisibleEntries(stack).length, 2);
});
