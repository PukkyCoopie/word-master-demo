# GamePanel Controller 接线矩阵（v3.6.26）

> 基线：当前 `src/components/GamePanel.vue`（**8,495** 行，2026-06-25 当前工作树）
> 目的：在继续拆分前，明确每个 namespace / host / controller 的输入、消费者和删除条件。
> 切片顺序与验收 grep 见 `design/gamepanel-architecture-plan-v3.md` §11 / **§23～§30**；字段映射见 §14（F2）、§15（G1）、§20（G2）、§28（settlement）、§29（dev）；Phase H 见 **§24**。

## 总装配顺序

1. 创建 `useRunSession(props, emit)`
2. 建立 `phase`
3. 按低风险到高风险逐个挂载 namespace
4. 每次只迁移一个真实消费者
5. 验证通过后删除对应旧实现

## 矩阵

| namespace / 模块 | 创建位置 | 主要输入 | 主要消费者 | 当前删除目标 |
|---|---|---|---|---|
| `phase` | `GamePanel.vue` | `transitionBusy`、`showShop`、overlay open flags | `GamePanel` 壳层、后续 controller 门禁 | scattered phase / busy 判断 |
| `overlayStack` | `GamePanel.vue` | portal z-index、present/dismiss 节奏、**全局 dictFatal/toast** | `RunOverlayHost.vue`、`RunGlobalOverlays.vue`、牌库浮层 | E4.1 已完成；deck / pause z glue 已收口 |
| `pauseOverlay` | `GamePanel.vue` + **`useDeveloperOptionsBridge.js`** | pause / developer open state、dev cheat handler | `RunOverlayHost.vue`、Android back | **G3.5 已完成**：Host 仅 inject；无 template props |
| `save` | `GamePanel.vue` | run/grid/UI 状态、hydrate 入口 | autosave / restore | 旧 save watch 和 save context |
| `playfield` | `GamePanel.vue` | grid、selection、DOM getter、detail helper | `InRunPlayfield.vue` | 旧主战场模板和 playfield glue |
| `submit` | `GamePanel.vue` | scoring refs、submit 动画、busy 状态 | 提交按钮和提交链路 | inline `runSubmitScoringSequence` 旧链已删；唯一路径 `useSubmitWordController` → `submitScoringAnim.js` |
| `discard` | `GamePanel.vue` | remove/refill 状态、grid 动画 | 弃牌、移除、补牌链路 | 旧 discard / refill 编排 |
| `shop` | `GamePanel.vue` | **`useShopPhaseController`（G2 已接线）** | `InRunShopPhase.vue` | ~~inline `shopSession` + ~800 行双写~~ **G2 已完成** |
| `packPick` | `GamePanel.vue` | reward / grant context、`runSpellPreviewChain` | `RunOverlayHost.vue` | 已接入 controller；inline 开包编排已删 |
| `treasures` | `GamePanel.vue` | `useTreasureRunController` | shop / submit / overlay | **G1 已完成**：`treasureSession = treasureRun`；`sharedTreasureDetail` 与 pause/spell 共用 |
| `spell` | `GamePanel.vue` | `useSpellCastController` | `RunOverlayHost.vue` | inline 法术选格/施放 ~1,160 行已删 |
| `lifecycle` | `GamePanel.vue` | `useRunLifecycleController` + bind* | shop next level、Boss reroll、pager、grid intro | 内联 `onShopNextLevel` / `buildLevelResetRunOpts` 等已删；`getBossBlindRerollLayer` 已改走 `RunOverlayHost` |
| `ui.firstWordTutorial` | `GamePanel.vue` | `useFirstWordTutorialController` 返回值 | `FirstWordTutorialHost.vue` | **F3 已完成**：Host inject；GamePanel 模板仅 `ref` |
| `ui.runEnd` | `GamePanel.vue` | `useRunEndFlowController` → `createRunEndFlow` | `RunEndFlowHost.vue` | **F2 已完成**：Host inject；GamePanel 模板仅 `ref`；discovery / endless 回调仍经壳层 deps |
| `assembly` | `useGamePanelSessionAssembly.js` | `buildGamePanelAssemblyDeps()` 巨型 deps | 内部 controller 实例化 | **G3.1 已完成**：GamePanel 无直接 `use*Controller(`；packPick 等经 `panelAssembly` 回填 |

## 当前宿主组件

| 组件 | 依赖 | 说明 |
|---|---|---|
| `InRunPlayfield.vue` | `session.playfield` | 主战场 |
| `InRunShopPhase.vue` | **`session.shop`**（= `useShopPhaseController` 返回值） | 商店阶段；`buildViewContext()` → `SHOP_VIEW_KEY` |
| `RunOverlayHost.vue` | `session.overlayStack` + overlay state + **`session.lifecycle`**（Boss/Pager） | 聚合浮层；layer ref 经 `defineExpose` 供 lifecycle / packPick / spell 动画。**E4.2 已完成** |
| `RunGlobalOverlays.vue` | `session.overlayStack` | 词典 fatal + toast；E4.1 已 inject，无 Host props |
| `RunEndFlowHost.vue` | **`session.ui.runEnd`** + `session.overlayStack.bumpOverlayZ` | 通关 / 失败流程。**F2 已 inject**，无 props |
| `StageSettlementLayer.vue` | **`session.ui.settlement`** | 小关结算；**G3.4 已 inject**，无 props |
| `FirstWordTutorialHost.vue` | **`session.ui.firstWordTutorial`** | 首词教程；F3 已 inject，无 props |

## 当前重点

- **下一切片**：**Phase H smoke** 全表（计划 §24 ↔ `gamepanel-split-smoke.md`）→ Phase H 外部备份
- Phase G：**G1～G3.6 已完成**；装配见 `useGamePanelSessionAssembly.js`、`useRunAchievementBridge.js`、`useStageSettlementController.js`、`useRunPanelBootstrap.js`、`useDeveloperOptionsBridge.js`、`gamePanelSubmitFxBridge.js`
- lifecycle `bindPlayfield` 使用 `tryCeruleanBellMarkAfterGridStable`（含 Boss 条带 cue），与 controller 默认 fly-in 路径略有差异，属有意保留

## G2 接线要点（摘要，**已落地**）

| 步骤 | 动作 |
|---|---|
| 1 | 外部 `showShop` ref → `useShopPhaseController({ state: { showShop } })` |
| 2 | `runLifecycle` 之后、`treasureRun` 之前创建 controller |
| 3 | `shopSelectionBridge` lazy 填 `presentTreasureDetail`（treasureRun + firstWordTutorial 之后） |
| 4 | `shopPhase.initViewContext({ … })` → 删除 inline `shopSession.buildViewContext` |
| 5 | 第二次 `mountGamePanelSessionNamespaces({ shop: shopPhase, … })` |
| 6 | 删 §21 双写块；`watch(showShop)` 改调 `onShopVisitEnter` |

## 债务 grep 快查

与计划 §6 / §21 一致。**G2 已清零**：

- ~~`const shopSession = {` 在 GamePanel~~
- ~~`buildViewContext()` 在 GamePanel（inline 方法）~~
- ~~`function rollShopStock|function onShopReroll|function onShopSelectOffer` 等在 GamePanel~~
