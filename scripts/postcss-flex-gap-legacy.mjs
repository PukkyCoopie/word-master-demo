/**
 * Flex gap 旧环境回退（不改写原生 gap）。
 * 仅当同规则含 display:flex|inline-flex 与 gap/row-gap/column-gap 时，
 * 在 `html.no-flex-gap` 下用负 margin 容器 + 子项正 margin 模拟（含 wrap）。
 * Grid 的 gap 不处理（Chrome 70 已支持）。
 */

/**
 * 按顶层空白拆分 gap 简写（不拆 calc() / 函数内空格）。
 * @param {string} gap
 * @returns {string[]}
 */
function splitGapValues(gap) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of String(gap || "").trim()) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * @param {string} value
 * @returns {string}
 */
function negateCssLength(value) {
  const v = String(value || "").trim();
  if (!v || v === "0" || v === "0px") return "0px";
  if (v.startsWith("calc(") && v.endsWith(")")) {
    return `calc(-1 * (${v.slice(5, -1).trim()}))`;
  }
  return `calc(-1 * (${v}))`;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isZeroGap(value) {
  const v = String(value || "").trim();
  return !v || v === "0" || v === "0px" || v === "0%";
}

/**
 * @param {string} selector
 * @param {string} gate
 * @param {string} suffix
 */
function gateSelector(selector, gate, suffix = "") {
  return selector
    .split(",")
    .map((part) => {
      const s = part.trim();
      if (!s) return s;
      return suffix ? `${gate} ${s}${suffix}` : `${gate} ${s}`;
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * @param {{ flexGapNotSupported?: string }} [opts]
 */
export default function flexGapLegacyFallback(opts = {}) {
  const gate = opts.flexGapNotSupported || "html.no-flex-gap";

  return {
    postcssPlugin: "flex-gap-legacy-fallback",
    Once(root, { Rule }) {
      /** @type {{ after: import('postcss').Rule, containerSel: string, itemSel: string, row: string, col: string }[]} */
      const pending = [];

      root.walkRules((rule) => {
        if (rule.selector.includes(gate)) return;
        // 跳过 keyframes / 字体等
        const parent = rule.parent;
        if (parent?.type === "atrule" && parent.name === "keyframes") return;

        let hasFlex = false;
        /** @type {string | null} */
        let gap = null;
        /** @type {string | null} */
        let rowGap = null;
        /** @type {string | null} */
        let colGap = null;

        for (const node of rule.nodes || []) {
          if (node.type !== "decl") continue;
          const prop = node.prop;
          const value = node.value;
          if (prop === "display" && (value === "flex" || value === "inline-flex")) {
            hasFlex = true;
          } else if (prop === "gap") {
            gap = value;
          } else if (prop === "row-gap") {
            rowGap = value;
          } else if (prop === "column-gap") {
            colGap = value;
          }
        }

        if (!hasFlex) return;

        let row = rowGap;
        let col = colGap;
        if (gap != null) {
          const parts = splitGapValues(gap);
          if (row == null) row = parts[0] ?? null;
          if (col == null) col = parts[1] ?? parts[0] ?? null;
        }

        if (row == null && col == null) return;
        row = row ?? "0px";
        col = col ?? "0px";
        if (isZeroGap(row) && isZeroGap(col)) return;

        pending.push({
          after: rule,
          containerSel: gateSelector(rule.selector, gate),
          itemSel: gateSelector(rule.selector, gate, " > *"),
          row,
          col,
        });
      });

      for (const item of pending) {
        const containerRule = new Rule({ selector: item.containerSel });
        containerRule.append({ prop: "gap", value: "0px" });
        containerRule.append({ prop: "row-gap", value: "0px" });
        containerRule.append({ prop: "column-gap", value: "0px" });
        if (!isZeroGap(item.row)) {
          containerRule.append({ prop: "margin-top", value: negateCssLength(item.row) });
        }
        if (!isZeroGap(item.col)) {
          containerRule.append({ prop: "margin-left", value: negateCssLength(item.col) });
        }

        const itemRule = new Rule({ selector: item.itemSel });
        if (!isZeroGap(item.row)) {
          itemRule.append({ prop: "margin-top", value: item.row });
        }
        if (!isZeroGap(item.col)) {
          itemRule.append({ prop: "margin-left", value: item.col });
        }

        item.after.after(itemRule);
        item.after.after(containerRule);
      }
    },
  };
}

flexGapLegacyFallback.postcss = true;
