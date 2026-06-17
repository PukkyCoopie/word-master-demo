# 震动反馈规范（Haptics）

本文档描述本项目的触感分层、预设用法与挂接约定。实现入口：`src/platform/haptics.js`；Android 原生：`android/app/src/main/java/.../UiHapticsPlugin.java`。

---

## 1. 适用范围

| 环境 | 行为 |
|------|------|
| **Capacitor 原生 App**（`Capacitor.isNativePlatform()`） | 完整触感；设置里显示「震动反馈」开关 |
| **浏览器 / Vite 预览** | 无触感、无设置项、`triggerHaptic` 等直接返回 |
| **E2E 测试**（`isE2eMode()`） | 静默，不震 |
| **用户关闭震动**（`gameSettings.hapticsEnabled`） | 静默 |

启动时仅在原生端调用 `initUIButtonHaptics()`（见 `src/main.js`）。

---

## 2. 设计原则

触感分三类角色，**不要混用同一档去表达不同语义**：

| 角色 | 体感目标 | 典型预设 |
|------|----------|----------|
| **点按确认** | 指尖落下 → 一声清脆「咔」 | `tap` |
| **状态切换** | 先「要变了」→ 再「定住了」（两段式） | `tabSwitch` |
| **空间 / 结果** | 跟动画峰值或结算语义对齐 | `overlayPresent`、`confirm`、`land` 等 |

整体要求：**短促、有物理感**，避免长振嗡嗡；多格连续事件用节流（见 §4）。

---

## 3. 预设一览

JS 侧统一用 `triggerHaptic(preset)` 或下方调度函数；**不要**在业务里直接调 Capacitor `Haptics.impact`。

| 预设 | 语义 | 典型场景 | Android 原生（概要） |
|------|------|----------|----------------------|
| `tap` | 普通按钮点按 | 全局 `button` / `role=button`（自动） | `KEYBOARD_TAP` / 清脆点击 |
| `tabSwitch` | Tab / 分段切换 | 设置 Tab、分段控件、对调范围循环 | 软引导 → 110ms → 清脆落位 |
| `overlayPresent` | 大浮层展开峰值 | 设置、商店、暂停、虹膜转场 cover 结束 | `EFFECT_HEAVY_CLICK` / bloom |
| `overlayPresentLight` | 预览层展开峰值（轻） | 宝藏/字母详情完全展开 | 与 `previewOpen` 同档（soft settle） |
| `overlayDismiss` | 浮层收起收尾 | 浮层关闭动画末段 | 轻 `KEYBOARD_TAP` |
| `previewOpen` | 点开预览层（弱） | 点击货架/已拥有/长按打开详情 | soft settle |
| `selection` | 棋盘选字母（强） | 点格选字入词 | 清脆点击 |
| `land` | 落点 / 停稳（弱） | 字母飞入槽、棋盘块落稳、飞回棋盘 | `CLOCK_TICK` 级软引导 |
| `confirm` | 确认动作 | 提交单词、法术确认、商店购买 | bloom |
| `reject` | 无效 / 拒绝 | 无效单词 | 双清脆（间隔约 42ms） |
| `warning` | 警示 | 丢弃、失败结算、Boss 条带 | `CONTEXT_CLICK` / 双点击 |
| `scoreTotal` / `success` | 计分强调 | 总分揭晓、大倍率步、通关 | bloom |
| `milestone` | 过关三连 | 小关结算入场 | 引导 → bloom → 落点 |
| `celebrate` | 轻庆祝 | 成就 Toast | 清脆点击 |
| `wobble` | wobble 峰值 | `createWobbleScoreSlotTimeline` 放大段 | 软引导 |
| `tileRemove` | 字母块删除 | 提交/丢弃消失、缩至 0 | 清脆点击 |
| `settleDollar` | 结算 `$` 逐个 | 关卡结算金币行动画 | 软引导（节流） |

