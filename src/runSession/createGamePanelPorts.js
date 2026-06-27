import { createCorePorts } from "./ports/createCorePorts.js";
import { createOverlayPorts } from "./ports/createOverlayPorts.js";
import { createPlayfieldPorts } from "./ports/createPlayfieldPorts.js";
import { createRunPorts } from "./ports/createRunPorts.js";
import { createScoringPorts } from "./ports/createScoringPorts.js";
import { createShopPorts } from "./ports/createShopPorts.js";
import { createTreasurePorts } from "./ports/createTreasurePorts.js";
import { createUiFxPorts } from "./ports/createUiFxPorts.js";

/** @param {ReturnType<import('./createGamePanelAssemblyGroups.js').createGamePanelAssemblyGroups>} groups */
export function createGamePanelPorts(groups) {
  return {
    core: createCorePorts(groups.core),
    playfield: createPlayfieldPorts(groups.grid),
    shop: createShopPorts(groups.shop),
    treasures: createTreasurePorts(groups.treasure),
    run: createRunPorts(groups.run),
    overlay: createOverlayPorts(groups.overlay),
    scoring: createScoringPorts(groups.scoring),
    uiFx: createUiFxPorts(groups.fx),
  };
}
