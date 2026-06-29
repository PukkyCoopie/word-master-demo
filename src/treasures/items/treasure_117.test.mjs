import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_117.js";
import { createTreasureRunState } from "../treasureRunState.js";

test("光盘 getOwnedDetailSpellReplayTargetId：返回离店前最后一次法术", () => {
  const rs = createTreasureRunState();
  rs.lastSpellIdBeforeShopLeave = "hand_coin";
  assert.equal(
    treasureHooks.getOwnedDetailSpellReplayTargetId?.({ treasureRun: rs }),
    "hand_coin",
  );
});

test("光盘 getOwnedDetailSpellReplayTargetId：跳过重播/骰子", () => {
  const rs = createTreasureRunState();
  rs.lastSpellIdBeforeShopLeave = "restart";
  assert.equal(treasureHooks.getOwnedDetailSpellReplayTargetId?.({ treasureRun: rs }), null);
  rs.lastSpellIdBeforeShopLeave = "dice";
  assert.equal(treasureHooks.getOwnedDetailSpellReplayTargetId?.({ treasureRun: rs }), null);
});

test("光盘 onShopLeave：未拥有时不重播", async () => {
  const rs = createTreasureRunState();
  rs.lastSpellIdBeforeShopLeave = "price_tag";
  let called = false;
  await treasureHooks.onShopLeave?.({
    ownedSlotTreasureIds: ["1"],
    treasureRun: rs,
    replayLastSpellInRun: async () => {
      called = true;
    },
  });
  assert.equal(called, false);
});

test("光盘 onShopLeave：拥有时重播上一法术并传入槽位", async () => {
  const rs = createTreasureRunState();
  rs.lastSpellIdBeforeShopLeave = "treasure_map";
  /** @type {{ spellId?: string, treasureSlotIndex?: number } | null} */
  let payload = null;
  await treasureHooks.onShopLeave?.({
    ownedSlotTreasureIds: ["117"],
    treasureRun: rs,
    hookSlotIndex: 2,
    replayLastSpellInRun: async (spellId, opts) => {
      payload = { spellId, treasureSlotIndex: opts?.treasureSlotIndex };
    },
  });
  assert.deepEqual(payload, { spellId: "treasure_map", treasureSlotIndex: 2 });
});
