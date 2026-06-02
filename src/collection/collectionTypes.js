/** @typedef {Object} CollectionSubmitTileSnapshot
 * @property {string} letter
 * @property {string} [naturalLetter]
 * @property {number} [vowelDisplayShift]
 * @property {string} rarity
 * @property {string | null} [materialId]
 * @property {boolean} [isWildcard]
 * @property {number} [tileScoreBonus]
 * @property {number} [letterMultBonus]
 * @property {number} [materialScoreBonus]
 * @property {number} [materialMultBonus]
 * @property {string | null} [accessoryId]
 * @property {string | null} [treasureAccessoryId]
 * @property {string | null} [vowelGhostPrev]
 * @property {string | null} [vowelGhostNext]
 */

/** @typedef {Object} CollectionWordRecord
 * @property {string} word
 * @property {number} score
 * @property {number} length
 * @property {number} recordedAt
 * @property {CollectionSubmitTileSnapshot[]} tiles
 * @property {import('../save/runSavePayload.js').SerializedOwnedTreasureSlot[]} ownedTreasures
 */

export const COLLECTION_LEADERBOARD_MAX = 10;
