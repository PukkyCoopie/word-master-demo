import { describe } from "../treasureDescription.js";
import { rollJokerLevelEnterDeckCardSpec } from "../../game/jokerLevelEnterCard.js";
import { wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

const ID = "96";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当进入关卡时，在你的字母库中添加一个具有随机增益效果的字母并立即抽到它"),
  unlockPrerequisite: { type: "deckGoldCoinAccessory" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  prepareLevelEnter(ctx) {
    const append = ctx.appendDeckCardSpecToInitialSnapshot;
    if (typeof append !== "function") return;
    const spec = rollJokerLevelEnterDeckCardSpec(ctx.rng ?? Math.random);
    const card = append(spec);
    const uid = card && typeof card === "object" ? Number(/** @type {{ _dcUid?: number }} */ (card)._dcUid) : NaN;
    if (ctx.treasureRun && Number.isFinite(uid)) {
      ctx.treasureRun.jokerForcedDrawUid = uid;
    }
  },
  async onLevelEnter(ctx) {
    if (ctx.treasureRun?.jokerForcedDrawUid != null) {
      await wobbleTreasureHookContributor(ctx, ID);
    }
  },
};
