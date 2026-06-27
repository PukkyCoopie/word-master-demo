/**
 * RunSession 架构 JSDoc 类型骨架（无运行时代码）。
 *
 * 对应 `design/gamepanel-architecture-plan-v3.md` §3 / RunSession 命名空间。
 * 后续 `useRunSession`、各 controller 与壳层通过 `@typedef` 或 `import('./runSessionTypes.js')` 引用。
 *
 * 约束：本文件不得 import 任何 controller / Vue 组件，避免循环依赖。
 */

// ---------------------------------------------------------------------------
// Phase（§2.4）
// ---------------------------------------------------------------------------

/** @typedef {import('../save/runSaveSchema.js').RunSavePhase} RunSavePhase */

/**
 * 瞬时 UI 阶段（不写盘；与 `submit.busy`、补牌动画等对齐）。
 * @typedef {'scoring' | 'grid_refill' | 'pack_pick' | 'spell_target'} RunTransientPhase
 */

/** @typedef {RunSavePhase | RunTransientPhase} RunPhaseId */

/**
 * 阶段机只读快照（供 template / guard 双读或 shadow mode 对照）。
 * @typedef {Object} RunPhaseSnapshot
 * @property {RunPhaseId} phaseId
 * @property {boolean} isPlaying
 * @property {boolean} isShop
 * @property {boolean} isSettlement
 * @property {boolean} isRunEndWin
 * @property {boolean} isRunEndFail
 * @property {boolean} isRunEnd
 * @property {boolean} transitionBusy v1.1.5 转场 / 升级动画锁
 * @property {boolean} shopOverlayLayersSuppressed v1.1.5 商店内浮层 suppress
 * @property {() => boolean} canSubmitWord
 * @property {() => boolean} canOpenShop
 * @property {() => boolean} canPause
 * @property {() => boolean} isRunFlowOverlayOpen
 * @property {() => boolean} isBlockingPauseOpen
 */

/**
 * `session.phase` — `runPhaseMachine.js` 对外命名空间。
 * @typedef {Object} PhaseStore
 * @property {import('vue').ComputedRef<RunPhaseSnapshot>} snapshot
 * @property {import('vue').Ref<boolean>} transitionBusy
 * @property {import('vue').Ref<boolean>} shopOverlayLayersSuppressed
 * @property {() => boolean} canSubmitWord
 * @property {() => boolean} canOpenShop
 * @property {() => boolean} canPause
 * @property {() => boolean} isRunFlowOverlayOpen
 * @property {() => boolean} isBlockingPauseOpen
 * @property {(next: RunPhaseId) => void} [transitionTo] 任务 1.1 起由 phase 机实现
 */

// ---------------------------------------------------------------------------
// Grid（useGameState）
// ---------------------------------------------------------------------------

/**
 * 棋盘 / 牌库 / 选字（`useGameState` 返回值形状）。
 * @typedef {ReturnType<typeof import('../composables/useGameState.js').useGameState>} GridStore
 */

// ---------------------------------------------------------------------------
// Run 级状态（session.run）
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RunStore
 * @property {import('vue').Ref<number>} levelIndex
 * @property {import('vue').Ref<number>} money
 * @property {number} runSeedNumeric
 * @property {import('vue').Ref<ReturnType<typeof import('../game/runRng.js').createRunRng>>} runRng
 * @property {() => number} rng
 * @property {import('vue').Ref<string>} runPresetId
 * @property {import('vue').Ref<number>} runDifficultyIndex
 * @property {import('vue').Ref<boolean>} isEndlessRun
 * @property {import('vue').Ref<(string | null)[]>} ownedTreasures 槽位 treasureId
 * @property {import('vue').Ref<import('../treasures/treasureRunState.js').TreasureRunState>} treasureRunState
 * @property {import('vue').Ref<string[]>} ownedVoucherIds
 * @property {import('vue').Ref<unknown[]>} ownedUpgrades
 * @property {import('vue').Ref<import('../game/runMatchStats.js').RunMatchStats>} runMatchStats
 * @property {import('vue').Ref<import('../achievements/achievementRunState.js').AchievementRunState>} achievementRunState
 */

