import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * @typedef {{
 *   speak: (options: { text: string }) => Promise<void>;
 *   stop: () => Promise<void>;
 * }} WordSpeechPlugin
 */

const WordSpeechNative = registerPlugin("WordSpeech");

/** @returns {boolean} */
export function isWordSpeechAvailable() {
  if (Capacitor.isNativePlatform()) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * @param {string} word
 * @returns {Promise<boolean>}
 */
export async function speakWord(word) {
  const text = String(word ?? "").trim();
  if (!text) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      await WordSpeechNative.speak({ text });
      return true;
    } catch {
      return speakWordWeb(text);
    }
  }
  return speakWordWeb(text);
}

/** @param {string} text */
function speakWordWeb(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
  return true;
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
