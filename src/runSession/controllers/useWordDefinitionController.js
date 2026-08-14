import { computed, ref, watch } from "vue";
import { buildWordDefinitionPreview } from "../../dictionary/parseTranslationLines.js";
import { gameSettings } from "../../settings/gameSettings.js";
import { getSlotExperienceMode } from "../../profile/slotExperienceMode.js";
import { shouldShowWordDefinitionDuringTutorial } from "../../tutorial/firstWordTutorialCasualFlow.js";
import {
  notifyOwnedTreasuresOnWordDefinitionOpenAttempt,
  resolveWordDefinitionTriggerMode,
} from "../../treasures/treasureRegistry.js";

/**
 * 词义层与行内释义触发区（playfield presentation）。
 *
 * @param {Object} options
 * @param {import('vue').Ref<boolean>} options.firstWordTutorialActive
 * @param {() => string | null | undefined} [options.getFirstWordTutorialPhase]
 * @param {() => number} [options.getSaveSlotIndex]
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} options.dictionaryReady
 * @param {import('vue').ComputedRef<string | null>} options.resolvedWordForSubmit
 * @param {import('vue').ComputedRef<string>} options.effectiveWordForSubmit
 * @param {() => readonly string[]} options.getOwnedSlotTreasureIds
 * @param {() => Record<string, unknown>} options.ownedTreasureHookFxBridge
 * @param {(word: string) => unknown} options.getWordDefinition
 * @param {(kind: string) => void} options.triggerHaptic
 * @param {import('vue').Ref<string | null> | import('vue').ComputedRef<string | null> | (() => string | null | undefined)} [options.getPreferredDefinitionPosKey]
 *   棘梅 Boss 等：优先展示该词性释义（`n` | `v` | `adj`）
 */
export function useWordDefinitionController(options) {
  const wordDefinitionLayerOpen = ref(false);
  /** 提交记分 / 丢弃离场时与字母动画同步隐藏释义区（selectedTiles 仍保留至退场结束） */
  const wordDefinitionHiddenForWordLeave = ref(false);

  const wordDefinitionDisplayMode = computed(() => {
    const mode = gameSettings.wordDefinitionMode;
    return mode === "off" || mode === "button" || mode === "definition" ? mode : "definition";
  });

  function allowWordDefinitionDuringTutorial() {
    if (!options.firstWordTutorialActive.value) return true;
    const phase = options.getFirstWordTutorialPhase?.() ?? null;
    const slotIx = options.getSaveSlotIndex?.() ?? 0;
    return shouldShowWordDefinitionDuringTutorial(phase, getSlotExperienceMode(slotIx));
  }

  const wordDefinitionZoneVisible = computed(
    () =>
      allowWordDefinitionDuringTutorial() &&
      wordDefinitionDisplayMode.value !== "off" &&
      options.dictionaryReady.value &&
      options.effectiveWordForSubmit.value.length > 0,
  );

  const showWordDefinitionTrigger = computed(
    () =>
      wordDefinitionZoneVisible.value &&
      options.resolvedWordForSubmit.value != null &&
      !wordDefinitionHiddenForWordLeave.value,
  );

  const wordDefinitionTriggerMode = computed(() =>
    resolveWordDefinitionTriggerMode(options.getOwnedSlotTreasureIds(), {
      displayMode: wordDefinitionDisplayMode.value,
    }),
  );

  function resolvePreferredDefinitionPosKey() {
    const src = options.getPreferredDefinitionPosKey;
    if (src == null) return null;
    if (typeof src === "function") return src() ?? null;
    return src.value ?? null;
  }

  const wordDefinitionPreviewBundle = computed(() => {
    const word = options.resolvedWordForSubmit.value;
    if (!word) {
      return { word: "", lines: [], previewLine: "", extraCount: 0 };
    }
    const def = options.getWordDefinition(word);
    const { lines, previewLine, extraCount } = buildWordDefinitionPreview(def, {
      preferredPosKey: resolvePreferredDefinitionPosKey(),
    });
    return { word, lines, previewLine, extraCount };
  });

  const wordDefinitionPreviewWord = computed(() => wordDefinitionPreviewBundle.value.word);
  const wordDefinitionPreviewLines = computed(() => wordDefinitionPreviewBundle.value.lines);
  const wordDefinitionPreviewLine = computed(() => wordDefinitionPreviewBundle.value.previewLine);
  const wordDefinitionExtraCount = computed(() => wordDefinitionPreviewBundle.value.extraCount);

  const layerOpenForPlayfield = computed(
    () => wordDefinitionLayerOpen.value && allowWordDefinitionDuringTutorial(),
  );

  function openWordDefinitionLayer() {
    if (!showWordDefinitionTrigger.value) return;
    options.triggerHaptic("tap");
    void (async () => {
      const blocked = await notifyOwnedTreasuresOnWordDefinitionOpenAttempt(
        options.getOwnedSlotTreasureIds(),
        {
          ...options.ownedTreasureHookFxBridge(),
          ownedSlotTreasureIds: options.getOwnedSlotTreasureIds(),
          word: wordDefinitionPreviewWord.value,
        },
      );
      if (blocked) return;
      wordDefinitionLayerOpen.value = true;
    })();
  }

  function closeWordDefinitionLayer() {
    wordDefinitionLayerOpen.value = false;
  }

  watch(showWordDefinitionTrigger, (visible) => {
    if (!visible) wordDefinitionLayerOpen.value = false;
  });

  return {
    wordDefinitionLayerOpen,
    wordDefinitionHiddenForWordLeave,
    wordDefinitionZoneVisible,
    showWordDefinitionTrigger,
    wordDefinitionTriggerMode,
    wordDefinitionPreviewWord,
    wordDefinitionPreviewLines,
    wordDefinitionPreviewLine,
    wordDefinitionExtraCount,
    layerOpenForPlayfield,
    openWordDefinitionLayer,
    closeWordDefinitionLayer,
  };
}
