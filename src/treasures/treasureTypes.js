/**
 * @typedef {'rare' | 'epic' | 'legendary'} TreasureRarity
 */

/**
 * @typedef {Object} TreasureBaseDef
 * @property {number} price
 * @property {TreasureRarity} rarity
 * @property {string} [name]
 * @property {string} [emoji]
 * @property {import('./treasureDescription.js').TreasureDescSegment[] | string} description
 */

/**
 * @typedef {Object} TreasureDef
 * @property {string} treasureId
 * @property {number} price
 * @property {TreasureRarity} rarity
 * @property {string} name
 * @property {string} emoji
 * @property {import('./treasureDescription.js').TreasureDescSegment[] | string} description
 * @property {boolean} [shopEligible] 为 false 时不出现在商店池（传说法术授予等）
 */

/**
 * @typedef {Object} TreasureLogicConditions
 * @property {boolean} streakOk
 * @property {boolean} tripleOk
 * @property {boolean} uniqueOk
 * @property {boolean} threeRaritiesOk
 * @property {boolean} uniformOk
 * @property {boolean} shortWordOk
 */

/**
 * @typedef {Object} TreasureLogicContext
 * @property {Array} tiles
 * @property {{ rarity?: string }[]} letterParts
 * @property {TreasureLogicConditions} conditions
 * @property {number} basketballWordsSubmitted
 * @property {(string | null | undefined)[]} [ownedSlotTreasureIds]
 * @property {number} [remainingRemovals]
 * @property {Record<string, number>} [spellCountsByLength]
 * @property {number} [lengthTableLen] 与计分词长表一致的等效词长（用于按长度统计的钩子，可与 `tiles.length` 不同）
 * @property {number} [remainingDeckCount]
 * @property {boolean} [isLastSubmitChance] 本手是否消耗本关内最后一次出牌（拼写）机会
 * @property {number} [baseLetterScoreSum]
 * @property {number[]} [letterReplayCounts]
 * @property {() => number} [rng] 局内确定性随机 [0,1)，未传时宝藏逻辑可回退 Math.random
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun] 整局运行时状态（银行、关卡计数等）
 * @property {number} [money] 提交计分时钱包余额
 * @property {string} [resolvedWord] 本词（小写）
 * @property {readonly { rarity?: string }[]} [gridTiles] 提交时棋盘上全部有字格（含本手拼词格）
 * @property {readonly { rarity?: string }[]} [remainingGridTiles] 提交后仍将留在棋盘上的有字格（不含本手拼词格）
 * @property {readonly unknown[]} [fullDeck] 本局完整牌库 multiset
 * @property {Record<string, number> | null} [rarityLevelsByRarity] 各字母稀有度等级
 * @property {(word: string) => { pos?: string } | null | undefined} [getWordDefinition]
 */

/**
 * 已拥有槽位充能条（仅当宝藏实现了 `getChargeVisualState` / `getChargeProgress` 时展示）
 * @typedef {Object} TreasureChargeVisualContext
 * @property {number} chargeWordsSubmitted 本关已成功结算的拼词次数（与 `onSuccessfulWordSubmit` 所 bump 的计数一致）
 */

