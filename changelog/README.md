# 更新日志（changelog）

每个版本一个文件：`major_minor_patch.md`（如 `0_0_9.md` = v0.0.9）。

| 字段 | 说明 |
|------|------|
| `date` | 发布日期 |
| `show` | 是否出现在游戏「关于 → 更新日志」，默认 **false** |
| 正文 | 更新说明（可多行、列表） |

**版本号**：始终按本目录文件名中的**最大版本**计算（与 `show` 无关）。  
**游戏列表**：只展示 `show: true` 且有正文的条目。

---

## 日常 commit 时会发生什么

1. **pre-commit**（`commit-msg` 也会补跑）：若**最新版本**的 md 仍是模板/空白 → 把本次 **commit 说明** 写入该文件，并设 `show: false`（仅存档，不进游戏列表）；若你已手写正文 → **不改动**。
2. **post-commit**：按最大版本 +1（或 minor/major）新建下一版空 md，并同步 `appVersion.json` / `package.json`（amend 时带 `SKIP_VERSION_BUMP`，避免连环升版）。

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

---

## 其他

| 命令 | 用途 |
|------|------|
| `npm run changelog:new` | 手动建下一版 md + 同步版本号 |

跳过升版 / 不写下一版空文件：

```bash
SKIP_VERSION_BUMP=1 git commit -m "说明"
# 或 git commit --no-verify
```

---

## 忽略的文件

`_template.md`、`README.md`、以 `_` 开头的 `.md`（不会进游戏）。
