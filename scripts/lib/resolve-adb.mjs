import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * 解析本机 adb 可执行文件路径（与 android-phone.mjs 一致）。
 * Windows 默认：%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
 * @returns {string}
 */
export function resolveAdb() {
  const adbName = process.platform === "win32" ? "adb.exe" : "adb";
  /** @type {(string | undefined)[]} */
  const candidates = [
    process.env.ADB,
    process.env.ANDROID_HOME
      ? path.join(process.env.ANDROID_HOME, "platform-tools", adbName)
      : undefined,
    process.env.ANDROID_SDK_ROOT
      ? path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", adbName)
      : undefined,
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", adbName),
    adbName,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === adbName) return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }
  return adbName;
}

/** @returns {string} 文档/规则引用的 Windows 默认 adb 路径 */
export const DEFAULT_WINDOWS_ADB =
  "C:\\Users\\2020\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe";
