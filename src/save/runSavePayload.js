/** @typedef {Object} SerializedDeckCard
 * @property {number} _dcUid
 * @property {string} raw
 * @property {string} rarity
 * @property {string | null} materialId
 * @property {number} materialScoreBonus
 * @property {number} materialMultBonus
 * @property {number} tileScoreBonus
 * @property {number} letterMultBonus
 * @property {boolean} isWildcard
 * @property {string | null} accessoryId
 * @property {string | null} treasureAccessoryId
 * @property {boolean} everLeftDrawPile
 * @property {number} [vowelDisplayShift]
 */

/** @typedef {Object} SerializedGridCell
 * @property {string | null} tileId
 * @property {number | null} deckUid
 * @property {string} letter
 * @property {number} baseScore
 * @property {string} rarity
 * @property {number} letterMultBonus
 * @property {number} tileScoreBonus
 * @property {number} materialScoreBonus
 * @property {string | null} materialId
 * @property {number} materialMultBonus
 * @property {string | null} accessoryId
 * @property {string | null} treasureAccessoryId
 * @property {boolean} isWildcard
 * @property {boolean} bossGridBlocked
 * @property {boolean} bossTileDebuffed
 * @property {boolean} ceruleanBellLocked
 * @property {boolean} playerMarked
 * @property {number} [playerMarkBatch]
 * @property {number} [playerMarkSeq]
 */

/** @typedef {Object} SerializedDeckState
 * @property {SerializedDeckCard[]} cards
 * @property {number[]} deckUids
 * @property {(SerializedGridCell | null)[]} grid
 * @property {string[]} depletedDeckStackRaws
 * @property {boolean} deckPreviewAllInDrawPile
 * @property {number} deckCardUidSeq
 * @property {number} currentScore
 * @property {number} targetScore
 * @property {number} remainingWords
 * @property {number} remainingRemovals
 * @property {string} activeBossSlug
 * @property {number | null} ceruleanBellSlotIndex
 * @property {Record<string, number>} lengthLevelsByLength
 * @property {Record<string, number>} rarityLevelsByRarity
 * @property {Record<string, number>} lengthUpgradeObservatoryExtra
 * @property {Record<string, number>} spellCountsByLength
 * @property {number} basketballWordsSubmitted
 * @property {number} runWordLengthJudgmentPenalty
 * @property {unknown[]} ownedUpgrades
 */

/** @typedef {Object} SerializedOwnedTreasureSlot
 * @property {string} treasureId
 * @property {number} [price]
 * @property {string[]} [treasureAccessoryIds]
 * @property {number} [hourglassStagesElapsed]
 * @property {boolean} [treasureAccessoryExpired]
 */

/** @typedef {Object} RunSavePayload
 * @property {number} runSeedNumeric
 * @property {string} runSeedDisplay
 * @property {number} rngState
 * @property {number} deckCardUidSeq
 * @property {number} levelIndex
 * @property {boolean} isEndlessRun
 * @property {boolean} glyphShopSkipLevelAdvance
 * @property {number} money
 * @property {import('./runSaveSchema.js').RunSavePhase} phase
 * @property {number} activeSlotIndex
 * @property {SerializedDeckState} deckState
 * @property {SerializedOwnedTreasureSlot[]} ownedTreasures
 * @property {string[]} ownedVoucherIds
 * @property {unknown} treasureRunState
 * @property {string[]} spellCastHistory
 * @property {string | null} lastReplayableSpellId
 * @property {number[]} usedWordLengthsThisBoss
 * @property {number | null} mouthLockedLengthBoss
 * @property {string | null} clubRequiredKeyBoss
 * @property {number[]} pillarUsedDeckUids
 * @property {boolean} verdantTreasureSold
 * @property {number | null} crimsonTreasureDisabledSlotIndex
 * @property {string} pendingBossSlugOverride
 * @property {unknown} settlementSnapshot
 * @property {unknown[]} shopOffers
 * @property {unknown[]} packOffers
 * @property {unknown} shopVoucherShelf
 * @property {number} shopRerollsThisVisit
 * @property {number} shopVoucherShelfGeneration
 * @property {unknown} packPickSession
 * @property {unknown} bossRerollSession
 * @property {unknown} runMatchStats
 * @property {'fail' | 'win'} [runEndOutcome]
 * @property {string} [runPresetId]
 * @property {number} [runDifficultyIndex]
 */

export {};
