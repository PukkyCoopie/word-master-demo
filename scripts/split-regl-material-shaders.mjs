#!/usr/bin/env node
/**
 * 一次性：从 *ReglMount.js 抽出 shader 模块到 reglMaterials/*.shader.js
 * 运行：node scripts/split-regl-material-shaders.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(__dirname, "../src/lib");
const OUT = path.join(LIB, "reglMaterials");

const MATERIALS = [
  { mount: "goldReglMount.js", id: "gold", exportPrefix: "GOLD" },
  { mount: "steelReglMount.js", id: "steel", exportPrefix: "STEEL" },
  { mount: "iceReglMount.js", id: "ice", exportPrefix: "ICE" },
  { mount: "waterReglMount.js", id: "water", exportPrefix: "WATER" },
  { mount: "fireReglMount.js", id: "fire", exportPrefix: "FIRE" },
  { mount: "luckyReglMount.js", id: "lucky", exportPrefix: "LUCKY" },
  { mount: "wildcardReglMount.js", id: "wildcard", exportPrefix: "WILDCARD" },
];

function extractTemplateLiteral(src, constName) {
  const re = new RegExp(`const ${constName} = \`([\\s\\S]*?)\`;`);
  const m = src.match(re);
  if (!m) throw new Error(`missing ${constName}`);
  return m[1];
}

fs.mkdirSync(OUT, { recursive: true });

for (const { mount, id, exportPrefix } of MATERIALS) {
  const src = fs.readFileSync(path.join(LIB, mount), "utf8");
  const vert = extractTemplateLiteral(src, `${exportPrefix}_VERT`);
  const frag = extractTemplateLiteral(src, `${exportPrefix}_FRAG`);
  const time0Match = src.match(
    new RegExp(`const ${exportPrefix}_SHADER_TIME0 = performance\\.now\\(\\);`),
  );
  const hasTime0 = Boolean(time0Match);
  const iTimeMatch = src.match(/iTime: \(\) => ([^,\n]+)/);
  const iTimeExpr = iTimeMatch ? iTimeMatch[1].trim() : "performance.now() * 0.001";

  const isSteel = id === "steel";
  const isWildcard = id === "wildcard";

  let drawBody = "";
  if (isSteel) {
    drawBody = `
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ],
    },
    depth: { enable: false },
    cull: { enable: false },
    blend: { enable: false },
    count: 6,
    primitive: "triangles",`;
  } else {
    drawBody = `
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ],
    },
    depth: { enable: false },
    count: 4,
    primitive: "triangle strip",`;
  }

  const time0Line = hasTime0
    ? `const SHADER_TIME0 = performance.now();\n`
    : "";
  const getITimeBody = hasTime0
    ? iTimeExpr.replace(new RegExp(`${exportPrefix}_SHADER_TIME0`, "g"), "SHADER_TIME0")
    : iTimeExpr;

  const wildcardBlit = isWildcard
    ? `
import { useMobileMaterialLowPower, reglBlitImageSmoothingQuality } from "../reglMaterialPerf.js";

/** @param {import("../reglSubscriberAnimation.js").ReglDisplaySubscriber} sub */
export function blitWildcardSubscriber(sub, offscreen, texPx) {
  let cssW = sub.canvas.clientWidth;
  let cssH = sub.canvas.clientHeight;
  const useFixed =
    typeof sub.fixedCssWidth === "number" &&
    typeof sub.fixedCssHeight === "number" &&
    Number.isFinite(sub.fixedCssWidth) &&
    Number.isFinite(sub.fixedCssHeight) &&
    sub.fixedCssWidth > 0 &&
    sub.fixedCssHeight > 0;
  if (useFixed) {
    cssW = sub.fixedCssWidth;
    cssH = sub.fixedCssHeight;
  }
  if (cssW <= 0 || cssH <= 0) return;
  const pw = Math.max(2, Math.ceil(cssW * sub.dpr));
  const ph = Math.max(2, Math.ceil(cssH * sub.dpr));
  if (sub.canvas.width !== pw || sub.canvas.height !== ph) {
    sub.canvas.width = pw;
    sub.canvas.height = ph;
  }
  sub.ctx.imageSmoothingEnabled = true;
  sub.ctx.imageSmoothingQuality = reglBlitImageSmoothingQuality();
  const downsampleRatio = texPx / Math.max(1, Math.max(pw, ph));
  const blurPx =
    useMobileMaterialLowPower() || downsampleRatio <= 1.0
      ? 0
      : Math.min(0.35, (downsampleRatio - 1.0) * 0.2);
  sub.ctx.filter = blurPx > 0.0 ? \`blur(\${blurPx.toFixed(3)}px)\` : "none";
  sub.ctx.drawImage(offscreen, 0, 0, texPx, texPx, 0, 0, pw, ph);
  sub.ctx.filter = "none";
}
`
    : "";

  const blitExport = isWildcard
    ? `export { blitWildcardSubscriber as blitSubscriber };`
    : `import { blitReglOffscreenToSubscriber } from "../reglSubscriberAnimation.js";

/** @param {import("../reglSubscriberAnimation.js").ReglDisplaySubscriber} sub */
export function blitSubscriber(sub, offscreen, texPx) {
  blitReglOffscreenToSubscriber(sub, offscreen, texPx);
}`;

  const out = `/** ${id} 材质 shader（由 ${mount} 抽出，供统一 regl hub 使用） */
${wildcardBlit}
export const MATERIAL_ID = "${id}";

export const VERT = \`${vert}\`;

export const FRAG = \`${frag}\`;

${time0Line}export function getITime() {
  return ${getITimeBody};
}

/** @param {import("regl").Regl} regl */
export function createDraw(regl) {
  return regl({
    vert: VERT,
    frag: FRAG,${drawBody}
    uniforms: {
      iResolution: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
      iTime: getITime,
    },
  });
}

${blitExport}
`;

  fs.writeFileSync(path.join(OUT, `${id}.shader.js`), out, "utf8");
  console.log(`Wrote reglMaterials/${id}.shader.js`);
}