/**
 * 本关成功结算一词后，供各宝藏做计数/UI 等副作用（GamePanel 对槽位去重后调用）
 * @typedef {Object} TreasureSubmitSuccessContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {() => void} incrementChargeWordSubmissionCount 当前用于篮球类「每 N 词充能」计数；仅应由需要该计数的宝藏钩子调用
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {string} [resolvedWord]
 * @property {number} [judgedWordLength]
 * @property {number} [targetScore]
 * @property {number} [currentScore]
 * @property {number} [remainingWordsAfterSubmit]
 * @property {{ letter?: string, rarity?: string, materialId?: string | null }[]} [submittedLetters]
 * @property {(n: number) => void} [addRemainingWords]
 * @property {(amount: number) => void} [addMoney]
 * @property {(treasureId: string, amount: number) => Promise<void>} [playOwnedTreasureMoneyFx]
 * @property {(treasureId: string, delta: number) => Promise<void>} [playOwnedTreasureMultDeltaFx] 宝藏槽 wobble + 倍率 ±n 气泡（如天平）
 * @property {(treasureId: string, delta: number) => Promise<void>} [playOwnedTreasureScoreDeltaFx] 宝藏槽 wobble + 分数 +n 气泡（累加分数银行）
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleOnlyFx] 仅弹气泡（不自带 wobble）
 * @property {(treasureId: string) => Promise<void>} [playOwnedTreasureWobbleOnlyFx] 仅 wobble（不改遮罩层）
 * @property {(treasureId: string) => Promise<void>} [destroyTreasureSlotById]
 * @property {(raws: string[]) => void} [removeDeckLettersByRaws]
 * @property {(resolvedWord?: string) => void} [removeDeckCardsForSubmittedWord] 先移除本词提交格绑定的牌张，再按整词补删字母（工具箱等）
 * @property {object[]} [ownedTreasureInstances]
 * @property {() => number} [rng]
 * @property {{ materialId?: string | null }[] | null | undefined} [submittedScoringTiles] 本词参与记分的字母块快照（补牌前）；用于材质类结算后效果
 * @property {() => void | Promise<void>} [mutateRandomNonWildcardLetterTileToWildcard] 将当前棋盘上随机一枚非万能的有字格变为万能块（棋盘缩放回弹与法术「点亮」一致）
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {string} [resolvedWord] 本词词典解析结果（小写）
 * @property {boolean} [bossRestrictionTriggered] 本词触发 Boss 软限制（计 0 分）
 * @property {number} [judgedWordLength] 计分用词长
 * @property {number} [targetScore] 本关目标分
 * @property {number} [currentScore] 提交前累计分
 * @property {(n: number) => void} [addRemainingWords] 增加拼写次数
 * @property {(raws: string[]) => void} [removeDeckLettersByRaws]
 * @property {(resolvedWord?: string) => void} [removeDeckCardsForSubmittedWord] 先移除本词提交格绑定的牌张，再按整词补删字母（工具箱等） 从牌库移除字母
 * @property {() => number} [rng]
 * @property {(treasureId: string) => number} [findOwnedTreasureSlotIndex]
 * @property {() => string | null} [pickRandomInRunSpellId]
 * @property {(opts?: { spellId?: string, treasureSlotIndex?: number, treasureId?: string }) => Promise<void>} [requestInRunSpellGrant]
 * @property {(opts?: { bundle?: object | null, treasureSlotIndex?: number, treasureId?: string }) => Promise<void>} [requestInRunPackOpen]
 * @property {(opts?: { offer?: object, treasureSlotIndex?: number, treasureId?: string }) => Promise<void>} [requestInRunUpgrade]
 * @property {number} [moneyAfterSubmit] 本词计分动画结束后的钱包余额（释法/低余额判定用）
 * @property {(word: string) => { pos?: string } | null | undefined} [getWordDefinition]
 * @property {(opts?: { kind?: 'spell' | 'treasure' | 'upgrade' | 'letter', treasureSlotIndex?: number, treasureId?: string }) => Promise<void>} [requestInRunPackOpenOfKind]
 * @property {() => string | null} [rollRandomBigram]
 * @property {(word: string) => object | null | undefined} [resolveDiscardedWord] 弃牌字母串是否构成词典词
 * @property {(len: number, opts?: { observatoryBoost?: boolean }) => void} [bumpWordLengthLevel]
 * @property {(len: number) => Promise<void>} [runSingleInRunLengthUpgradeFx] 局内播放「单一词长 +1」升级动画并应用升级（会抑制交互层）
 * @property {(opts?: { spellId?: string, treasureSlotIndex?: number, treasureId?: string }) => Promise<void>} [requestInRunSpellGrant]
 * @property {(runner: SubmitWordLeaveFxRunner) => void} [registerSubmitWordLeaveFx] 登记本词提交后词槽/棋盘格消失阶段的自定义动画（在计分结束、默认批量消失之前执行）
 * @property {(runner: () => Promise<void>) => void} [registerSubmitPostScoreClearFx] 登记本词「计分清空」完成后执行的展示（在入库补牌与总分结算后）
 * @property {(opts: SubmitWordLetterRemoveLeaveOpts) => Promise<void>} [playSubmitWordLetterRemoveAndRewardLeave] 逐字 wobble + 红色「移除」气泡并消失，结束后宝藏 +$ 动效（由 GamePanel 实现）
 */

