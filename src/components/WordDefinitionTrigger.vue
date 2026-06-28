<template>
  <Transition
    name="word-definition-trigger"
    mode="out-in"
    appear
  >
    <div
      v-if="visible && showIconOnlyButton"
      key="icon"
      class="word-definition-trigger-item"
    >
      <button
        type="button"
        class="word-definition-btn word-definition-btn--icon-only"
        :aria-label="ariaLabel"
        @click="emit('open')"
      >
        <i class="ri-translate-2 word-definition-btn__icon" aria-hidden="true" />
      </button>
    </div>
    <div
      v-else-if="visible && showPreviewBar"
      key="preview"
      class="word-definition-trigger-item"
    >
      <button
        ref="previewBarRef"
        type="button"
        class="word-definition-preview-bar"
        :style="previewBarStyle"
        :aria-label="ariaLabel"
        @click="emit('open')"
      >
        <span class="word-definition-preview-icon" aria-hidden="true">
          <i class="ri-translate-2" />
        </span>
        <span class="word-definition-preview-text">{{ previewLine }}</span>
        <Transition
          name="word-definition-pill"
          @after-enter="syncPreviewBarWidth"
          @after-leave="syncPreviewBarWidth"
        >
          <span v-if="showExtraPill" class="word-definition-extra-pill">+{{ extraCount }}</span>
        </Transition>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps({
  visible: { type: Boolean, default: true },
  mode: { type: String, required: true },
  word: { type: String, default: "" },
  previewLine: { type: String, default: "" },
  extraCount: { type: Number, default: 0 },
  buttonVisible: { type: Boolean, default: true },
});

const emit = defineEmits(["open"]);

const hasPreviewLine = computed(() => String(props.previewLine ?? "").length > 0);

const showIconOnlyButton = computed(() => {
  if (!props.buttonVisible) return false;
  if (props.mode === "button") return true;
  return props.mode === "definition" && !hasPreviewLine.value;
});

const showPreviewBar = computed(
  () => props.buttonVisible && props.mode === "definition" && hasPreviewLine.value,
);

const showExtraPill = computed(
  () => props.mode === "definition" && props.extraCount > 0 && showPreviewBar.value,
);

const ariaLabel = computed(() => {
  const w = String(props.word ?? "").trim();
  if (props.mode === "definition" && props.previewLine) {
    return w ? `${w}：${props.previewLine}` : props.previewLine;
  }
  return w ? `查看 ${w} 的释义` : "查看释义";
});

const previewBarRef = ref(null);
const previewBarWidthPx = ref(0);

const previewBarStyle = computed(() => {
  if (!showPreviewBar.value || previewBarWidthPx.value <= 0) {
    return { width: "0px" };
  }
  return { width: `${previewBarWidthPx.value}px` };
});

/** @param {HTMLElement} el */
function measureNaturalBarWidth(el) {
  const clone = /** @type {HTMLElement} */ (el.cloneNode(true));
  clone.style.width = "auto";
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.left = "-100vw";
  clone.style.top = "0";
  clone.style.height = "auto";
  clone.setAttribute("aria-hidden", "true");
  document.body.appendChild(clone);
  const measured = Math.ceil(clone.getBoundingClientRect().width);
  clone.remove();
  return measured;
}

/** @param {number} measured */
function applyPreviewBarWidth(measured) {
  if (measured === previewBarWidthPx.value) return;
  requestAnimationFrame(() => {
    previewBarWidthPx.value = measured;
  });
}

/** @param {HTMLElement | null | undefined} el */
function measurePreviewBarWidth(el) {
  if (!(el instanceof HTMLElement) || !showPreviewBar.value) {
    previewBarWidthPx.value = 0;
    return;
  }
  applyPreviewBarWidth(measureNaturalBarWidth(el));
}

async function syncPreviewBarWidth() {
  await nextTick();
  measurePreviewBarWidth(previewBarRef.value);
}

watch(
  () => [props.previewLine, props.extraCount, showPreviewBar.value, showExtraPill.value],
  () => {
    void syncPreviewBarWidth();
  },
  { flush: "post" },
);

watch(previewBarRef, (el, _, onCleanup) => {
  if (!(el instanceof HTMLElement) || typeof ResizeObserver === "undefined") return;
  const ro = new ResizeObserver(() => {
    measurePreviewBarWidth(el);
  });
  ro.observe(el);
  measurePreviewBarWidth(el);
  onCleanup(() => ro.disconnect());
});
</script>
