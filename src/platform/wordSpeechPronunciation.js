/**
 * 系统 TTS 例外发音表。
 *
 * 键：展示用英文单词（小写匹配）；值：交给 TTS 的拼写（可用空格/连字符引导音节）。
 * 仅影响朗读，不影响释义与词面展示。
 *
 * 新增时优先用「听感接近」的英文拼写试听 Web + Android；个别引擎仍可能不准。
 *
 * @type {Readonly<Record<string, string>>}
 */
export const WORD_SPEECH_PRONUNCIATION_OVERRIDES = Object.freeze({
  // /ˈsɪs.tə.maɪz/ — 部分引擎会念成接近 systematize 或拆错重音
  systemize: "sis tuh mize",
  systemizes: "sis tuh mize iz",
  systemized: "sis tuh mized",
  systemizing: "sis tuh mize ing",
});

/**
 * @param {string} word
 * @returns {string} 实际交给 TTS 的文本（无覆盖则原样 trim）
 */
export function resolveWordSpeechText(word) {
  const text = String(word ?? "").trim();
  if (!text) return "";
  const override = WORD_SPEECH_PRONUNCIATION_OVERRIDES[text.toLowerCase()];
  return override || text;
}
