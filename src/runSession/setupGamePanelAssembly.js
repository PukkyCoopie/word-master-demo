import { buildGamePanelAssemblyBinding } from "./buildGamePanelAssemblyBinding.js";
import { buildGamePanelAssemblySections } from "./buildGamePanelAssemblySections.js";
import { createGamePanelAssemblyGroups } from "./createGamePanelAssemblyGroups.js";
import { createGamePanelPorts } from "./createGamePanelPorts.js";

/**
 * 装配 session assembly ports（R4 收尾：分组 deps）。
 * @param {Parameters<typeof buildGamePanelAssemblySections>[0]} sections
 */
export function setupGamePanelAssembly(sections) {
  const groups = createGamePanelAssemblyGroups(
    buildGamePanelAssemblyBinding(buildGamePanelAssemblySections(sections)),
  );
  return { ports: createGamePanelPorts(groups) };
}
