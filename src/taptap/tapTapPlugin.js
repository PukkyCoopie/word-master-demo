import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * @typedef {Object} TapTapAccount
 * @property {string} openId
 * @property {string} unionId
 * @property {string} [name]
 * @property {string} [avatar]
 */

/**
 * @typedef {Object} TapTapComplianceEvent
 * @property {number} code
 * @property {Record<string, unknown>} [extra]
 */

/** @type {import('@capacitor/core').PluginImplementations} */
const TapTapNative = registerPlugin("TapTap");

/** 浏览器 / 非原生环境 stub，便于本地 Vite 开发 */
const TapTapWebStub = {
  async getCurrentAccount() {
    return null;
  },
  async login() {
    throw new Error("TapTap login is only available in the native app");
  },
  async logout() {},
  async startCompliance() {},
  async addListener() {
    return { remove: async () => {} };
  },
};

/** @type {typeof TapTapNative} */
export const TapTap = Capacitor.isNativePlatform() ? TapTapNative : TapTapWebStub;

/** 合规认证通过，可进入游戏 */
export const COMPLIANCE_LOGIN_SUCCESS = 500;
/** 凭证无效，应回登录 */
export const COMPLIANCE_EXITED = 1000;
/** 用户切换账号 */
export const COMPLIANCE_SWITCH_ACCOUNT = 1001;
/** 当前时段不可玩 */
export const COMPLIANCE_PERIOD_RESTRICT = 1030;
/** 今日时长用尽 */
export const COMPLIANCE_DURATION_LIMIT = 1050;
/** 年龄限制 */
export const COMPLIANCE_AGE_LIMIT = 1100;
/** 网络或配置错误 */
export const COMPLIANCE_NETWORK_ERROR = 1200;
/** 用户关闭实名窗 */
export const COMPLIANCE_REAL_NAME_STOP = 9002;

/**
 * @param {unknown} account
 * @returns {account is TapTapAccount}
 */
export function isTapTapAccount(account) {
  return (
    account != null &&
    typeof account === "object" &&
    typeof /** @type {TapTapAccount} */ (account).unionId === "string" &&
    /** @type {TapTapAccount} */ (account).unionId.length > 0
  );
}
