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
 * @property {number} [remainingDeckCount]
 * @property {boolean} [isLastSubmitChance] 本手是否消耗本关内最后一次出牌（拼写）机会
 * @property {number} [baseLetterScoreSum]
 * @property {number[]} [letterReplayCounts]
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
 * @property {{ materialId?: string | null }[] | null | undefined} [submittedScoringTiles] 本词参与记分的字母块快照（补牌前）；用于材质类结算后效果
 * @property {() => void | Promise<void>} [mutateRandomNonWildcardLetterTileToWildcard] 将当前棋盘上随机一枚非万能的有字格变为万能块（棋盘缩放回弹与法术「点亮」一致）
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
 * @property {() => { targetRarity: string, multDelta: number, bubbleLabel: string }} [getLetterRarityMultAnimConfig] 记分动画：与 `runLetterRarityTreasureMultStep` 对齐
 * @property {(ctx: TreasureLogicContext) => number} [getExtraLetterScoringPasses] - 整词额外几轮逐字母 replay（每轮每字母 +1，与动画轮数一致）
 * @property {(ctx: TreasureLogicContext, part: { letter?: string, rarity?: string }, letterIndex: number) => number} [getLetterReplayCountForLetter]
 * @property {(ctx: TreasureLogicContext) => TreasurePostStep | null | undefined} [buildPostLetterReplayStep]
 * @property {(ctx: TreasureReplaySubmitAdjustmentsContext) => { scoreAdd?: number, multAdd?: number } | null | undefined} [accumulateReplaySubmitAdjustments]
 * @property {(ctx: { realTile: object | null, band: 'score' | 'mult', delta: number }) => boolean} [persistTileAfterPerLetterTreasureCue] 逐字「宝藏 +Δ」与词槽 wobble 同节拍前写回 tile/_deckCard；返回 true 表示已改角标（调用方 `nextTick` 后再建含角标的 wobble timeline）
 * @property {(ctx: { ownedSlotTreasureIds: (string | null | undefined)[] }, part: { letter?: string, rarity?: string }, letterIndex: number) => { delta: number, label?: string } | null | undefined} [getPerLetterScoreCue]
 * @property {boolean} [mergeLetterScoreCueIntoIntrinsicLetterScoreStep] 为 true 时：`getPerLetterScoreCue` 的平面分增量与单字母「本体分数」（稀有度+tile 平面分+材质平面分）**同一拍**展示——词槽一次 wobble/气泡、`animScoreSum` 一次加上该增量，且不再单独走 `runSlotPerLetterTreasureScoreStep`；须与 `persistTileAfterPerLetterTreasureCue`（band `score`）写回角标一致（如剪贴板）。**仅**「增益落在 tile 角标/本体」类；元音、指定字母等条件宝藏勿开。
 * @property {(ctx: { ownedSlotTreasureIds: (string | null | undefined)[] }, part: { letter?: string, rarity?: string }, letterIndex: number) => { delta: number, label?: string } | null | undefined} [getPerLetterMultCue]
 * @property {boolean} [mergeLetterMultCueIntoIntrinsicLetterMultStep] 为 true 时：`getPerLetterMultCue` 的倍率增量与单字母「本体倍率」（稀有度+材质+tile 角标）**同一拍**展示——词槽一次 wobble/气泡、`animMultTotal` 一次加上该增量，且不再单独走 `runSlotPerLetterTreasureMultStep`；须与 `persistTileAfterPerLetterTreasureCue`（band `mult`）写回角标一致（如回形针）。**仅**「增益落在 tile 角标/本体」类；元音倍率等条件宝藏勿开。
 * @property {() => { title: string, description: string | import('./treasureDescription.js').TreasureDescSegment[] } | null | undefined} [getDetailGainPanel] 详情层主简介下、与具名配饰分区并列的补充说明：**仅**用于**具名棋盘材质**或**具名配饰**（火焰/水滴/扳手/裁剪等）的二次展示；**禁止**类目词（如「宝藏配饰」）作标题、禁止抽象计分复述。**当前仅 id「77」**应实现。原则见 `.cursor/rules/treasure-detail-supplement.mdc`、法术卡见 `spell-gain-panel.mdc`。
 * @property {(ctx: { chargeWordsSubmitted: number, ownedSlotTreasureIds: (string | null | undefined)[], remainingDeckCount?: number }) => import('./treasureDescription.js').TreasureDescSegment[] | null | undefined} [buildOwnedDetailDescriptionSegments] 已拥有详情（非货架报价）：在静态简介后追加片段；**仅限材质/配饰类补充**（与 `getDetailGainPanel` 同一原则）。充能进度、动态倍率数值等请用 footer 充能条等专用 UI，不要在此处追加简介。
 * @property {(ctx: TreasureSubmitSuccessContext) => void | Promise<void>} [onSuccessfulWordSubmit] 本词结算动画成功后调用（每词每宝藏 id 至多一次）
 * @property {(ctx: TreasureChargeVisualContext) => 'inactive' | 'active'} [getChargeVisualState] 若实现则 footer 显示充能态；未实现则无充能条
 * @property {(ctx: TreasureChargeVisualContext) => number} [getChargeProgress] 0~1，与 `getChargeVisualState` 成对实现
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
