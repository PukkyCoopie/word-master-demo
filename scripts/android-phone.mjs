#!/usr/bin/env node
/**
 * 编译 / USB 安装 APK 到已连接的 Android 真机（debug 或 release）。
 *
 * 用法：
 *   npm run android:phone              # 交互式选择操作
 *   npm run android:phone -- build     # 仅编译
 *   npm run android:phone -- install   # 仅安装（需已有 APK）
 *   npm run android:phone -- deploy    # 编译 + 安装
 *   npm run android:phone -- install --launch   # 安装后启动 App
 *   npm run android:phone -- deploy --release   # 非交互：编译 release 并安装
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = path.join(REPO_ROOT, "package.json");
const ANDROID_DIR = path.join(REPO_ROOT, "android");
const APP_ID = "com.timeshift_games.word_master";

const MODES = new Set(["build", "install", "deploy"]);

function printUsage() {
  console.log(`\
用法：npm run android:phone -- [模式] [选项]

无参数时在终端交互选择操作。

模式：
  build     编译 APK（默认 debug；选 release 或加 --release）
  install   通过 adb 安装已有 APK 到 USB 连接的真机
  deploy    编译 + 安装

选项：
  --launch   安装完成后启动 App
  --release  编译 / 安装 release 包（非交互时跳过询问）
  --help     显示此帮助

示例：
  npm run android:phone
  npm run android:phone -- build
  npm run android:phone -- install --launch
  npm run android:phone -- deploy --release
`);
}

const MODE_ALIASES = {
  "1": "build",
  "2": "install",
  "3": "deploy",
  build: "build",
  install: "install",
  deploy: "deploy",
};

/** @param {string[]} argv @returns {{ mode: string | null, launch: boolean | null, release: boolean | null, interactive: boolean }} */
function parseArgs(argv) {
  let mode = null;
  let launch = null;
  let release = null;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--launch") {
      launch = true;
      continue;
    }
    if (arg === "--release") {
      release = true;
      continue;
    }
    if (MODES.has(arg)) {
      mode = arg;
      continue;
    }
    console.error(`未知参数：${arg}\n`);
    printUsage();
    process.exit(1);
  }

  if (argv.length === 0) {
    return { mode: null, launch: null, release: null, interactive: true };
  }

  return {
    mode: mode ?? "deploy",
    launch: launch ?? false,
    release: release ?? false,
    interactive: false,
  };
}

async function promptMode() {
  console.log("\nAndroid 真机");
  console.log("  1) build   — 仅编译 APK");
  console.log("  2) install — 仅安装到手机（需已有 APK）");
  console.log("  3) deploy  — 编译 + 安装\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const answer = await rl.question("请选择 [1/2/3 或 build/install/deploy]：");
      const picked = MODE_ALIASES[answer.trim().toLowerCase()];
      if (picked) return picked;
      console.log("无效输入，请输入 1、2、3 或 build / install / deploy。");
    }
  } finally {
    rl.close();
  }
}

async function promptRelease() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question("是否发布 release 版本？[y/N] ");
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

/** @param {string} mode @returns {Promise<boolean>} */
async function promptLaunch(mode) {
  if (mode === "build") return false;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question("安装完成后是否启动 App？[y/N] ");
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

/** @param {{ mode: string | null, launch: boolean | null, release: boolean | null, interactive: boolean }} parsed */
async function resolveRunOptions(parsed) {
  if (!parsed.interactive) {
    return {
      mode: /** @type {string} */ (parsed.mode),
      launch: parsed.launch ?? false,
      release: parsed.release ?? false,
    };
  }

  if (!process.stdin.isTTY) {
    console.log("非交互终端，默认 deploy（debug）。");
    return { mode: "deploy", launch: false, release: false };
  }

  const mode = await promptMode();
  const release = parsed.release ?? (await promptRelease());
  const launch = parsed.launch ?? (await promptLaunch(mode));
  return { mode, launch, release };
}

function readAppVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"));
  const version = String(pkg.version ?? "0.0.0");
  return { version, slug: version.replace(/\./g, "_") };
}

