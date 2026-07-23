import { Capacitor, registerPlugin } from "@capacitor/core";
import { resolveWordSpeechText } from "./wordSpeechPronunciation.js";

/**
 * @typedef {{
 *   speak: (options: { text: string }) => Promise<void>;
 *   stop: () => Promise<void>;
 *   getAvailability: () => Promise<{ available?: boolean, reason?: string }>;
 * }} WordSpeechPlugin
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   cancelled?: boolean,
 *   message?: string,
 * }} SpeakWordResult
 */

const WordSpeechNative = registerPlugin("WordSpeech");

/** @type {boolean | null} */
let cachedAvailable = null;
/** @type {string} */
let cachedUnavailableReason = "";

const UNAVAILABLE_HINT = "无法发音：请检查系统文字转语音与媒体音量";
const SPEAK_FAIL_HINT = "发音失败：请检查系统文字转语音与媒体音量";
const LANGUAGE_HINT = "无法发音：请在系统设置中安装英文文字转语音";

/** @returns {boolean} */
export function isWordSpeechAvailable() {
  if (cachedAvailable != null) return cachedAvailable;
  if (Capacitor.isNativePlatform()) {
    // 原生默认先视为可用，等 probeWordSpeechAvailability 校正
    return true;
  }
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** 失败/不可用时给 UI 展示的提示 */
export function getWordSpeechUnavailableHint() {
  return cachedUnavailableReason || UNAVAILABLE_HINT;
}

/**
 * 探测 TTS 是否可用（Android 查原生；Web 查 speechSynthesis）。
 * @returns {Promise<boolean>}
 */
export async function probeWordSpeechAvailability() {
  if (Capacitor.isNativePlatform()) {
    try {
      const ret = await WordSpeechNative.getAvailability();
      const reason = String(ret?.reason ?? "");
      if (reason === "initializing") {
        cachedAvailable = true;
        cachedUnavailableReason = "";
        return true;
      }
      const ok = ret?.available === true;
      cachedAvailable = ok;
      cachedUnavailableReason = ok ? "" : reason === "language" ? LANGUAGE_HINT : UNAVAILABLE_HINT;
      return ok;
    } catch {
      // 旧包无 getAvailability 时仍尝试朗读
      cachedAvailable = true;
      cachedUnavailableReason = "";
      return true;
    }
  }

  if (typeof window === "undefined" || !window.speechSynthesis) {
    cachedAvailable = false;
    cachedUnavailableReason = "当前环境不支持系统发音";
    return false;
  }

  await ensureWebVoicesLoaded();
  cachedAvailable = true;
  cachedUnavailableReason = "";
  return true;
}

/**
 * @param {string} word
 * @returns {Promise<SpeakWordResult>}
 */
export async function speakWord(word) {
  const text = resolveWordSpeechText(word);
  if (!text) return { ok: false, message: "无单词可朗读" };

  if (Capacitor.isNativePlatform()) {
    try {
      await WordSpeechNative.speak({ text });
      cachedAvailable = true;
      cachedUnavailableReason = "";
      return { ok: true };
    } catch (err) {
      const nativeMsg = String(err?.message ?? err ?? "");
      if (/stopped|interrupted/i.test(nativeMsg)) {
        return { ok: false, cancelled: true };
      }
      const webOk = await speakWordWeb(text);
      if (webOk) return { ok: true };
      cachedAvailable = false;
      cachedUnavailableReason = /language/i.test(nativeMsg) ? LANGUAGE_HINT : UNAVAILABLE_HINT;
      return { ok: false, message: cachedUnavailableReason || SPEAK_FAIL_HINT };
    }
  }

  const webOk = await speakWordWeb(text);
  if (webOk) return { ok: true };
  cachedAvailable = false;
  cachedUnavailableReason = SPEAK_FAIL_HINT;
  return { ok: false, message: SPEAK_FAIL_HINT };
}

export function stopWordSpeech() {
  if (Capacitor.isNativePlatform()) {
    WordSpeechNative.stop?.().catch(() => {});
    return;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** @returns {Promise<void>} */
function ensureWebVoicesLoaded() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      resolve();
    };
    const onChanged = () => finish();
    window.speechSynthesis.addEventListener("voiceschanged", onChanged);
    window.speechSynthesis.getVoices();
    setTimeout(finish, 600);
  });
}

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
function speakWordWeb(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }

  return ensureWebVoicesLoaded().then(
    () =>
      new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";

        const voices = window.speechSynthesis.getVoices();
        const enVoice =
          voices.find((v) => /^en(-|_)/i.test(v.lang) && /US/i.test(v.lang)) ||
          voices.find((v) => /^en(-|_)/i.test(v.lang)) ||
          null;
        if (enVoice) {
          utterance.voice = enVoice;
          utterance.lang = enVoice.lang || "en-US";
        }

        let settled = false;
        /** @type {ReturnType<typeof setTimeout>} */
        let startWatch;

        const finish = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(startWatch);
          resolve(ok);
        };

        utterance.onstart = () => finish(true);
        utterance.onerror = () => finish(false);
        // 部分引擎不派发 onstart：念完也算成功（仅在尚未判定时）
        utterance.onend = () => {
          if (!settled) finish(true);
        };

        startWatch = setTimeout(() => {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            finish(true);
          } else {
            finish(false);
          }
        }, 1200);

        // cancel 后立刻 speak，部分 Chromium 会吞掉
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
          } catch {
            finish(false);
          }
        }, 40);
      }),
  );
}