/**
 * 提交后词槽/棋盘格消失动画入参（与 `registerSubmitWordLeaveFx` 配套）
 * @typedef {Object} SubmitWordLeaveFxParams
 * @property {HTMLElement[]} slotEls
 * @property {HTMLElement[]} gridEls
 * @property {number} duration
 * @property {number} stagger
 */

/** @typedef {(params: SubmitWordLeaveFxParams) => Promise<void>} SubmitWordLeaveFxRunner */

/**
 * @typedef {Object} SubmitWordLetterRemoveLeaveOpts
 * @property {string} treasureId
 * @property {HTMLElement[]} slotEls
 * @property {HTMLElement[]} gridEls
 * @property {number} [duration]
 * @property {() => void} [onRemoveDeck]
 * @property {number} [moneyAmount]
 */

/**
 * 提交结算时，按字母 + replay 汇总加分/倍率（见 `accumulateReplaySubmitAdjustments`）
 * @typedef {Object} TreasureReplaySubmitAdjustmentsContext
 * @property {{ letter?: string, rarity?: string }[]} letterParts
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {number[]} replayCounts 各字母「额外整轮记分」次数（不含首遍）
 */

/**
 * @typedef {Object} TreasurePostStep
 * @property {number} [multAdd]
 * @property {number} [scoreAdd]
 * @property {number} [multMul]
 */

