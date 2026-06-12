# 开发脚本速查

## CloudBase 静态托管（本地部署）

推送 `main` 到 `origin` 时，`.husky/pre-push` 会在**后台**自动构建并上传到 CloudBase（不阻塞 `git push`）。

**首次配置**：复制 `.env.example` 为 `.env`，填入与 GitHub Secrets 相同的 `TCB_SECRET_ID`、`TCB_SECRET_KEY`、`TCB_ENV_ID`。

| 命令 | 作用 |
|------|------|
| `npm run deploy:cloudbase` | 前台手动部署（可看完整输出） |
| `SKIP_CLOUD_BASE_DEPLOY=1 git push` | 本次 push 跳过自动部署 |

部署日志：`tmp/deploy-cloudbase.log`（目录已在 `.gitignore`）。

GitHub Actions 的自动部署已关闭；仓库内 workflow 仅保留 `workflow_dispatch` 应急手动触发。

## Android 真机：编译 / 安装 APK

```bash
npm run android:phone
```

无参数时在终端**交互选择**：仅编译、仅安装、或编译+安装；安装类操作还会询问是否启动 App。

| 命令 | 作用 |
|------|------|
| `npm run android:phone` | 交互式选择 |
| `npm run android:phone -- build` | 仅编译 debug APK |
| `npm run android:phone -- install` | 仅安装（需已有 APK） |
| `npm run android:phone -- deploy` | 编译 + 安装 |
| `npm run android:phone -- install --launch` | 安装后启动 App |
| `npm run android:phone -- --help` | 帮助 |

**前提**：手机 USB 调试已开并已连接；本机有 adb（Android SDK platform-tools）。

实现：`scripts/android-phone.mjs`（内部编译走 `npm run cap:apk`）。

APK 输出：`android/app/build/outputs/apk/debug/word_master_debug_<版本>.apk`
