import { describe, prob } from "../treasureDescription.js";
import { tryOpenInRunPackOnPosProgress } from "../treasureInRunPackTriggers.js";

const ID = "81";
const REQUIRED = 3;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每次拼写名词有", prob("1/3"), "概率打开一个宝藏组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnPosProgress(ctx, {
      treasureId: ID,
      posKey: "n",
      packKind: "treasure",
      requiredCount: REQUIRED,
    });
  },
};
