import { Capacitor } from "@capacitor/core";
import { hasPrivacyConsent } from "../privacy/privacyConsent.js";
import { logTapTapEvent } from "../taptap/tapTapPlugin.js";

const MAX_PROP_LEN = 240;
const MAX_REPORTS_PER_FINGERPRINT = 3;
/** TapDB v4：事件 client_error_02 + wm_err_* 属性须先在「事件属性管理」登记并关联到该事件 */
const CLIENT_ERROR_EVENT = "client_error_02";

/** @type {Map<string, number>} */
const reportedCounts = new Map();

/**
 * @param {unknown} value
 * @param {number} [max]
 */
function truncate(value, max = MAX_PROP_LEN) {
  const str = String(value ?? "");
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

/**
 * @param {Record<string, unknown>} payload
 */
function buildFingerprint(payload) {
  return `${payload.source ?? ""}|${payload.message ?? ""}`;
}

/** TapDB v4：仅输出已登记的 wm_err_* 业务属性。 */
function toTapEventProperties(fields) {
  /** @type {Record<string, string>} */
  const out = {};
  const source = fields.source;
  const message = fields.message;
  const stack = fields.stack;
  const phase = fields.phase;
  if (source) out.wm_err_source = truncate(source);
  if (message) out.wm_err_message = truncate(message);
  if (stack) out.wm_err_stack = truncate(stack);
  if (phase) out.wm_err_phase = truncate(phase);
  return out;
}

/**
 * @param {Record<string, unknown>} [extra]
 */
function formatExtraForMessage(extra) {
  if (!extra || typeof extra !== "object") return "";
  const parts = [];
  for (const [key, value] of Object.entries(extra).slice(0, 5)) {
    if (value == null || value === "") continue;
    parts.push(`${key}=${truncate(value, 80)}`);
  }
  return parts.length ? ` (${parts.join(", ")})` : "";
}

/** 浏览器已知良性噪声：ResizeObserver 回调里触发布局会触发，不应上报。 */
function isBenignBrowserNoise(message) {
  const msg = String(message ?? "");
  return (
    msg.includes("ResizeObserver loop limit exceeded") ||
    msg.includes("ResizeObserver loop completed with undelivered notifications")
  );
}

/**
 * 原生包内将客户端错误上报 TapDB 自定义事件（需已同意隐私政策且 SDK 已初始化）。
 *
 * @param {{
 *   source?: string;
 *   message?: string;
 *   stack?: string;
 *   phase?: string;
 *   extra?: Record<string, unknown>;
 * }} payload
 * @returns {Promise<boolean>} 是否已向 TapDB 发送（非原生、未同意隐私、去重或失败为 false）
 */
export async function reportClientError(payload) {
  if (!Capacitor.isNativePlatform()) return false;

  const source = truncate(payload.source ?? "unknown", 64);
  const extra = payload.extra && typeof payload.extra === "object" ? payload.extra : {};
  const message = truncate(`${payload.message ?? ""}${formatExtraForMessage(extra)}`, MAX_PROP_LEN);
  if (isBenignBrowserNoise(message) || isBenignBrowserNoise(payload.message)) return false;
  if (/^400002:/.test(String(payload.message ?? "")) || /^400002:/.test(message)) return false;
  const stack = payload.stack ? truncate(payload.stack, MAX_PROP_LEN) : "";
  const phase = payload.phase ? truncate(payload.phase, 64) : "";

  const fingerprint = buildFingerprint({ source, message });
  const count = reportedCounts.get(fingerprint) ?? 0;
  if (count >= MAX_REPORTS_PER_FINGERPRINT) return false;
  reportedCounts.set(fingerprint, count + 1);

  console.error("[clientError]", { source, message, phase, extra, stack: stack || undefined });

  if (!hasPrivacyConsent()) return false;

  /** @type {Record<string, string>} */
  const properties = toTapEventProperties({
    source,
    message,
    ...(stack ? { stack } : {}),
    ...(phase ? { phase } : {}),
  });

  try {
    await logTapTapEvent(CLIENT_ERROR_EVENT, properties);
    return true;
  } catch {
    /* 上报失败不影响游戏 */
    return false;
  }
}

/** 注册 window.onerror / unhandledrejection 全局捕获（仅原生壳）。 */
export function initClientErrorReporter() {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return;
  if (window.__WM_CLIENT_ERROR_REPORTER__) return;
  window.__WM_CLIENT_ERROR_REPORTER__ = true;

  window.addEventListener("error", (event) => {
    if (isBenignBrowserNoise(event.message)) return;
    void reportClientError({
      source: "window.error",
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      extra: {
        file: event.filename,
        line: String(event.lineno ?? ""),
        col: String(event.colno ?? ""),
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    if (isBenignBrowserNoise(message)) return;
    /* Tap 云存档「指定存档不存在」属可恢复业务态，已在 sync 层处理，勿当客户端崩溃上报 */
    if (/^400002:/.test(message)) return;
    void reportClientError({
      source: "unhandledrejection",
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
