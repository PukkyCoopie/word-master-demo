/**
 * 词典加载内部错误 → 玩家可见的简明提示（启动条 / 局内 fatal 共用）。
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function formatDictionaryLoadErrorForPlayer(raw) {
  const msg = String(raw ?? "").trim();
  if (!msg) return "词库加载失败，轻触重试";

  if (msg.includes("已取消") || msg.includes("中断")) {
    return "词库加载中断，轻触重试";
  }
  if (msg.includes("解压") || /brotli/i.test(msg)) {
    return "词库解压失败，轻触重试";
  }
  if (msg.includes("格式") || /json|unexpected token/i.test(msg)) {
    return "词库文件异常，请重装游戏";
  }
  if (/memory|allocation|heap|out of memory/i.test(msg)) {
    return "设备内存不足，请关闭其它应用后重试";
  }
  if (msg.includes("WebView") || msg.includes("不支持")) {
    return "系统组件过旧，请更新后重试";
  }
  return "词库加载失败，轻触重试";
}