拼词手感：**点格 `selection`（强）→ 入槽 `land`（弱）**；不要对调。

---

## 4. 节流（`haptics.js` 常量）

| 常量 | 约 ms | 适用预设 |
|------|-------|----------|
| `UI_TAP_THROTTLE_MS` | 32 | `tap` |
| `THROTTLE_MS` | 70 | 通用 |
| `TILE_REMOVE_THROTTLE_MS` | 70 | `tileRemove` |
| `LAND_THROTTLE_MS` | 100 | `land`（多格下落） |
| `WOBBLE_THROTTLE_MS` | 120 | `wobble` |
| `SETTLE_DOLLAR_THROTTLE_MS` | 85 | `settleDollar` |
| `PREVIEW_OPEN_THROTTLE_MS` | 48 | `previewOpen` |

需要无视节流（仍受开关/E2E）：`triggerHaptic(preset, { bypassThrottle: true })` 或 `previewHaptic()`。

---

## 5. 全局 UI 点按（`tap`）

- `initUIButtonHaptics()` 监听 `pointerdown`（触摸）与 `click`（鼠标，避免双震）。
- **自动排除**：
  - Tab / 分段选择器（改由 `tabSwitch`）
  - `.grid-tile`、词槽、棋盘区域（改由游戏预设）
  - `data-haptic-skip-ui-tap`（如提交/丢弃/互换，避免与 `confirm`/`warning` 双震）
  - `disabled` / `action-btn-disabled` 等

新增「游戏主操作按钮」若已有专用预设，请加 `data-haptic-skip-ui-tap`。

---

## 6. Tab 与浮层

### Tab 切换

- 用户**主动**点 Tab / 分段：`triggerHaptic('tabSwitch')` 或 `SettingsSegmentControl` / `CollectionIconSegmentControl` 内建。
- **弹窗刚打开、默认 Tab 展示时不要震**；`scheduleOverlayPresent` / `schedulePreviewLayerPresent` 会调用 `notifyOverlayOpened()`，约 **420ms** 内抑制 `tabSwitch`。
- 程序化改 `activeTab`（如 `InfoModal.applyInfoModalOpenState` 的 `skipTabSwitchAnim`）**不要**附带 `tabSwitch`。

### 浮层展开 / 收起

与入场动画时长对齐（已乘 `getAnimationSpeedScale()`；减少动画模式下不调度）：

```js
scheduleOverlayPresent(280);      // 大浮层 bloom
schedulePreviewLayerPresent(280); // 宝藏/字母详情（轻）
scheduleOverlayDismiss(240);      // 收起收尾
```

虹膜转场：`IrisTransition` 在 cover/reveal 结束处用 `overlayPresent` / `overlayDismiss`，并 `notifyOverlayOpened()`。

---

## 7. 游戏内已挂接点（参考）

| 行为 | 预设 | 位置提示 |
|------|------|----------|
| 点格选字 | `selection` | `GamePanel` 选字流程 |
| 飞入词槽完成 | `land` | `finishFlyIn` |
| 点槽退回 / 飞回棋盘完成 | `selection` + `land` | `startOneMoveOut` / batch 完成 |
| 提交 / 无效词 | `confirm` / `reject` | `submitWord` |
| 丢弃 | `warning` | `onRemoveClick` |
| 互换选中 | `tabSwitch` | `onSwapWordSelectionClick` |
| 棋盘下落停稳 | `land` | `runGridDropAnimation` → `tickOne({ landHaptic: true })` |
| 块删除动画 | `tileRemove` | `runSlotAndGridLeaveAnimation`、`animateOneDiscardTileLeave` 等 |
| wobble | `wobble` | `createWobbleScoreSlotTimeline` |
| 结算 `$` | `settleDollar` | `buildSettlementDollarSubTimeline` |
| 点开预览 | `previewOpen` | `openTileDetail`、`presentTreasureDetail` |
| 预览层展开完成 | `overlayPresentLight` | `TreasureDetailLayer` / `TileDetailLayer` `onMounted` |
| 过关 / 胜负 / 成就 | `milestone` / `success`/`warning` / `celebrate` | 结算、RunEnd、成就 Toast |

