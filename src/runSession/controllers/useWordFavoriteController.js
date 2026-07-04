import { computed, inject, ref } from "vue";
import { getSlotCareer } from "../../save/runSaveStorage.js";
import { normalizeSlotCareerStats } from "../../save/slotCareerStats.js";
import { createEmptySlotCareerStats } from "../../save/runSaveSchema.js";
import { gameSettings, getWordFavoriteButtonEnabled } from "../../settings/gameSettings.js";
import {
  getFavoriteWords,
  isWordFavorited,
  removeWordFavorite,
  toggleWordFavorite,
} from "../../vocabulary/wordFavorites.js";

/**
 * @param {Object} options
 * @param {() => number} [options.getSaveSlotIndex]
 * @param {import('vue').ComputedRef<string | null> | import('vue').Ref<string | null>} options.resolvedWordForSubmit
 * @param {import('vue').ComputedRef<boolean> | import('vue').Ref<boolean>} options.showWordDefinitionTrigger
 * @param {import('vue').ComputedRef<'button' | 'definition'> | import('vue').Ref<'button' | 'definition'>} options.wordDefinitionTriggerMode
 * @param {import('vue').ComputedRef<string> | import('vue').Ref<string>} options.wordDefinitionPreviewLine
 * @param {() => readonly string[]} [options.getDefinitionLines]
 */
export function useWordFavoriteController(options) {
  const patchActiveSlotCareer = inject("patchActiveSlotCareer", null);
  const careerRevision = ref(0);

  /** @param {number} [slotIndex] */
  function readCareer(slotIndex = options.getSaveSlotIndex?.() ?? 0) {
    return normalizeSlotCareerStats(getSlotCareer(slotIndex) ?? createEmptySlotCareerStats());
  }

  const showLayerFavoriteButton = computed(() => {
    void gameSettings.wordFavoriteButtonEnabled;
    return getWordFavoriteButtonEnabled();
  });

  const showInlineFavoriteButton = computed(() => {
    void gameSettings.wordFavoriteButtonEnabled;
    if (!getWordFavoriteButtonEnabled()) return false;
    if (options.showWordDefinitionTrigger.value !== true) return false;
    if (options.wordDefinitionTriggerMode.value !== "definition") return false;
    return String(options.wordDefinitionPreviewLine.value ?? "").trim().length > 0;
  });

  const currentWordFavorited = computed(() => {
    void careerRevision.value;
    const word = options.resolvedWordForSubmit.value;
    if (!word) return false;
    return isWordFavorited(readCareer(), word);
  });

  const favoriteWords = computed(() => {
    void careerRevision.value;
    const list = getFavoriteWords(readCareer());
    return [...list].sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
  });

  const favoriteWordCount = computed(() => favoriteWords.value.length);

  function bumpCareerRevision() {
    careerRevision.value += 1;
  }

  function toggleCurrentWordFavorite() {
    const word = options.resolvedWordForSubmit.value;
    if (!word || typeof patchActiveSlotCareer !== "function") return;
    const definitionLines = [...(options.getDefinitionLines?.() ?? [])];
    patchActiveSlotCareer((career) => {
      toggleWordFavorite(career, { word, definitionLines });
    });
    bumpCareerRevision();
  }

  /**
   * @param {string} word
   */
  function removeFavoriteWord(word) {
    if (typeof patchActiveSlotCareer !== "function") return;
    patchActiveSlotCareer((career) => {
      removeWordFavorite(career, word);
    });
    bumpCareerRevision();
  }

  return {
    careerRevision,
    showInlineFavoriteButton,
    showLayerFavoriteButton,
    currentWordFavorited,
    favoriteWords,
    favoriteWordCount,
    toggleCurrentWordFavorite,
    removeFavoriteWord,
    bumpCareerRevision,
  };
}
