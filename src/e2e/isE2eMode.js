/** 开发/自动化：URL `?e2e=1` 或构建时 `VITE_E2E=true` */
export function isE2eMode() {
  if (import.meta.env?.VITE_E2E === "true") return true;
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").has("e2e");
  } catch {
    return false;
  }
}
