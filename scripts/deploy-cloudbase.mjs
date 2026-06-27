#!/usr/bin/env node
/**
 * 本地构建并发布到腾讯云 CloudBase 静态托管。
 *
 * 凭据：项目根 `.env` 中的 TCB_SECRET_ID、TCB_SECRET_KEY、TCB_ENV_ID，
 * 或同名环境变量（值与 GitHub Secrets 相同，可从仓库 Settings 复制）。
 *
 * 跳过：SKIP_CLOUD_BASE_DEPLOY=1
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { loadDotEnv, REPO_ROOT } from "./lib/load-dotenv.mjs";

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ env?: NodeJS.ProcessEnv }} [options]
 */
function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: options.env ?? process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireCloudBaseEnv() {
  loadDotEnv();
  const { TCB_SECRET_ID, TCB_SECRET_KEY, TCB_ENV_ID } = process.env;
  if (!TCB_SECRET_ID || !TCB_SECRET_KEY || !TCB_ENV_ID) {
    console.error(
      "缺少 CloudBase 凭据：请在项目根目录创建 .env，配置 TCB_SECRET_ID、TCB_SECRET_KEY、TCB_ENV_ID。",
    );
    console.error("可参考 .env.example；也可设置同名环境变量。");
    process.exit(1);
  }
  return { TCB_SECRET_ID, TCB_SECRET_KEY, TCB_ENV_ID };
}

function tcbArgs(subcommandArgs) {
  const localBin = path.join(
    REPO_ROOT,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tcb.cmd" : "tcb",
  );
  if (existsSync(localBin)) {
    return { cmd: localBin, args: subcommandArgs };
  }
  // @cloudbase/cli 含 tcb / cloudbase 等多个 bin，须显式指定 tcb
  return { cmd: "npx", args: ["-p", "@cloudbase/cli", "tcb", ...subcommandArgs] };
}

function main() {
  if (process.env.SKIP_CLOUD_BASE_DEPLOY === "1") {
    console.log("SKIP_CLOUD_BASE_DEPLOY=1，跳过 CloudBase 部署。");
    return;
  }

  const { TCB_SECRET_ID, TCB_SECRET_KEY, TCB_ENV_ID } = requireCloudBaseEnv();

  console.log("→ 构建静态资源…");
  run("npm", ["run", "build"], {
    env: { ...process.env, WM_DICT_SHIP: "web" },
  });

  const login = tcbArgs([
    "login",
    "--apiKeyId",
    TCB_SECRET_ID,
    "--apiKey",
    TCB_SECRET_KEY,
  ]);
  console.log("→ 登录 CloudBase…");
  run(login.cmd, login.args);

  const deploy = tcbArgs([
    "hosting",
    "deploy",
    "./dist",
    "/",
    "-e",
    TCB_ENV_ID,
    "--yes",
  ]);
  console.log("→ 上传到 CloudBase 静态托管…");
  run(deploy.cmd, deploy.args);

  console.log("✔ CloudBase 部署完成。");
}

main();
