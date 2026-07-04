import { describe, prob } from "../treasureDescription.js";
import { tryOpenInRunPackOnPosProgress } from "../treasureInRunPackTriggers.js";

const ID = "82";
const REQUIRED = 2;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当你拼写一个形容词后，有", prob("1/2"), "概率打开一个法术组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnPosProgress(ctx, {
      treasureId: ID,
      posKey: "adj",
      packKind: "spell",
      requiredCount: REQUIRED,
    });
  },
};
