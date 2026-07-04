/** @typedef {'mark' | 'swap' | 'markOnSwap' | 'highRisk' | 'dictionaryScope'} SettingsHelpId */

/** @type {Record<SettingsHelpId, { title: string; paragraphs: string[]; demoVariant: SettingsHelpId | '' }>} */
export const SETTINGS_HELP_COPY = Object.freeze({
  mark: {
    title: "",
    paragraphs: [
      "通过该按钮为字母块添加角标",
      "被标记的字母可以通过点击标记键快速选中",
    ],
    demoVariant: "mark",
  },
  swap: {
    title: "",
    paragraphs: ["收回选中的字母，然后选中一些其他字母，方便后续进行丢弃操作"],
    demoVariant: "swap",
  },
  markOnSwap: {
    title: "",
    paragraphs: ["将选中的字母送回棋盘时，自动为它们打上标记"],
    demoVariant: "markOnSwap",
  },
  highRisk: {
    title: "",
    paragraphs: ["危险操作与跳过需长按以确认，防止误触"],
    demoVariant: "",
  },
  dictionaryScope: {
    title: "词汇范围",
    paragraphs: ["词汇范围来源于网络词库，不保证准确性。"],
    demoVariant: "",
  },
});

/** @param {SettingsHelpId} id */
export function getSettingsHelpContent(id) {
  return SETTINGS_HELP_COPY[id];
}