// ---------------------------------------------------------------------------
// Submit（session.submit）
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SubmitController
 * @property {import('vue').Ref<boolean>} submitWordBusy 提交前占用（与 scoringAnimating 错开）
 * @property {import('vue').Ref<boolean>} scoringAnimating
 * @property {import('vue').Ref<boolean>} gridRefillAnimating
 * @property {() => Promise<void>} submitWord
 * @property {() => boolean} canSubmit 与棋盘 / phase 联合判定
 */

// ---------------------------------------------------------------------------
// Shop / Pack（session.shop）
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ShopStore
 * @property {import('vue').Ref<boolean>} showShop
 * @property {import('vue').Ref<unknown[]>} shopOffers
 * @property {import('vue').Ref<unknown[]>} packOffers
 * @property {import('vue').Ref<number>} shopRerollsThisVisit
 * @property {import('vue').Ref<boolean>} shopUpgradeAnimating
 * @property {() => Promise<void>} enterShop
 * @property {() => Promise<void>} leaveShopToNextLevel
 * @property {() => void} rerollShop
 */

/**
 * @typedef {Object} PackPickStore
 * @property {import('vue').Ref<import('../save/runSavePayload.js').RunSavePayload['packPickSession']>} packPickSession
 * @property {import('vue').Ref<boolean>} packPickBusy
 * @property {import('vue').Ref<boolean>} packPickSkipBusy
 * @property {import('vue').Ref<boolean>} packPickOverlaySuppressed
 */

// ---------------------------------------------------------------------------
// Overlays（session.overlays）
// ---------------------------------------------------------------------------

/**
 * 各 Layer open 状态与 stack z-index（RunOverlayHost 聚合）。
 * @typedef {Object} OverlayStore
 * @property {import('vue').Ref<boolean>} showDeckLayer
 * @property {import('vue').Ref<boolean>} showInfoLayer
 * @property {import('vue').Ref<boolean>} showPauseOptions
 * @property {import('vue').Ref<boolean>} showSettlement
 * @property {import('vue').Ref<boolean>} showRunEnd
 * @property {import('vue').Ref<boolean>} showTreasureCollectionLayer
 * @property {import('vue').Ref<number>} overlayStackZ 递增 z-index 基准
 * @property {() => number} bumpOverlayZ
 */

// ---------------------------------------------------------------------------
// Save（session.save）
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CanSaveSnapshot
 * @property {boolean} [idle]
 * @property {boolean} [transitionBusy]
 * @property {boolean} [scoringAnimating]
 * @property {boolean} [gridRefillAnimating]
 * @property {number} [flyingLettersCount]
 * @property {number} [flyingBackBatchesCount]
 * @property {boolean} [submitWordBusy]
 */

/**
 * @typedef {Object} SaveBridge
 * @property {() => CanSaveSnapshot} getCanSaveSnapshot
 * @property {() => { ok: true } | { ok: false, reason: string }} canSaveNow
 * @property {() => Record<string, unknown>} buildSaveContext 供 `gamePanelSaveApi.buildGamePanelSaveContext`
 * @property {() => Promise<void>} flushAutoSave
 * @property {(payload: import('../save/runSavePayload.js').RunSavePayload) => void} hydrateFromPayload
 */

// ---------------------------------------------------------------------------
// UI / Dev（session.ui）
// ---------------------------------------------------------------------------

/**
 * @typedef {import('../runSession/controllers/useFirstWordTutorialController.js').ReturnType<typeof import('../runSession/controllers/useFirstWordTutorialController.js').useFirstWordTutorialController>} FirstWordTutorialController
 */

/**
 * @typedef {import('../runSession/controllers/useRunEndFlowController.js').ReturnType<typeof import('../runSession/controllers/useRunEndFlowController.js').useRunEndFlowController>} RunEndFlowController
 */