function resolveAdb() {
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

/** @param {string} adb @param {string[]} args @param {string} label */
function runAdb(adb, args, label) {
  const result = spawnSync(adb, args, { stdio: "inherit", encoding: "utf8" });
  if (result.error) {
    console.error(`\n${label} 失败：找不到 adb。请安装 Android SDK platform-tools，或设置 ANDROID_HOME。`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** @param {string} command @param {string[]} args @param {string} cwd */
function runNpmScript(command, args, cwd) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCmd, [command, ...args], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function isReleaseKeystoreConfigured() {
  const propsPath = path.join(ANDROID_DIR, "keystore.properties");
  if (!fs.existsSync(propsPath)) return false;

  const storeFileLine = fs
    .readFileSync(propsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("storeFile="));
  if (!storeFileLine) return false;

  let storeFile = storeFileLine.slice("storeFile=".length).trim();
  if (!storeFile) return false;
  if (!path.isAbsolute(storeFile)) {
    storeFile = path.join(ANDROID_DIR, storeFile);
  }
  return fs.existsSync(storeFile);
}

function ensureReleaseKeystore() {
  if (isReleaseKeystoreConfigured()) return;
  console.error("未配置 release 签名：请创建 android/keystore.properties 并指向有效的 .jks。");
  process.exit(1);
}

/** @param {boolean} release */
function resolveApkPath(release) {
  const { version, slug } = readAppVersion();
  const apkDir = path.join(ANDROID_DIR, "app", "build", "outputs", "apk", release ? "release" : "debug");
  const expectedName = release ? "app-release.apk" : `word_master_debug_${slug}.apk`;
  const expected = path.join(apkDir, expectedName);

  if (fs.existsSync(expected)) {
    return { apkPath: expected, version, release };
  }

  if (!fs.existsSync(apkDir)) {
    console.error(`未找到 APK 目录：${apkDir}`);
    console.error("请先运行：npm run android:phone -- build");
    process.exit(1);
  }

  const apks = fs
    .readdirSync(apkDir)
    .filter((name) => name.endsWith(".apk"))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(apkDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (apks.length === 0) {
    const label = release ? "release" : `debug（期望 word_master_debug_${slug}.apk）`;
    console.error(`未找到 ${label} APK。`);
    console.error("请先运行：npm run android:phone -- build");
    process.exit(1);
  }

  const fallback = path.join(apkDir, apks[0].name);
  console.warn(`未找到 v${version} 对应 APK，改用最新：${apks[0].name}`);
  return { apkPath: fallback, version, release };
}

function ensureDeviceConnected(adb) {
  const result = spawnSync(adb, ["devices"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    console.error("无法执行 adb devices。请确认 Android SDK platform-tools 已安装并在 PATH 中。");
    process.exit(1);
  }

  const lines = (result.stdout ?? "")
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);

  const devices = lines.filter((line) => line.endsWith("\tdevice"));
  if (devices.length === 0) {
    console.error("未检测到 USB 连接的真机。请开启 USB 调试并用数据线连接电脑。");
    process.exit(1);
  }
  if (devices.length > 1) {
    console.warn(`检测到 ${devices.length} 台设备，将安装到第一台：${devices[0].split("\t")[0]}`);
  }
}

function runGradleAssemble(variant) {
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const result = spawnSync(gradlew, [`assemble${variant}`], {
    cwd: ANDROID_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** @param {boolean} release */
function buildApk(release) {
  if (release) {
    ensureReleaseKeystore();
    console.log("\n▶ 编译 release APK…\n");
    runNpmScript("run", ["android:icons"], REPO_ROOT);
    runNpmScript("run", ["cap:sync"], REPO_ROOT);
    runGradleAssemble("Release");
  } else {
    console.log("\n▶ 编译 debug APK（cap:apk）…\n");
    runNpmScript("run", ["cap:apk"], REPO_ROOT);
  }

  const { apkPath, version } = resolveApkPath(release);
  console.log(`\n✓ 编译完成：v${version}（${release ? "release" : "debug"}）`);
  console.log(`  ${apkPath}\n`);
}

/** @param {boolean} launch @param {boolean} release */
function installApk(launch, release) {
  const adb = resolveAdb();
  ensureDeviceConnected(adb);
  const { apkPath, version } = resolveApkPath(release);

  console.log(`\n▶ 安装 v${version}（${release ? "release" : "debug"}）到真机…\n  ${apkPath}\n`);
  runAdb(adb, ["install", "-r", apkPath], "安装");

  console.log("\n✓ 安装成功");

  if (launch) {
    console.log("\n▶ 启动 App…");
    runAdb(adb, ["shell", "am", "start", "-n", `${APP_ID}/.MainActivity`], "启动");
    console.log("✓ 已启动\n");
  } else {
    console.log("");
  }
}

async function main() {
  const { mode, launch, release } = await resolveRunOptions(parseArgs(process.argv.slice(2)));

  if (mode === "build") {
    buildApk(release);
  } else if (mode === "install") {
    installApk(launch, release);
  } else {
    buildApk(release);
    installApk(launch, release);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
