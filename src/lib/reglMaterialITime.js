import { isMaterialAnimationEnabled } from "./reglMaterialPerf.js";

/** 关闭材质动画时，所有静帧共用同一 shader 时刻，避免棋盘/飞行/入词各贴一帧 */
export const MATERIAL_STATIC_SHADER_I_TIME = 0;

const MATERIAL_SHADER_TIME_ORIGIN = performance.now();

/**
 * 各材质 regl shader 的 iTime 统一入口。
 * @param {number} [scale=1] 相对秒缩放（与原各材质 getITime 一致）
 * @param {{ wallClock?: boolean }} [opts] wildcard 等使用绝对墙钟秒
 * @returns {number}
 */
export function resolveMaterialShaderITime(scale = 1, opts = {}) {
  if (!isMaterialAnimationEnabled()) return MATERIAL_STATIC_SHADER_I_TIME;
  if (opts.wallClock) return performance.now() * 0.001;
  return (performance.now() - MATERIAL_SHADER_TIME_ORIGIN) * 0.001 * scale;
}