/**
 * @typedef {Object} TreasureHooks
 * @property {(ctx: TreasureLogicContext) => TreasurePostStep | null | undefined} [buildPostLetterStep]
 * @property {(ctx: TreasureLogicContext) => number} [getLetterRarityMultAdd]
 * @property {(part: { letter?: string, rarity?: string }) => number} [getLetterRarityMultDeltaForLetterPart] replay 时该字母上本宝藏贡献的倍率加量（与 `getLetterRarityMultAdd` 规则一致）
 * @property {(part: { letter?: string, rarity?: string }, ctx: TreasureLogicContext) => number} [getLetterRarityMultMulForLetterPart] 该字母计分（含 replay 轮）时乘上的倍率因子（>1 才生效；与 `getLetterRarityMultAnimConfig` 的 `multMul` 对齐）
 * @property {(ctx?: import('./treasureTypes.js').TreasureLogicContext) => { targetRarity: string, multDelta?: number, multMul?: number, bubbleLabel: string }} [getLetterRarityMultAnimConfig] 记分动画：与 `runLetterRarityTreasureMultStep` 对齐；`multMul` 为逐字乘法，`multDelta` 为加法
 * @property {(ctx: TreasureLogicContext) => number} [getExtraLetterScoringPasses] - 整词额外几轮逐字母 replay（每轮每字母 +1，与动画轮数一致）
 * @property {(ctx: TreasureLogicContext, part: { letter?: string, rarity?: string }, letterIndex: number) => number} [getLetterReplayCountForLetter]
 * @property {(ctx: TreasureLogicContext) => TreasurePostStep | null | undefined} [buildPostLetterReplayStep]
 * @property {(ctx: TreasureReplaySubmitAdjustmentsContext) => { scoreAdd?: number, multAdd?: number } | null | undefined} [accumulateReplaySubmitAdjustments]
 * @property {(ctx: { realTile: object | null, band: 'score' | 'mult', delta: number }) => boolean} [persistTileAfterPerLetterTreasureCue] 逐字「宝藏 +Δ」与词槽 wobble 同节拍前写回 tile/_deckCard；返回 true 表示已改角标（调用方 `nextTick` 后再建含角标的 wobble timeline）
 * @property {(ctx: { ownedSlotTreasureIds: (string | null | undefined)[] }, part: { letter?: string, rarity?: string }, letterIndex: number) => { delta: number, label?: string } | null | undefined} [getPerLetterScoreCue]
 * @property {boolean} [perLetterScoreCueDepositsTreasureBank] 为 true 时：逐字 cue 仅累加宝藏分数银行并在宝藏槽弹出 +Δ，不入词槽公式；入账在字后 `buildPostLetterStep` 的 `scoreAdd`（如 B 键 80）
 * @property {boolean} [mergeLetterScoreCueIntoIntrinsicLetterScoreStep] 为 true 时：`getPerLetterScoreCue` 的平面分增量与单字母「本体分数」（稀有度+tile 平面分+材质平面分）**同一拍**展示——词槽一次 wobble/气泡、`animScoreSum` 一次加上该增量，且不再单独走 `runSlotPerLetterTreasureScoreStep`；须与 `persistTileAfterPerLetterTreasureCue`（band `score`）写回角标一致（如剪贴板）。**仅**「增益落在 tile 角标/本体」类；元音、指定字母等条件宝藏勿开。
 * @property {(ctx: { ownedSlotTreasureIds: (string | null | undefined)[] }, part: { letter?: string, rarity?: string }, letterIndex: number) => { delta: number, label?: string } | null | undefined} [getPerLetterMultCue]
 * @property {boolean} [mergeLetterMultCueIntoIntrinsicLetterMultStep] 为 true 时：`getPerLetterMultCue` 的倍率增量与单字母「本体倍率」（稀有度+材质+tile 角标）**同一拍**展示——词槽一次 wobble/气泡、`animMultTotal` 一次加上该增量，且不再单独走 `runSlotPerLetterTreasureMultStep`；须与 `persistTileAfterPerLetterTreasureCue`（band `mult`）写回角标一致（如回形针）。**仅**「增益落在 tile 角标/本体」类；元音倍率等条件宝藏勿开。
 * @property {() => { title: string, description: string | import('./treasureDescription.js').TreasureDescSegment[] } | null | undefined} [getDetailGainPanel] 详情层主简介下、与具名配饰分区并列的补充说明：**仅**用于**具名棋盘材质**或**具名配饰**（火焰/水滴/扳手/裁剪等）的二次展示；**禁止**类目词（如「宝藏配饰」）作标题、禁止抽象计分复述。**当前仅 id「77」**应实现。原则见 `.cursor/rules/treasure-detail-supplement.mdc`、法术卡见 `spell-gain-panel.mdc`。
 * @property {(ctx: { chargeWordsSubmitted: number, ownedSlotTreasureIds: (string | null | undefined)[], remainingDeckCount?: number }) => import('./treasureDescription.js').TreasureDescSegment[] | null | undefined} [buildOwnedDetailDescriptionSegments] 已拥有详情（非货架报价）：在静态简介后追加片段；**仅限材质/配饰类补充**（与 `getDetailGainPanel` 同一原则）。充能进度、动态倍率数值等请用 footer 充能条等专用 UI，不要在此处追加简介。
 * @property {(ctx: TreasureSubmitSuccessContext) => void | Promise<void>} [onSuccessfulWordSubmit] 本词结算动画成功后调用（每词每宝藏 id 至多一次）
 * @property {(ctx: TreasureChargeVisualContext) => 'inactive' | 'active'} [getChargeVisualState] 若实现则 footer 显示充能态；未实现则无充能条
 * @property {(ctx: TreasureChargeVisualContext) => number} [getChargeProgress] 0~1，与 `getChargeVisualState` 成对实现
 * @property {(ctx: import('./treasureTypes.js').TreasurePatchDescriptionContext) => import('./treasureDescription.js').TreasureDescSegment[] | null | undefined} [patchDescription] 替换简介中「（当前…）」动态段；若 `replaceDescriptionWithPatch` 为 true 则整段简介由 patch 提供
 * @property {boolean} [replaceDescriptionWithPatch]
 * @property {(ctx: TreasureDiscardContext) => void | Promise<void>} [onDiscardBatch] 单次丢弃成功之后
 * @property {(ctx: TreasureLevelEnterContext) => void | Promise<void>} [prepareLevelEnter] 进入新小关、`resetLevel` 建盘之前
 * @property {(ctx: TreasureLevelEnterContext) => void | Promise<void>} [onLevelEnter] 进入新小关之后
 * @property {(ctx: TreasureLevelCompleteContext) => void | Promise<void>} [onLevelComplete] 小关达标即将结算
 * @property {(ctx: TreasureChapterEnterContext) => void} [onChapterEnter] 进入新大关（章号变化）
 * @property {(ctx: TreasureShopEnterContext) => void | Promise<void>} [onShopEnter] 进入商店（本段停留开始）
 * @property {(ctx: TreasureShopRerollContext) => void | Promise<void>} [onShopReroll] 商店刷新
 * @property {(ctx: TreasurePackSkippedContext) => void | Promise<void>} [onPackSkipped] 跳过组合包
 * @property {(ctx: TreasureSoldContext) => void | Promise<void>} [onTreasureSold] 卖出宝藏
 * @property {(ctx: TreasureShopLeaveContext) => void | Promise<void>} [onShopLeave] 离开商店进入下一关前
 * @property {(ctx: TreasureDeckCardsRemovedContext) => void | Promise<void>} [onDeckCardsRemoved] 从牌库永久移除牌张后
 * @property {(ctx: TreasureIceBreakContext) => void | Promise<void>} [onIceMaterialBreak] 碎冰块碎裂
 * @property {(ctx: TreasureLogicContext) => number} [getSubmitLengthBonus] 等效词长加成（直尺券之外）
 * @property {() => number} [getLengthJudgmentPenalty] 判定词长减益（视为更短）
 * @property {(ctx: TreasureBossRestrictionContext) => void | Promise<void>} [onBossRestrictionTriggered]
 * @property {(ctx: TreasureDeckCardsAddedContext) => void | Promise<void>} [onDeckCardsAdded]
 */

