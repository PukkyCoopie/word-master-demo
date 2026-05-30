/** 组合包类型角标/气泡文案（与商店货架、详情层一致） */
export function bundlePackKindCaptionZh(bundleKind) {
  const k = String(bundleKind ?? "");
  if (k === "spell") return "法术";
  if (k === "upgrade") return "升级";
  if (k === "treasure") return "宝藏";
  if (k === "tile") return "字母";
  return "组合";
}
