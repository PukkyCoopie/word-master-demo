/** @typedef {import('./runCollectionDiscoveries.js').RunDiscoveryTabId} RunDiscoveryTabId */

/**
 * @typedef {Object} RunDiscoveryDisplayTreasure
 * @property {'treasure'} kind
 * @property {string} key
 * @property {string} treasureId
 * @property {string} emoji
 * @property {string} name
 * @property {string} rarity
 * @property {string} ariaLabel
 */

/**
 * @typedef {Object} RunDiscoveryDisplaySpell
 * @property {'spell'} kind
 * @property {string} key
 * @property {string} spellId
 * @property {string} name
 * @property {string} iconClass
 * @property {string} ariaLabel
 */

/**
 * @typedef {Object} RunDiscoveryDisplayUpgrade
 * @property {'upgrade'} kind
 * @property {string} key
 * @property {string} upgradeId
 * @property {string} upgradeKind
 * @property {string} lengthBadgeLabel
 * @property {string} lengthLabel
 * @property {string} iconClass
 * @property {string} name
 * @property {string} ariaLabel
 */

/**
 * @typedef {Object} RunDiscoveryDisplayVoucher
 * @property {'voucher'} kind
 * @property {string} key
 * @property {string} pairId
 * @property {1 | 2} tier
 * @property {Array<{ emoji: string, displayName: string }>} stamps
 * @property {string} ariaLabel
 */

/**
 * @typedef {Object} RunDiscoveryDisplayMaterial
 * @property {'material'} kind
 * @property {string} key
 * @property {string} materialId
 * @property {string} ariaLabel
 */

/**
 * @typedef {Object} RunDiscoveryDisplayAccessory
 * @property {'accessory'} kind
 * @property {string} key
 * @property {string} accessoryId
 * @property {string} chipClass
 * @property {string} iconClass
 * @property {'treasure-accessory-chip' | 'tile-accessory-chip'} scopeClass
 * @property {string} ariaLabel
 */

/** @typedef {RunDiscoveryDisplayTreasure | RunDiscoveryDisplaySpell | RunDiscoveryDisplayUpgrade | RunDiscoveryDisplayVoucher | RunDiscoveryDisplayMaterial | RunDiscoveryDisplayAccessory} RunDiscoveryDisplayItem */

export {};