/**
 * @typedef {Object} TreasurePatchDescriptionContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {number} [extraLetterScoreWordsRemaining]
 * @property {string} [discardLetterGroup]
 * @property {string | null} [levelPosTargetKey]
 * @property {() => string | null} [rollRandomBigram]
 * @property {() => number} [rng]
 * @property {number} [money] 当前钱包（动态简介用）
 * @property {readonly unknown[]} [fullDeck] 本局完整牌库 multiset（动态简介用）
 */

/**
 * @typedef {Object} TreasureDiscardContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {{ letter?: string }[]} discardedLetters
 * @property {number} letterCount
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {() => number} [rng]
 * @property {(amount: number) => void} [addMoney]
 * @property {(treasureId: string, amount: number) => Promise<void>} [playOwnedTreasureMoneyFx]
 * @property {(treasureId: string, delta: number) => Promise<void>} [playOwnedTreasureMultDeltaFx]
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string) => number} [findOwnedTreasureSlotIndex]
 * @property {boolean} [discardPotteryFxHandled] 陶罐弃牌动效已在逐字消失中结算（避免 onDiscardBatch 重复入银行）
 */

/**
 * @typedef {Object} TreasureLevelEnterContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {() => number} [rng]
 * @property {string} [levelId]
 * @property {(treasureId: string) => number} [findOwnedTreasureSlotIndex]
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string) => void} [clearTreasureSlotById]
 * @property {(treasureId: string) => Promise<void>} [destroyTreasureSlotById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 * @property {(count?: number) => number} [grantRandomOwnedTreasure] 本关赠送随机宝藏次数，返回实际获得数
 * @property {(n: number) => void} [addRemainingWords]
 * @property {(n: number) => void} [addRemainingRemovals]
 * @property {(tiles: object[]) => void} [stripEnhancementsFromScoringTiles]
 * @property {(spec: { raw: string, accessoryId?: string | null, tileScoreBonus?: number, letterMultBonus?: number, materialId?: string | null }) => object | null} [appendDeckCardSpecToInitialSnapshot]
 * @property {(opts?: { spellId?: string, treasureSlotIndex?: number, treasureId?: string }) => Promise<void>} [requestInRunSpellGrant]
 */