/**
 * @typedef {Object} RunUiStore
 * @property {import('vue').Ref<boolean>} firstWordTutorialActive
 * @property {() => boolean} isFirstWordTutorialBlockingInput
 * @property {FirstWordTutorialController} firstWordTutorial
 * @property {RunEndFlowController} runEnd
 * @property {() => void} scheduleTutorialSpotlightUpdate
 * @property {(opts?: { force?: boolean }) => Promise<void>} beginFirstWordTutorialAfterGridSettled
 * @property {() => void} [registerAndroidBackHandler]
 * @property {() => void} [unregisterAndroidBackHandler]
 */

// ---------------------------------------------------------------------------
// Controller 占位（后续 Phase 接线）
// ---------------------------------------------------------------------------

/**
 * 棋盘 / 词槽控制器（`usePlayfieldController` 返回值形状，任务 2.4）。
 * @typedef {Object} PlayfieldController
 * @property {import('vue').Ref<unknown[]>} flyingLetters
 * @property {import('vue').Ref<unknown[]>} flyingBackBatches
 * @property {import('vue').ComputedRef<unknown[]>} flyingLettersForRender
 * @property {import('vue').Ref<unknown[]>} gridTileRefs
 * @property {HTMLElement[]} wordSlotRefs
 * @property {import('vue').Ref<number | null>} wordDragReturnAnimSlot
 * @property {import('vue').Ref<boolean>} tileDragActive
 * @property {import('vue').Ref<unknown | null>} tileDragSource
 * @property {import('vue').ShallowRef<object | null>} tileDragGhostPresentation
 * @property {import('vue').ComputedRef<unknown[]>} displayWordSlotPresentations
 * @property {(index: number, el: unknown) => void} setGridTileRef
 * @property {(index: number) => HTMLElement | undefined} getGridTileElByIndex
 * @property {(index: number, el: unknown) => void} setWordSlotRef
 * @property {(el: HTMLElement | null | undefined) => void} clearGridTileGsapAfterDrop
 * @property {() => void} onWordSlotsLayoutResize
 * @property {() => void} disposeSlotRaf
 * @property {(row: number, col: number, tile: object) => void} onTileClick
 * @property {(i: number) => void} onSlotClick
 * @property {(row: number, col: number, tile: object, options?: object) => void} startOneMoveIn
 * @property {(slotIndex: number) => void} startOneMoveOut
 * @property {(fly: object, el: unknown) => void} setFlyingInRef
 * @property {() => void} cancelAllFlyingIn
 * @property {(e: Event, row: number, col: number, tile: object) => void} onGridTileContextMenu
 * @property {(e: PointerEvent, row: number, col: number, tile: object) => void} onGridTileCombinedPointerDown
 * @property {(e: PointerEvent, row: number, col: number, tile: object) => void} onGridTilePointerUp
 * @property {(e: Event, i: number) => void} onWordSlotContextMenu
 * @property {(e: PointerEvent, displayIndex: number) => void} onWordSlotCombinedPointerDown
 * @property {(e: PointerEvent, i: number) => void} onWordSlotPointerUp
 * @property {(e: PointerEvent) => void} onTilePointerCancel
 * @property {(row: number, col: number, e: PointerEvent) => void} onTileDragGridPointerDown
 * @property {(orderIndex: number, e: PointerEvent) => void} onTileDragWordPointerDown
 * @property {() => void} clearTileLongPressArm
 * @property {(e: PointerEvent, openFn: () => void) => void} armTileLongPressFromPointer
 * @property {(row: number, col: number) => boolean} isTileFlying
 * @property {(row: number, col: number, tile: object) => boolean} isGridTilePlaceholder
 * @property {(displayIndex: number) => boolean} isSlotContentHidden
 * @property {(slotIndex: number) => boolean} isSlotOutOfFlow
 * @property {(displayIndex: number) => string} wordSlotPlaceholderKey
 * @property {(tile: object) => object | null} gridPlaceholderFrozenPresentation
 * @property {() => void} syncGridPlaceholderFreezeCaptures
 * @property {(deltaMs?: number | boolean) => void} updateSlotPositions
 * @property {() => void} ensureSlotRafRunning
 * @property {() => void} syncFlyingInTargets
 * @property {() => Promise<void>} waitForFlyingInIdle
 * @property {() => Promise<void>} waitForFlyingBackIdle
 * @property {() => number | null} getFlyingBackMinSlotIndex
 * @property {() => void} finalizeFlyingBackBatchesImmediately
 * @property {(slotIndex: number, clientX: number, clientY: number, ghost: object) => void} animateWordTileReturnToGrid
 * @property {() => HTMLElement[]} getSelectedGridCellElsInOrder
 * @property {() => HTMLElement[]} getSelectedGridTileElsInOrder
 * @property {(el: unknown) => HTMLElement | undefined} refToDom
 */

