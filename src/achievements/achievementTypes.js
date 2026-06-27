/**
 * @typedef {'career_level_reached'
 *   | 'career_words'
 *   | 'career_tiles_used'
 *   | 'career_tiles_discarded'
 *   | 'career_wallet_peak'
 *   | 'submit_all_wildcard'
 *   | 'run_win'
 *   | 'run_one_word_per_level_win'
 *   | 'run_no_discard_win'
 *   | 'run_no_reroll_win'
 *   | 'submit_double_ice'
 *   | 'level_vouchers'
 *   | 'max_length_level'
 *   | 'max_rarity_level'
 *   | 'submit_score'
 *   | 'submit_word_length'
 *   | 'deck_size'
 *   | 'discover_all_treasures'
 *   | 'discover_all_spells'
 *   | 'discover_all_upgrades'
 *   | 'discover_all_vouchers'
 *   | 'discover_all_materials'
 *   | 'discover_all_accessories'
 *   | 'run_difficulty_win'
 *   | 'submit_letter_score_triggers'
 *   | 'run_interest_total'
 *   | 'run_money_spent'
 *   | 'event_safe_bomb_blast'
 *   | 'event_volcano_eruption'
 *   | 'run_lucky_triggers'
 *   | 'submit_steel_enhancements'
 *   | 'acquire_legendary_treasure'} AchievementConditionKind
 */

/**
 * @typedef {Object} AchievementCondition
 * @property {AchievementConditionKind} kind
 * @property {number} [threshold]
 * @property {string} [levelId]
 * @property {number} [voucherCount]
 * @property {number} [difficultyIndex]
 * @property {boolean} [exactLength]
 */

/**
 * @typedef {Object} AchievementDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {AchievementCondition} condition
 */

export {};