/**
 * @typedef {Object} TreasureLevelCompleteContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {() => number} [rng]
 * @property {(treasureId: string) => void} [clearTreasureSlotById]
 * @property {(treasureId: string) => Promise<void>} [destroyTreasureSlotById] wobble +「摧毁！」气泡 + 缩至 0 后清空槽位
 * @property {(treasureId: string) => number} [findOwnedTreasureSlotIndex]
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(amount: number) => void} [addMoney]
 * @property {(treasureId: string, amount: number) => Promise<void>} [playOwnedTreasureMoneyFx] 宝藏槽 wobble + +$n 气泡并入账
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx] 宝藏槽 wobble + 自定义气泡（不入账）
 * @property {number} [remainingRemovals] 小关结束时剩余丢弃次数
 * @property {(treasureId: string, amount: number) => void} [bumpOwnedTreasurePriceById] 提高已拥有实例的购入价（影响卖出价）
 */

/**
 * @typedef {Object} TreasureChapterEnterContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 */

/**
 * @typedef {Object} TreasureShopEnterContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {(string | null | undefined)[]} [ownedSlotTreasureIds]
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 */

/**
 * @typedef {Object} TreasureShopRerollContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {(treasureId: string, delta: number) => Promise<void>} [playOwnedTreasureMultDeltaFx]
 */

/**
 * @typedef {Object} TreasurePackSkippedContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {(treasureId: string, delta: number) => Promise<void>} [playOwnedTreasureMultDeltaFx]
 */

/**
 * @typedef {Object} TreasureSoldContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {string} [soldTreasureId]
 * @property {number} [soldSlotIndex]
 * @property {() => boolean} [grantRandomTreasureCopy] 卖出时创建随机其他宝藏原始版（空槽）
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 */

/**
 * @typedef {Object} TreasureShopLeaveContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {(spellId: string) => Promise<void>} [replayLastSpellInRun]
 */

/**
 * @typedef {Object} TreasureDeckCardsRemovedContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {number} [vowelsRemoved] 本次移除的元音牌张数
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 */

/**
 * @typedef {Object} TreasureIceBreakContext
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 */

/**
 * @typedef {Object} TreasureBossRestrictionContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {string} [bossSlug]
 * @property {(amount: number) => void} [addMoney]
 * @property {(treasureId: string, amount: number) => Promise<void>} [playOwnedTreasureMoneyFx]
 */

/**
 * @typedef {Object} TreasureDeckCardsAddedContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {import('./treasureRunState.js').TreasureRunState} [treasureRun]
 * @property {number} [count]
 * @property {(treasureId: string) => Promise<void>} [wobbleOwnedTreasureById]
 * @property {(treasureId: string, text: string, kind?: string) => Promise<void>} [playOwnedTreasureBubbleFx]
 */

/**
 * 商店里的一条报价或玩家已拥有的实例（效果逻辑另注册）
 * @typedef {Object} TreasureInstance
 * @property {string} treasureId
 * @property {number} price
 * @property {TreasureRarity} rarity
 * @property {string} name
 * @property {string} emoji
 * @property {import('./treasureDescription.js').TreasureDescSegment[] | string} description
 * @property {string | null} [treasureAccessoryId] 商店购入时带入已拥有槽
 */

/**
 * @typedef {Object} ShopOfferRow
 * @property {'offer'} kind
 * @property {number} offerInstanceId
 * @property {'treasure' | 'upgrade'} [offerType]
 * @property {string} treasureId
 * @property {number} price
 * @property {TreasureRarity} rarity
 * @property {string} name
 * @property {string} emoji
 * @property {string} [iconClass]
 * @property {import('./treasureDescription.js').TreasureDescSegment[] | string} description
 * @property {string} [lengthLabel]
 * @property {string} [lengthBadgeLabel]
 * @property {string} [lengthGroupKey]
 * @property {number} [lengthMin]
 * @property {number} [lengthMax]
 * @property {string | null} [treasureAccessoryId] 货架宝藏随机配饰（`treasureAccessories.js`）；无则省略或 null
 */

/**
 * 已购后保留的空白槽位（占位防其余商品位移，不展示内容）
 * @typedef {Object} ShopEmptySlot
 * @property {'empty'} kind
 * @property {number} emptySlotId
 */

/** @typedef {ShopOfferRow | ShopEmptySlot} ShopOfferSlot */

export {};