/**
 * 弃牌 / remove 按钮与补牌动画编排（`useGridDiscardController`，任务 4.3）。
 * @typedef {Object} GridDiscardController
 * @property {import('vue').Ref<number>} removalDeltaKey
 * @property {import('vue').ComputedRef<boolean>} canRemove
 * @property {import('vue').ComputedRef<boolean>} discardBtnOverLimit
 * @property {() => Promise<void>} onRemoveClick
 * @property {() => void} onDiscardBtnClick
 * @property {(slotEls: HTMLElement[], gridEls: HTMLElement[], options?: object) => Promise<void>} runSlotAndGridLeaveAnimation
 * @property {() => void} dispose
 */

/**
 * 词槽展示（元音 ghost、飞回截断、万能解析、青铃锁位；任务 4.1）。
 * @typedef {Object} WordSlotPresentationController
 * @property {import('vue').ComputedRef<object[]>} effectiveFormulaTiles
 * @property {import('vue').ComputedRef<object[]>} wordSlotTilePresentations
 * @property {import('vue').ComputedRef<Map<string, string>>} gridTileLetterForRender
 * @property {import('vue').ComputedRef<Map<string, string>>} gridTileRarityForRender
 * @property {import('vue').ComputedRef<Map<string, { prev: string | null, next: string | null }>>} gridTileVowelGhostForRender
 * @property {(tile: object, opts?: object) => { prev: string | null, next: string | null } | null} vowelGhostForTile
 * @property {(tile: object) => object} computeFlyInTilePresentation
 * @property {(tile: object) => object} computeFlyBackTilePresentation
 * @property {(tile: object, res: string | null, eff: string, extraTile?: object) => object} tilePresentationInResolvedWord
 * @property {(tile: object) => object | null} resolveWildcardInWordPresentation
 * @property {(tile: object) => object} normalizeWordSlotPresentationTile
 * @property {(tile: object) => boolean} isTileInFlyingBackFromWord
 * @property {(tile: object) => number} selectedSlotIndexForTile
 * @property {import('vue').ComputedRef<string | null>} resolvedWordForSubmit
 * @property {import('vue').ComputedRef<string>} effectiveWordForSubmit
 * @property {import('vue').ComputedRef<{ word: string }>} effectiveWordPartsForSubmit
 */
/** @typedef {Object} ShopPhaseController */
/** @typedef {Object} PackPickController */
/** @typedef {Object} SpellCastController */
/** @typedef {Object} TreasureRunController */
/** @typedef {Object} RunLifecycleController
 * @property {import('vue').Ref<number>} endlessReportedLeaderboardChapter
 * @property {import('vue').Ref<boolean>} glyphShopSkipLevelAdvance
 * @property {import('vue').Ref<Set<number>>} usedWordLengthsThisBoss
 * @property {import('vue').Ref<number | null>} mouthLockedLengthBoss
 * @property {import('vue').Ref<string | null>} clubRequiredKeyBoss
 * @property {import('vue').Ref<object | null>} bossRerollSession
 * @property {import('vue').Ref<object | null>} pagerQuizSession
 * @property {import('vue').Ref<object | null>} pendingPagerQuizSession
 * @property {import('vue').Ref<string>} pendingBossSlugOverride
 * @property {() => string} bossSlugForMechanics
 * @property {() => object} getBossTileDebuffContext
 * @property {() => object | undefined} getNextLevelDefAfterShop
 * @property {(event?: Event) => Promise<void>} onShopNextLevel
 * @property {() => void} onBossBlindRerollPaid
 * @property {(event?: Event) => Promise<void>} onBossBlindRerollContinue
 * @property {(payload: unknown) => void} onPagerQuizResolved
 * @property {() => void} onPagerQuizClosed
 * @property {(levelDef: object, opts?: object) => Promise<void>} [resetLevelAfterTreasurePrep]
 * @property {(fn: () => void | Promise<void>) => void} scheduleAfterGridTilesSettled
 * @property {() => Promise<void>} runPendingAfterGridTilesSettled
 * @property {() => Promise<void>} runGridIntroAfterReset
 * @property {() => Promise<void>} playLevelAdvanceHeaderFx
 * @property {(levelId: string) => void} syncEndlessLeaderboardChapterBaseline
 * @property {() => void} resetTapTapLeaderboardRunTracking
 * @property {() => void} clearPagerQuizPendingResolve
 * @property {() => Promise<void>} dismissBossRerollOnBack
 * @property {(voucherId: string) => boolean} applyGlyphVoucherLevelSkip
 */