商店/牌库等大浮层：`GamePanel` 内 `showShop` / `showDeckLayer` 等 watch → `scheduleOverlayPresent` / `scheduleOverlayDismiss`。

---

## 8. 设置页（`SettingsLayer`）

- **震动反馈**行：`v-if="isHapticsAvailable()"`，仅原生显示。
- 开关：**仅关 → 开**时 `previewHaptic('tap')`；关闭时不震。
- 其他设置变更（仅原生）：
  - 分段（显示模式、动画速度）：控件内 `tabSwitch`
  - 滑条缩放：`land`（拖动，节流）
  - 缩放数值提交：值变化时 `tap`
  - 开关（减少动画、允许缩写、对调标记）：`tap`
  - 对调范围左右键：`tabSwitch`

---

## 9. 新增功能 / 修改时的检查清单

1. **是否需要触感？** 仅原生；浏览器不写分支 UI。
2. **选对预设**：对照 §3，勿用 `tap` 代替 `confirm` 或 `tabSwitch`。
3. **时机**：跟动画相位用 `scheduleHapticAt` / `scheduleOverlayPresent`，不要与入场同时猛震 Tab。
4. **双震**：专用按钮加 `data-haptic-skip-ui-tap`；或合并为一次专用预设。
5. **连续多格**：用带节流的 `land` / `tileRemove` / `settleDollar`，勿 `bypassThrottle`。
6. **预览层**：点击 `previewOpen` + 展开完成 `schedulePreviewLayerPresent`，不要用 `overlayPresent`。
7. **wobble**：优先挂在 `createWobbleScoreSlotTimeline`，勿散落多处。
8. **新 Android 质感**：在 `UiHapticsPlugin` 增加 `@PluginMethod`，在 `haptics.js` 的 `PRESET_NATIVE_METHOD` 注册；非 Android 走 `performPresetFallback`。

---

## 10. 反例

- 在 `GamePanel` 里直接 `Haptics.impact()`。
- 浮层 `open` 的 `watch` 里对默认 Tab 调 `tabSwitch`。
- 提交按钮同时全局 `tap` + `confirm`（应用 `data-haptic-skip-ui-tap`）。
- 预览详情用 `scheduleOverlayPresent`（过重，应用 `schedulePreviewLayerPresent`）。
- 在 Web 端展示震动开关或假设 `triggerHaptic` 有体感。
- 每个宝藏 id 在 `treasureScoring` 写震动分支（应走通用动画钩子或对应 UI 层）。

---

## 12. TapPlay 沙箱与直接安装 APK

### 12.1 是什么

