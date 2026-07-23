/**
 * 将 CSS min() / max() / clamp() 降级为 Chrome 70 可用写法。
 *
 * - width/height: min(A,B) → width/height: A + max-width/height: B
 * - width/height: max(A,B) → width/height: A + min-width/height: B
 * - clamp(MIN,VAL,MAX) on width/height → VAL + min-* + max-*
 * - max-width/max-height/min-width/min-height 上的 min()/max()：先写无函数回退，保留原声明给新浏览器
 * - top/right/bottom/left/margin/padding 等：同样渐进回退
 */

/**
 * @param {string} inner
 * @returns {string[]}
 */
function splitCssFnArgs(inner) {
  const args = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/**
 * @param {string} value
 * @returns {{ name: 'min' | 'max' | 'clamp', args: string[] } | null}
 */
function parseSingleCssMathFn(value) {
  const v = String(value || "").trim();
  const m = /^(min|max|clamp)\s*\(/i.exec(v);
  if (!m) return null;
  const name = /** @type {'min' | 'max' | 'clamp'} */ (m[1].toLowerCase());
  if (!v.endsWith(")")) return null;
  // 整值必须是单一函数（允许函数内嵌套 calc）
  let depth = 0;
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0 && i !== v.length - 1) return null;
    }
  }
  if (depth !== 0) return null;
  const open = v.indexOf("(");
  const inner = v.slice(open + 1, -1);
  const args = splitCssFnArgs(inner);
  if (name === "clamp" && args.length !== 3) return null;
  if ((name === "min" || name === "max") && args.length !== 2) return null;
  return { name, args };
}

/**
 * 回退参数打分：定长优先（避免 max-* 只留下 %）；min-* 则 % 优先（避免最小宽度过大撑破）。
 * @param {string[]} args
 * @param {string} prop
 */
function pickLengthFallback(args, prop = "") {
  const preferPercent = prop === "min-width" || prop === "min-height";
  const score = (a) => {
    const s = a.toLowerCase();
    let n = 0;
    if (s.includes("var(--rpx)") || /\*\s*var\(--rpx\)/.test(s)) n = 5;
    else if (/px|rem|em/.test(s)) n = 4;
    else if (s.includes("calc(")) n = 3;
    else if (s.includes("var(")) n = 2;
    else if (/%|vw|vh|dvh|svh|lvh/.test(s)) n = 1;
    else if (s.includes("env(")) n = 0;
    else n = 2;
    if (preferPercent && /%|vw|vh/.test(s)) n += 10;
    return n;
  };
  return [...args].sort((a, b) => score(b) - score(a))[0];
}

/**
 * 是否更像「流体上限」（% / vw / vh / 含 % 的 calc），适合做 max-* 而非主尺寸。
 * @param {string} a
 */
function isFluidCapLength(a) {
  const s = String(a || "").toLowerCase();
  return /%|vw|vh|dvh|svh|lvh/.test(s);
}

/**
 * width/height: min(A,B) → 主尺寸 + max-*。
 * 优先把定长（含 --rpx）放主尺寸、流体放 max-*，避免与同规则已有 `max-width:100%` 冲突时被盖成全宽。
 * （`width:100%; max-width:600rpx` 再被后面的 `max-width:100%` 覆盖 → 弹窗撑满。）
 * @param {string[]} args
 * @returns {[string, string]}
 */
function orderMinSizeArgs(args) {
  const [a, b] = args;
  const aFluid = isFluidCapLength(a);
  const bFluid = isFluidCapLength(b);
  if (aFluid && !bFluid) return [b, a];
  if (!aFluid && bFluid) return [a, b];
  // 两边都流体或都定长：保持源码顺序
  return [a, b];
}

/**
 * width/height: max(A,B) → 主尺寸 + min-*。
 * 优先把定长放主尺寸、流体放 min-*（与 min 对称）。
 * @param {string[]} args
 * @returns {[string, string]}
 */
function orderMaxSizeArgs(args) {
  return orderMinSizeArgs(args);
}

const SIZE_PROPS = new Set(["width", "height"]);

/**
 * @param {{}} [opts]
 */
export default function minMaxClampLegacy(_opts = {}) {
  return {
    postcssPlugin: "min-max-clamp-legacy",
    Declaration(decl) {
      if (decl.prop.startsWith("--")) return;
      const parsed = parseSingleCssMathFn(decl.value);
      if (!parsed) return;

      const { name, args } = parsed;
      const prop = decl.prop.toLowerCase();

      if (name === "clamp" && SIZE_PROPS.has(prop)) {
        const [minV, val, maxV] = args;
        decl.cloneBefore({ prop, value: val });
        decl.cloneBefore({
          prop: prop === "width" ? "min-width" : "min-height",
          value: minV,
        });
        decl.cloneBefore({
          prop: prop === "width" ? "max-width" : "max-height",
          value: maxV,
        });
        decl.remove();
        return;
      }

      if (name === "min" && SIZE_PROPS.has(prop)) {
        const [base, cap] = orderMinSizeArgs(args);
        decl.cloneBefore({ prop, value: base });
        decl.cloneBefore({
          prop: prop === "width" ? "max-width" : "max-height",
          value: cap,
        });
        decl.remove();
        return;
      }

      if (name === "max" && SIZE_PROPS.has(prop)) {
        const [base, floor] = orderMaxSizeArgs(args);
        decl.cloneBefore({ prop, value: base });
        decl.cloneBefore({
          prop: prop === "width" ? "min-width" : "min-height",
          value: floor,
        });
        decl.remove();
        return;
      }

      // max-width: min(...) / max-height: min(...) / min-width: min(...) 等：渐进增强
      const fallback = pickLengthFallback(args, prop);
      if (fallback && fallback !== decl.value) {
        decl.cloneBefore({ prop: decl.prop, value: fallback });
      }
    },
  };
}

minMaxClampLegacy.postcss = true;