/** @typedef {Object} OverlayStackController
 * @property {import('vue').Ref<number>} deckPortalZ
 * @property {import('vue').Ref<number>} deckExpandPortalZ
 * @property {import('vue').Ref<number>} pauseOptionsPortalZ
 * @property {import('vue').Ref<number>} dictFatalPortalZ
 * @property {import('vue').Ref<number>} toastPortalZ
 * @property {import('vue').Ref<string>} toast
 * @property {import('vue').ComputedRef<boolean>} dictFatalOpen
 * @property {import('vue').ComputedRef<string>} dictFatalMessage
 * @property {import('vue').ComputedRef<Record<string, number> | undefined>} deckPortalStackStyle
 * @property {import('vue').ComputedRef<Record<string, number> | undefined>} deckExpandPortalStackStyle
 * @property {import('vue').ComputedRef<Record<string, number> | undefined>} pauseOptionsPortalStackStyle
 * @property {import('vue').ComputedRef<Record<string, number> | undefined>} dictFatalPortalStackStyle
 * @property {import('vue').ComputedRef<Record<string, number> | undefined>} toastPortalStackStyle
 * @property {(deps: Record<string, unknown>) => void} initGlobalOverlays
 * @property {(deps: Record<string, unknown>) => void} initViewContext
 * @property {() => Record<string, unknown>} buildViewContext
 * @property {() => void} onDictFatalReload
 * @property {(msg: string, ms?: number) => void} showToast
 * @property {() => void} openDeckPortal
 * @property {() => void} closeDeckPortal
 * @property {() => void} openPauseOptionsPortal
 * @property {() => void} bumpDeckExpandPortal
 * @property {() => void} bumpDictFatalPortal
 * @property {() => void} bumpToastPortal
 * @property {typeof import('../../game/overlayStack.js').bumpOverlayZ} bumpOverlayZ
 */

// ---------------------------------------------------------------------------
// RunSession 根（§2.3）
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RunSessionProps
 * @property {number} [runSeed]
 * @property {string} [runSeedDisplay]
 * @property {string} [runPresetId]
 * @property {number} [runDifficultyIndex]
 * @property {import('../save/runSavePayload.js').RunSavePayload | null} [restoredSave]
 */

/**
 * @typedef {Object} RunSession
 * @property {PhaseStore} phase
 * @property {GridStore} grid
 * @property {RunStore} run
 * @property {SubmitController} submit
 * @property {ShopStore} shop
 * @property {PackPickStore} [packPick]
 * @property {OverlayStore} overlays
 * @property {SaveBridge} save
 * @property {RunUiStore} ui
 * @property {PlayfieldController} [playfield]
 * @property {GridDiscardController} [discard]
 * @property {WordSlotPresentationController} [wordSlots]
 * @property {ShopPhaseController} [shopController]
 * @property {PackPickController} [packPickController]
 * @property {SpellCastController} [spell]
 * @property {TreasureRunController} [treasures]
 * @property {RunLifecycleController} [lifecycle]
 * @property {OverlayStackController} [overlayStack]
 */

/**
 * `provide` / `inject` 键（任务 1.2 起使用）。
 * @typedef {'word_master_run_session'} RunSessionInjectKey
 */

export {};
