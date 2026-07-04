import test from "node:test";
import assert from "node:assert/strict";
import { reconcilePackPickClaimedTreasures } from "./packPickSessionReconcile.js";

test("reconcilePackPickClaimedTreasures 撤销未入栏的宝藏领取标记", () => {
  const session = {
    pickCount: 1,
    options: [
      {
        optionKey: "fountain",
        offerType: "treasure",
        treasureId: "144",
      },
    ],
    claimedKeys: ["fountain"],
  };
  const fixed = reconcilePackPickClaimedTreasures(session, [null, null]);
  assert.deepEqual(fixed.claimedKeys, []);
});

test("reconcilePackPickClaimedTreasures 保留已入栏宝藏的领取标记", () => {
  const session = {
    pickCount: 1,
    options: [
      {
        optionKey: "fountain",
        offerType: "treasure",
        treasureId: "144",
      },
    ],
    claimedKeys: ["fountain"],
  };
  const fixed = reconcilePackPickClaimedTreasures(session, [{ treasureId: "144" }, null]);
  assert.deepEqual(fixed.claimedKeys, ["fountain"]);
});

test("reconcilePackPickClaimedTreasures 非宝藏选项不受影响", () => {
  const session = {
    pickCount: 1,
    options: [{ optionKey: "spell-a", offerType: "spell", spellId: "cake" }],
    claimedKeys: ["spell-a"],
  };
  const fixed = reconcilePackPickClaimedTreasures(session, []);
  assert.deepEqual(fixed.claimedKeys, ["spell-a"]);
});
