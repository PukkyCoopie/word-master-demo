# 更新日志（changelog）

每个版本一个文件：`major_minor_patch.md`（如 `0_0_9.md` = v0.0.9）。

| 字段 | 说明 |
|------|------|
| `date` | 发布日期 |
| `show` | 是否出现在游戏「关于 → 更新日志」，默认 **false** |
| `summarized` | 详细信息是否已人工提炼；**true** 时 pre-commit **不再**追加 commit 说明，默认 **false** |
| 正文（手写区） | 玩家向更新说明（`show: true` 时显示在列表主区域） |
| 正文（自动区） | `<!-- changelog:auto -->` 之后，由 pre-commit 按 commit 追加；游戏中可展开「详细信息」查看。`summarized: true` 后改由人工维护 |

**版本号**：始终按本目录文件名中的**最大版本**计算（与 `show` 无关）。  
**游戏列表**：只展示 `show: true` 且有正文的条目。

---

## 日常 commit 时会发生什么

1. **pre-commit**（`commit-msg` 也会补跑）：把本次 **commit 说明** 追加到最新版本 md 的 **自动区**（`<!-- changelog:auto -->` 之后），并将 frontmatter 的 **`date` 更新为当天（本地日期）**；**手写区**不会被覆盖。若无手写内容则 `show: false`（仅存档）；若已有手写则保留原有 `show` 设置。
2. **post-commit**：按最大版本 +1（或 minor/major）新建下一版空 md，并同步 `appVersion.json` / `package.json`（amend 时带 `SKIP_VERSION_BUMP`，避免连环升版）。**commit 说明含 `no-bump` 或 `[no-bump]` 时不升版**（仍写入 changelog 自动区，标记会被去掉）。

要让玩家在游戏里看到某版说明：在该版本 md 里写好正文，并设 `show: true`。

---

## 小版本（patch）

正常 `git commit` 即可（勿随意 `--no-verify`）。

---

## 中版本 / 大版本

在发版 commit **之前**：

| 命令 | 例：最大 `0_0_8` |
|------|------------------|
| `npm run version:minor` | 下次 commit 后 → `0_1_0.md`，**0.1.0** |
| `npm run version:major` | 下次 commit 后 → `1_0_0.md`，**1.0.0** |

立刻生效：`npm run version:minor -- --now`（major 同理）。

### 误运行后回退

| 情况 | 怎么回退 |
|------|----------|
| 只跑了 `npm run version:minor` / `version:major`（**没有** `--now`） | 删除仓库根目录的 `.version-bump-pending` 即可。`package.json`、`appVersion.json`、已有 changelog **不会变**；只是取消了「下次 commit 再升一级」的标记。 |
| 误跑了 `npm run version:minor -- --now`（或 major 同理） | 1. 恢复版本号文件：`git restore package.json src/appVersion.json`（若尚未 commit 过目标版本）<br>2. 删除**本次误操作**新建的 changelog（如误从 0.4.0 升到 0.5.0 时删 `changelog/0_5_0.md`）<br>3. 若存在 `.version-bump-pending` 也一并删除<br>4. 若之前已用 `--now` 正确建好目标版（如 `0_4_0.md`），**保留**该文件与对应版本号，只撤销多出来的那一档 |

回退后确认：changelog 目录里**最大**的 `major_minor_patch.md` 与 `package.json` / `src/appVersion.json` 一致（如 `0_4_0.md` → **0.4.0**）。

---

## 其他

| 命令 | 用途 |
|------|------|
| `npm run changelog:new` | 手动建下一版 md + 同步版本号 |

跳过升版 / 不写下一版空文件：

```bash
# Cursor / GUI 提交：在说明里写 no-bump（仍记 changelog）
git commit -m "fix: 某改动

no-bump"

# 终端：跳过升版且不写 changelog
SKIP_VERSION_BUMP=1 git commit -m "说明"

# 或 git commit --no-verify（跳过全部 hook，不推荐日常用）
```

---

## 忽略的文件

`_template.md`、`README.md`、以 `_` 开头的 `.md`（不会进游戏）。
