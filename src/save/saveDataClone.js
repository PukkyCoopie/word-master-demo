/** @template T @param {T} value @returns {T} */
export function cloneSaveData(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}
