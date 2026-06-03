import { Capacitor } from "@capacitor/core";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { isE2eMode } from "../e2e/isE2eMode.js";
import {
  COMPLIANCE_AGE_LIMIT,
  COMPLIANCE_DURATION_LIMIT,
  COMPLIANCE_EXITED,
  COMPLIANCE_LOGIN_SUCCESS,
  COMPLIANCE_NETWORK_ERROR,
  COMPLIANCE_PERIOD_RESTRICT,
  COMPLIANCE_REAL_NAME_STOP,
  COMPLIANCE_SWITCH_ACCOUNT,
  isTapTapAccount,
  TapTap,
} from "../taptap/tapTapPlugin.js";

/**
 * @typedef {'idle' | 'checking' | 'needsLogin' | 'compliance' | 'ready' | 'blocked' | 'error'} TapTapAuthPhase
 */

const BLOCK_MESSAGES = {
  [COMPLIANCE_PERIOD_RESTRICT]: "当前不在可游戏时段，请稍后再试。",
  [COMPLIANCE_DURATION_LIMIT]: "今日游戏时长已用尽。",
  [COMPLIANCE_AGE_LIMIT]: "根据年龄限制，暂无法进入游戏。",
};

const isNative = Capacitor.isNativePlatform();
const bypassAuth = !isNative || isE2eMode();

/** @type {import('vue').Ref<TapTapAuthPhase>} */
const phase = ref(bypassAuth ? "ready" : "checking");
/** @type {import('vue').Ref<import('../taptap/tapTapPlugin.js').TapTapAccount | null>} */
const account = ref(null);
const authMessage = ref("");
const loginBusy = ref(false);

/** @type {import('@capacitor/core').PluginListenerHandle | null} */
let complianceListener = null;
let authMountCount = 0;
let authBootstrapped = false;

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

/**
 * @param {number} code
 */
function handleComplianceCode(code) {
  if (code === COMPLIANCE_LOGIN_SUCCESS) {
    authMessage.value = "";
    phase.value = "ready";
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
    return;
  }
  if (code === COMPLIANCE_NETWORK_ERROR) {
    authMessage.value = "网络或应用配置异常，请检查后重试。";
    phase.value = "error";
    return;
  }
  if (code in BLOCK_MESSAGES) {
    authMessage.value = BLOCK_MESSAGES[/** @type {keyof typeof BLOCK_MESSAGES} */ (code)];
    phase.value = "blocked";
    return;
  }
}

/**
 * @param {import('../taptap/tapTapPlugin.js').TapTapAccount} nextAccount
 */
async function beginCompliance(nextAccount) {
  account.value = nextAccount;
  phase.value = "compliance";
  authMessage.value = "";
  await TapTap.startCompliance({ userIdentifier: nextAccount.unionId });
}

async function bootstrapAuth() {
  if (bypassAuth) {
    phase.value = "ready";
    return;
  }
  phase.value = "checking";
  authMessage.value = "";
  try {
    const current = await TapTap.getCurrentAccount();
    if (!isTapTapAccount(current)) {
      phase.value = "needsLogin";
      return;
    }
    await beginCompliance(current);
  } catch {
    phase.value = "needsLogin";
  }
}

async function ensureAuthListener() {
  if (bypassAuth || complianceListener) return;
  complianceListener = await TapTap.addListener("complianceResult", (event) => {
    handleComplianceCode(Number(event?.code));
  });
}

/**
 * 原生 App：TapTap 登录 + 合规认证；Web / E2E 直接放行。
 */
export function useTapTapAuth() {
  const showMenuActions = computed(() => phase.value === "ready");
  const showLoginButton = computed(() => phase.value === "needsLogin");
  const showAuthBusy = computed(() => phase.value === "checking" || phase.value === "compliance");
  const showAuthBlocked = computed(() => phase.value === "blocked" || phase.value === "error");

  async function loginWithTapTap() {
    if (bypassAuth || loginBusy.value) return;
    loginBusy.value = true;
    authMessage.value = "";
    try {
      const loggedIn = await TapTap.login();
      if (!isTapTapAccount(loggedIn)) {
        phase.value = "needsLogin";
        return;
      }
      await beginCompliance(loggedIn);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("cancelled") || message.includes("取消")) {
        authMessage.value = "";
      } else if (
        message.includes("包名") ||
        message.includes("签名") ||
        /signature/i.test(message)
      ) {
        authMessage.value = await formatSignatureMismatchHint();
        phase.value = "error";
      } else {
        authMessage.value = message.trim() || "登录失败，请重试。";
        phase.value = "error";
      }
    } finally {
      loginBusy.value = false;
    }
  }

  async function retryAuth() {
    authMessage.value = "";
    await bootstrapAuth();
  }

  /** 跳过 TapTap 登录与防沉迷，直接进入主菜单。 */
  function playOffline() {
    authMessage.value = "";
    account.value = null;
    phase.value = "ready";
  }

  onMounted(async () => {
    authMountCount += 1;
    if (bypassAuth) return;
    await ensureAuthListener();
    if (!authBootstrapped) {
      authBootstrapped = true;
      await bootstrapAuth();
    }
  });

  onBeforeUnmount(async () => {
    authMountCount = Math.max(0, authMountCount - 1);
    if (authMountCount === 0 && complianceListener) {
      await complianceListener.remove();
      complianceListener = null;
      authBootstrapped = false;
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
    showAuthBusy,
    showAuthBlocked,
    loginWithTapTap,
    retryAuth,
    playOffline,
  };
}
