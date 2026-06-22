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
 *   npm run android:phone -- build --version 1.1.4   # 按旧版号打包（仅版本号与更新日志）
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  APP_VERSION_PATH,
  PACKAGE_JSON_PATH,
  formatVersionString,
  writeAppVersionFile,
} from "./lib/app-version-files.mjs";
import {
  CHANGELOG_DIR_NAME,
  compareSemver,
  listVersionSemversInChangelogDir,
  parseSemverFromVersionString,
} from "./lib/changelog-dir.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = PACKAGE_JSON_PATH;
const CHANGELOG_DIR = path.join(REPO_ROOT, CHANGELOG_DIR_NAME);
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
  --version  指定打包版本号（须 ≤ 当前项目版本，且 changelog 中存在）
             仅影响 APK 版本号与关于页更新日志，代码仍为当前工程
  -V         --version 的简写
  --help     显示此帮助

示例：
  npm run android:phone
  npm run android:phone -- build
  npm run android:phone -- build --version 1.1.4
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

/** @param {string[]} argv @returns {{ mode: string | null, launch: boolean | null, release: boolean | null, packVersion: string | null, interactive: boolean }} */
function parseArgs(argv) {
  let mode = null;
  let launch = null;
  let release = null;
  let packVersion = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
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
    if (arg === "--version" || arg === "-V") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        console.error("--version 需要版本号，例如：--version 1.1.4\n");
        printUsage();
        process.exit(1);
      }
      packVersion = next.trim();
      i += 1;
      continue;
    }
    if (arg.startsWith("--version=")) {
      packVersion = arg.slice("--version=".length).trim();
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
    return { mode: null, launch: null, release: null, packVersion: null, interactive: true };
  }

  return {
    mode: mode ?? "deploy",
    launch: launch ?? false,
    release: release ?? false,
    packVersion,
    interactive: false,
  };
}

/** @param {import("node:readline/promises").Interface} rl */
async function promptMode(rl) {
  console.log("\nAndroid 真机");
  console.log("  1) build   — 仅编译 APK");
  console.log("  2) install — 仅安装到手机（需已有 APK）");
  console.log("  3) deploy  — 编译 + 安装\n");

  while (true) {
    const answer = await rl.question("请选择 [1/2/3 或 build/install/deploy]：");
    const picked = MODE_ALIASES[answer.trim().toLowerCase()];
    if (picked) return picked;
    console.log("无效输入，请输入 1、2、3 或 build / install / deploy。");
  }
}

/**
 * @param {import("node:readline/promises").Interface} rl
 * @param {string} question
 * @param {boolean} defaultYes
 */
async function promptYesNo(rl, question, defaultYes = false) {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await rl.question(`${question}${hint} `);
  const trimmed = answer.trim();
  if (!trimmed) return defaultYes;
  return /^y(es)?$/i.test(trimmed);
}

/** @param {import("node:readline/promises").Interface} rl @param {string} mode */
async function promptLaunch(rl, mode) {
  if (mode === "build") return false;
  return promptYesNo(rl, "安装完成后是否启动 App？", false);
}

/**
 * @param {import("node:readline/promises").Interface} rl
 * @param {string} mode
 * @param {string} currentVersion
 * @param {{ major: number, minor: number, patch: number }} currentSemver
 * @param {{ major: number, minor: number, patch: number }[]} packable
 */
async function promptPackVersion(rl, mode, currentVersion, currentSemver, packable) {
  const action = mode === "install" ? "安装" : "打包";
  while (true) {
    const answer = await rl.question(
      `${action}版本号（回车=最新 v${currentVersion}，也可输入旧版）：`,
    );
    const trimmed = answer.trim();
    if (!trimmed) return currentVersion;
    const result = validatePackVersion(trimmed, currentSemver, packable);
    if (result.ok) return /** @type {string} */ (result.version);
    console.log(result.error);
  }
}

/**
 * @param {string | null | undefined} packVersionArg
 * @param {{ major: number, minor: number, patch: number }} currentSemver
 * @param {{ major: number, minor: number, patch: number }[]} packable
 * @returns {string | null}
 */
function resolvePackVersionArg(packVersionArg, currentSemver, packable) {
  if (packVersionArg == null) return null;
  const result = validatePackVersion(packVersionArg, currentSemver, packable);
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  return /** @type {string} */ (result.version);
}

/** @param {{ mode: string | null, launch: boolean | null, release: boolean | null, packVersion: string | null, interactive: boolean }} parsed */
async function resolveRunOptions(parsed) {
  const { version: currentVersion, semver: currentSemver } = readCurrentProjectVersion();
  const packable = listPackableVersions(currentSemver);

  if (!parsed.interactive) {
    return {
      mode: /** @type {string} */ (parsed.mode),
      launch: parsed.launch ?? false,
      release: parsed.release ?? false,
      packVersion:
        resolvePackVersionArg(parsed.packVersion, currentSemver, packable) ?? currentVersion,
    };
  }

  if (!process.stdin.isTTY) {
    console.log("非交互终端，默认 deploy（debug）。");
    return {
      mode: "deploy",
      launch: false,
      release: false,
      packVersion:
        resolvePackVersionArg(parsed.packVersion, currentSemver, packable) ?? currentVersion,
    };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const mode = await promptMode(rl);
    const release = parsed.release ?? (await promptYesNo(rl, "是否发布 release 版本？", false));
    const launch = parsed.launch ?? (await promptLaunch(rl, mode));
    const packVersion =
      resolvePackVersionArg(parsed.packVersion, currentSemver, packable) ??
      (await promptPackVersion(rl, mode, currentVersion, currentSemver, packable));
    return { mode, launch, release, packVersion };
  } finally {
    rl.close();
  }
}

function readCurrentProjectVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"));
  const version = String(pkg.version ?? "0.0.0");
  return { version, semver: parseSemverFromVersionString(version) };
}

/** @param {{ major: number, minor: number, patch: number }} currentSemver */
function listPackableVersions(currentSemver) {
  const fromChangelog = listVersionSemversInChangelogDir(CHANGELOG_DIR);
  const hasCurrent = fromChangelog.some((v) => compareSemver(v, currentSemver) === 0);
  if (!hasCurrent) {
    fromChangelog.push({ ...currentSemver });
  }
  return fromChangelog
    .filter((v) => compareSemver(v, currentSemver) <= 0)
    .sort((a, b) => compareSemver(b, a));
}

/**
 * @param {string} input
 * @param {{ major: number, minor: number, patch: number }} currentSemver
 * @param {{ major: number, minor: number, patch: number }[]} packable
 */
function validatePackVersion(input, currentSemver, packable) {
  const normalized = input.trim().replace(/^v/i, "");
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    return { ok: false, error: "版本号格式须为 major.minor.patch，例如 1.1.4" };
  }

  const semver = parseSemverFromVersionString(normalized);
  if (compareSemver(semver, currentSemver) > 0) {
    return {
      ok: false,
      error: `不能选择比当前 v${formatVersionString(currentSemver)} 更新的版本`,
    };
  }

  const exists = packable.some((v) => compareSemver(v, semver) === 0);
  if (!exists) {
    return { ok: false, error: `changelog 中不存在 v${normalized}` };
  }

  return { ok: true, version: formatVersionString(semver) };
}

/**
 * @param {string} targetVersion
 * @returns {() => void}
 */
function applyPackVersionOverride(targetVersion) {
  const pkgBackup = fs.readFileSync(PACKAGE_JSON, "utf8");
  const appVerBackup = fs.readFileSync(APP_VERSION_PATH, "utf8");
  const semver = parseSemverFromVersionString(targetVersion);

  const pkg = JSON.parse(pkgBackup);
  pkg.version = targetVersion;
  fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  writeAppVersionFile(semver);

  return () => {
    fs.writeFileSync(PACKAGE_JSON, pkgBackup, "utf8");
    fs.writeFileSync(APP_VERSION_PATH, appVerBackup, "utf8");
  };
}

/** @param {string | null} packVersion */
function buildEnvWithPackVersion(packVersion) {
  if (!packVersion) return process.env;
  return { ...process.env, WM_PACK_VERSION: packVersion };
}

function readAppVersion() {
  const { version } = readCurrentProjectVersion();
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

/** @param {string} command @param {string[]} args @param {string} cwd @param {{ env?: NodeJS.ProcessEnv }} [options] */
function runNpmScript(command, args, cwd, options = {}) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCmd, [command, ...args], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: options.env ?? process.env,
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

/** @param {boolean} release @param {string | null} packVersion */
function resolveApkPath(release, packVersion = null) {
  const version = packVersion ?? readAppVersion().version;
  const slug = version.replace(/\./g, "_");
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

/** @param {boolean} release @param {string} packVersion @param {string} currentVersion */
function buildApk(release, packVersion, currentVersion) {
  const needsVersionOverride = packVersion !== currentVersion;
  /** @type {(() => void) | null} */
  let restoreVersionFiles = null;

  if (needsVersionOverride) {
    restoreVersionFiles = applyPackVersionOverride(packVersion);
    console.log(
      `\n▶ 打包版本 v${packVersion}（项目当前 v${currentVersion}；仅版本号与更新日志按目标版本）\n`,
    );
  }

  const buildEnv = buildEnvWithPackVersion(needsVersionOverride ? packVersion : null);

  try {
    if (release) {
      ensureReleaseKeystore();
      console.log("\n▶ 编译 release APK…\n");
      runNpmScript("run", ["android:icons"], REPO_ROOT, { env: buildEnv });
      runNpmScript("run", ["cap:sync"], REPO_ROOT, { env: buildEnv });
      runGradleAssemble("Release");
    } else {
      console.log("\n▶ 编译 debug APK（cap:apk）…\n");
      runNpmScript("run", ["cap:apk"], REPO_ROOT, { env: buildEnv });
    }
  } finally {
    restoreVersionFiles?.();
  }

  const { apkPath, version } = resolveApkPath(release, packVersion);
  console.log(`\n✓ 编译完成：v${version}（${release ? "release" : "debug"}）`);
  console.log(`  ${apkPath}\n`);
}

/** @param {boolean} launch @param {boolean} release @param {string | null} packVersion */
function installApk(launch, release, packVersion = null) {
  const adb = resolveAdb();
  ensureDeviceConnected(adb);
  const { apkPath, version } = resolveApkPath(release, packVersion);

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
  const { mode, launch, release, packVersion } = await resolveRunOptions(
    parseArgs(process.argv.slice(2)),
  );
  const { version: currentVersion } = readCurrentProjectVersion();

  if (mode === "build") {
    buildApk(release, packVersion, currentVersion);
  } else if (mode === "install") {
    installApk(launch, release, packVersion);
  } else {
    buildApk(release, packVersion, currentVersion);
    installApk(launch, release, packVersion);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
