import * as gold from "./gold.shader.js";
import * as steel from "./steel.shader.js";
import * as ice from "./ice.shader.js";
import * as water from "./water.shader.js";
import * as fire from "./fire.shader.js";
import * as lucky from "./lucky.shader.js";
import * as wildcard from "./wildcard.shader.js";

/** 绘制顺序：偏重 shader 靠后，便于剖析对比 */
export const MATERIAL_SHADER_MODULES = Object.freeze([
  gold,
  steel,
  ice,
  water,
  fire,
  wildcard,
  lucky,
]);
