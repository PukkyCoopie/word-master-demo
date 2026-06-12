import { Capacitor } from "@capacitor/core";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { isE2eMode } from "../e2e/isE2eMode.js";
import { hasPrivacyConsent } from "../privacy/privacyConsent.js";
import { resetTapTapAchievementBootstrap } from "../achievements/achievementTapTapSync.js";
import {
  COMPLIANCE_AGE_LIMIT,
  COMPLIANCE_DURATION_LIMIT,
  COMPLIANCE_EXITED,
  COMPLIANCE_LOGIN_SUCCESS,
  COMPLIANCE_NETWORK_ERROR,
  COMPLIANCE_PERIOD_RESTRICT,
  COMPLIANCE_REAL_NAME_STOP,
  COMPLIANCE_SWITCH_ACCOUNT,
  ensureTapTapSdkInitialized,
  isTapTapAccount,
  TapTap,
} from "../taptap/tapTapPlugin.js";

/**
 * @typedef {'awaitingPrivacy' | 'needsLogin' | 'compliance' | 'ready' | 'blocked' | 'error'} TapTapAuthPhase
 */

const BLOCK_MESSAGES = {
  [COMPLIANCE_PERIOD_RESTRICT]: "当前不在可游戏时段，请稍后再试。",
  [COMPLIANCE_DURATION_LIMIT]: "今日游戏时长已用尽。",
  [COMPLIANCE_AGE_LIMIT]: "根据年龄限制，暂无法进入游戏。",
};

const isNative = Capacitor.isNativePlatform();
const bypassAuth = !isNative || isE2eMode();

/** @returns {TapTapAuthPhase} */
function resolveInitialAuthPhase() {
  if (bypassAuth) return "ready";
  return hasPrivacyConsent() ? "needsLogin" : "awaitingPrivacy";
}

/** @type {import('vue').Ref<TapTapAuthPhase>} */
const phase = ref(resolveInitialAuthPhase());
/** @type {import('vue').Ref<import('../taptap/tapTapPlugin.js').TapTapAccount | null>} */
const account = ref(null);
const authMessage = ref("");
const loginBusy = ref(false);

/** @type {import('@capacitor/core').PluginListenerHandle | null} */
let complianceListener = null;
let authMountCount = 0;
let loginFlowActive = false;

/** @returns {Promise<string>} */
async function formatSignatureMismatchHint() {
  try {
    /** @type {import('../taptap/tapTapPlugin.js').TapTapAndroidAppInfo | null | undefined} */
    const info = await TapTap.getAndroidAppInfo();
    if (info?.packageName && info?.signatureMd5) {
      return `TapTap 后台 Android 配置须与本机安装包一致。当前包名 ${info.packageName}，签名 MD5 ${info.signatureMd5}（32 位、无冒号，区分大小写）。`;
    }
  } catch {
    /* ignore */
  }
  return "TapTap 应用配置与当前安装包不一致（包名或签名 MD5）。请在 TapTap 开发者中心核对 Android 包名与签名。";
}

function finishLoginFlow() {
  loginFlowActive = false;
  loginBusy.value = false;
}

/**
 * @param {number} code
 */
function handleComplianceCode(code) {
  if (code === COMPLIANCE_LOGIN_SUCCESS) {
    authMessage.value = "";
    phase.value = "ready";
    finishLoginFlow();
    return;
  }
  if (
    code === COMPLIANCE_EXITED ||
    code === COMPLIANCE_SWITCH_ACCOUNT ||
    code === COMPLIANCE_REAL_NAME_STOP
  ) {
    account.value = null;
    authMessage.value = "";
    phase.value = "needsLogin";
    resetTapTapAchievementBootstrap();
    finishLoginFlow();
    return;
  }
  if (code === COMPLIANCE_NETWORK_ERROR) {
    authMessage.value = "网络或应用配置异常，请检查后重试。";
    phase.value = "error";
    finishLoginFlow();
    return;
  }
  if (code in BLOCK_MESSAGES) {
    authMessage.value = BLOCK_MESSAGES[/** @type {keyof typeof BLOCK_MESSAGES} */ (code)];
    phase.value = "blocked";
    finishLoginFlow();
    return;
  }
  authMessage.value = `防沉迷验证异常（${code}），请重试或切换账号。`;
  phase.value = "error";
  finishLoginFlow();
}

/** @param {import('../taptap/tapTapPlugin.js').TapTapAccount} nextAccount */
function resolveComplianceUserIdentifier(nextAccount) {
  const openId = String(nextAccount.openId ?? "").trim();
  if (openId) return openId;
  return String(nextAccount.unionId ?? "").trim();
}

