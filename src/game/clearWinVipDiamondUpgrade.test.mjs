import assert from "node:assert/strict";
import test from "node:test";
import { ACCESSORY_VIP_DIAMOND } from "../accessories/accessoryCatalog.js";
import {
  resolveClearWinVipDiamondRarityUpgrade,
  shouldRegisterClearWinVipDiamondUpgrade,
} from "./clearWinVipDiamondUpgrade.js";

test("resolveClearWinVipDiamond：词首 accessoryId 为钻石时命中", () => {
  const hit = resolveClearWinVipDiamondRarityUpgrade(
    [{ accessoryId: ACCESSORY_VIP_DIAMOND, rarity: "common" }],
    true,
  );
  assert.ok(hit);
  assert.equal(hit.rk, "common");
  assert.equal(hit.slotIndex, 0);
});

test("resolveClearWinVipDiamond：仅 treasureAccessoryId 存钻石时也应命中", () => {
  const hit = resolveClearWinVipDiamondRarityUpgrade(
    [{ accessoryId: null, treasureAccessoryId: ACCESSORY_VIP_DIAMOND, rarity: "rare" }],
    true,
  );
  assert.ok(hit);
  assert.equal(hit.rk, "rare");
});

test("resolveClearWinVipDiamond：非通关手不触发", () => {
  assert.equal(
    resolveClearWinVipDiamondRarityUpgrade(
      [{ accessoryId: ACCESSORY_VIP_DIAMOND, rarity: "common" }],
      false,
    ),
    null,
  );
});

test("shouldRegisterClearWinVipDiamond：Boss 软违规时不登记实际升级", () => {
  assert.equal(shouldRegisterClearWinVipDiamondUpgrade({ bossSoftViolation: true }), false);
  assert.equal(shouldRegisterClearWinVipDiamondUpgrade({ bossSoftViolation: false }), true);
});
