import { ref } from "vue";

export const tapTapEngagementLayerOpen = ref(false);
export const tapTapEngagementShowIntro = ref(false);

/**
 * @param {{ showIntroQuestion?: boolean }} [options]
 */
export function openTapTapEngagementLayer(options = {}) {
  tapTapEngagementShowIntro.value = Boolean(options.showIntroQuestion);
  tapTapEngagementLayerOpen.value = true;
}

export function closeTapTapEngagementLayer() {
  tapTapEngagementLayerOpen.value = false;
  tapTapEngagementShowIntro.value = false;
}