async function beginCompliance(nextAccount) {
  const userIdentifier = resolveComplianceUserIdentifier(nextAccount);
  if (!userIdentifier) {
    phase.value = "needsLogin";
    finishLoginFlow();
    return;
  }
  account.value = nextAccount;
  phase.value = "compliance";
  authMessage.value = "";
  await TapTap.startCompliance({ userIdentifier });
}

/**
 * @param {unknown} err
 * @returns {boolean} 是否已写入 authMessage / phase
 */
async function handleLoginFlowError(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("cancelled") || message.includes("取消")) {
    authMessage.value = "";
    phase.value = "needsLogin";
    return true;
  }
  if (
    message.includes("包名") ||
    message.includes("签名") ||
    /signature/i.test(message)
  ) {
    authMessage.value = await formatSignatureMismatchHint();
    phase.value = "error";
    return true;
  }
  const trimmed = message.trim();
  if (trimmed) {
    authMessage.value = trimmed;
    phase.value = "error";
    return true;
  }
  return false;
}

async function runTapTapLoginAndCompliance() {
  if (bypassAuth || loginFlowActive) return;
  loginFlowActive = true;
  loginBusy.value = true;
  authMessage.value = "";
  phase.value = "needsLogin";
  try {
    await ensureTapTapSdkInitialized();
    const loggedIn = await TapTap.login();
    if (!isTapTapAccount(loggedIn)) {
      phase.value = "needsLogin";
      finishLoginFlow();
      return;
    }
    await beginCompliance(loggedIn);
  } catch (err) {
    const handled = await handleLoginFlowError(err);
    if (!handled) {
      authMessage.value = "登录失败，请重试。";
      phase.value = "error";
    }
    finishLoginFlow();
  }
}

/** 用户同意隐私政策后进入 TapTap 登录入口（不自动登录/验证）。 */
export function onPrivacyConsentGrantedForAuth() {
  if (bypassAuth) {
    phase.value = "ready";
    return;
  }
  phase.value = "needsLogin";
}

async function ensureAuthListener() {
  if (bypassAuth || complianceListener) return;
  complianceListener = await TapTap.addListener("complianceResult", (event) => {
    handleComplianceCode(Number(event?.code));
  });
}

async function resetTapTapSession() {
  authMessage.value = "";
  finishLoginFlow();
  try {
    await TapTap.logout();
  } catch {
    /* ignore */
  }
  account.value = null;
  resetTapTapAchievementBootstrap();
  phase.value = "needsLogin";
}

/**
 * 原生 App：TapTap 登录 + 合规认证；Web / E2E 直接放行。
 */
export function useTapTapAuth() {
  const showMenuActions = computed(() => phase.value === "ready");
  const showLoginButton = computed(
    () => phase.value === "needsLogin" || phase.value === "compliance",
  );
  const showAuthBlocked = computed(() => phase.value === "blocked" || phase.value === "error");

  async function loginWithTapTap() {
    await runTapTapLoginAndCompliance();
  }

  async function retryAuth() {
    authMessage.value = "";
    await runTapTapLoginAndCompliance();
  }

  async function switchTapTapAccount() {
    if (bypassAuth || loginFlowActive) return;
    await resetTapTapSession();
  }

  /** 跳过 TapTap 登录与防沉迷，直接进入主菜单。 */
  function playOffline() {
    authMessage.value = "";
    finishLoginFlow();
    account.value = null;
    phase.value = "ready";
    resetTapTapAchievementBootstrap();
  }

  onMounted(async () => {
    authMountCount += 1;
    if (bypassAuth) return;
    if (hasPrivacyConsent()) {
      try {
        await ensureTapTapSdkInitialized();
      } catch {
        /* ignore */
      }
    }
    await ensureAuthListener();
  });

  onBeforeUnmount(async () => {
    authMountCount = Math.max(0, authMountCount - 1);
    if (authMountCount === 0 && complianceListener) {
      await complianceListener.remove();
      complianceListener = null;
    }
  });

  return {
    isNative,
    bypassAuth,
    phase,
    account,
    authMessage,
    loginBusy,
    showMenuActions,
    showLoginButton,
    showAuthBlocked,
    loginWithTapTap,
    retryAuth,
    switchTapTapAccount,
    playOffline,
  };
}

/** 防沉迷未通过时须离开对局/收藏，回到主菜单展示限制说明。 */
export const TAP_TAP_AUTH_MENU_ONLY_PHASES = new Set([
  "blocked",
  "needsLogin",
  "error",
  "awaitingPrivacy",
]);
