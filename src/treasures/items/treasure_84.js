import { concept, describe, prob } from "../treasureDescription.js";
import { tryOpenInRunPackOnPosProgress } from "../treasureInRunPackTriggers.js";

const ID = "84";
const REQUIRED = 2;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每次拼写动词有", prob("1/2"), "概率打开一个", concept("升级"), "组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnPosProgress(ctx, {
      treasureId: ID,
      posKey: "v",
      packKind: "upgrade",
      requiredCount: REQUIRED,
    });
  },
};