[TapPlay](https://developer.taptap.cn/docs/sdk/tap-play/features/) 指在 **TapTap 客户端内的沙箱环境**里运行 APK，免安装即点即玩；与「小游戏」（`tap.vibrateShort` 等 JS API）是不同产品线。

官方说明要点：

- 沙箱内运行，接入 Themis 等加固（[功能介绍](https://developer.taptap.cn/docs/sdk/tap-play/features/)）
- 玩家**无需再走一遍权限弹窗**（[商店接入说明](https://developer.taptap.cn/docs/store/integration/tap-play/)）
- **FAQ 未提及震动/触觉**，也无 TapPlay 专用振动 API

因此：直接安装的 APK 与 TapPlay 内运行**不是同一运行环境**，触感差异是预期内风险，不是单纯「throttle 设错了」。

### 12.2 为何 TapPlay 更容易「漏震」

| 因素 | 直接安装 | TapPlay 沙箱 |
|------|----------|--------------|
| 进程 / Activity | 独立前台应用 | 宿主 TapTap 内的虚拟化进程 |
| `Vibrator` 服务 | 通常可用 | 可能被代理、限频或权限未下放 |
| `performHapticFeedback` | 走系统 View 反馈 | 沙箱 DecorView 上更易返回 `false` 或被宿主合并 |
| 本工程 `AndroidManifest` | 未声明 `VIBRATE` | 强震路径（`performBloom` 等）更依赖 `Vibrator`，沙箱下更易失效 |
| JS 节流（§4） | 密集操作下已会合并 | 与系统限频叠加后「漏感」更明显 |

本工程原生层注意点（`UiHapticsPlugin.java`）：

- **`performBloom` / `gameConfirm` 等**：优先调 `Vibrator.vibrate(EFFECT_HEAVY_CLICK)`，成功则**不再**走 `performHapticFeedback`；沙箱里 `vibrate()` 可能「调用成功但无体感」。
- **弱震**（`gameLand`、`gameSettleDollar` 等）：主要 `CLOCK_TICK` / `KEYBOARD_TAP`，在沙箱里本身就更弱，再叠 JS `land` 100ms、`settleDollar` 85ms 节流，连续落格/结算 `$` 时体感稀疏。
- **游戏高峰**：选字 + 多格 `land` + wobble + `tileRemove` 等在数百毫秒内连发，全局 `THROTTLE_MS` 70ms 会丢弃大量次震。

### 12.3 官方文档能查到什么

| 文档 | 与震动相关 |
|------|------------|
| [TapPlay 功能介绍](https://developer.taptap.cn/docs/sdk/tap-play/features/) | 无 |
| [TapPlay FAQ](https://developer.taptap.cn/docs/sdk/tap-play/faq/) | 登录/支付/存档；无震动 |
| [TapPlay 上架流程](https://developer.taptap.cn/docs/sdk/tap-play/input/) | 兼容性自测、32/64 位；无震动 |
| [小游戏 tap.vibrateShort](https://developer.taptap.cn/minigameapidoc/dev/api/device/vibrate/tap.vibrateShort/) | **仅小游戏**，不适用于 Capacitor APK |

震动问题需通过 TapTap **内部测试 / 工单**反馈，文档未给 APK 沙箱触感保证。

### 12.4 验证与改进方向（待做）

1. **对比测试**：同一包体在「直接安装」与「TapPlay 内启动」各玩一局拼词 + 结算；确认是否仅沙箱路径变差。
2. **Manifest**：显式添加 `android.permission.VIBRATE`（当前 manifest 未声明，强震依赖 `Vibrator` 回退）。
3. **原生策略**：`performBloom` 等改为 **先 `performHapticFeedback`，再 `Vibrator` 回退**；避免沙箱里 vibrate 空成功阻断 View 路径。
4. **TapPlay 环境**：若 SDK 提供运行环境检测，可对沙箱 **放宽 JS 节流**（或单独常量）；目前仓库未接入 TapPlay 检测 API。
5. **产品侧**：TapPlay 引导用户「添加到桌面」后走完整安装流程（官方支持），触感与直接安装一致。
6. **向 TapTap 提工单**：说明沙箱内 `UiHaptics` / 系统触觉反馈受限，询问是否有推荐接入方式。

---

## 11. 相关文件

| 文件 | 说明 |
|------|------|
| `src/platform/haptics.js` | 预设、节流、调度、全局 tap |
| `src/main.js` | 原生端 `initUIButtonHaptics()` |
| `src/settings/gameSettings.js` | `hapticsEnabled` 持久化 |
| `src/components/SettingsLayer.vue` | 开关与设置项触感 |
| `src/components/SettingsSegmentControl.vue` | 分段 `tabSwitch` |
| `android/.../UiHapticsPlugin.java` | Android 质感实现 |
| `android/.../MainActivity.java` | 注册 `UiHapticsPlugin` |

修改节流或预设映射后，请同步更新本文档 §3、§4。
