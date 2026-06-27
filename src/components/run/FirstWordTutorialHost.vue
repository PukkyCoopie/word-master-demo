<script setup>
import { inject, reactive, ref } from "vue";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import FirstWordTutorialLayer from "../tutorial/FirstWordTutorialLayer.vue";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
if (!session?.ui?.firstWordTutorial) {
  throw new Error("FirstWordTutorialHost: session.ui.firstWordTutorial missing");
}

/** session.ui 为 plain object，嵌套 ref/computed 在 template 中须 reactive 解包 */
const tutorial = reactive(session.ui.firstWordTutorial);

const layerRef = ref(null);

defineExpose({
  fadeOutAndWait: () => layerRef.value?.fadeOutAndWait?.(),
});
</script>

<template>
  <FirstWordTutorialLayer
    ref="layerRef"
    :open="tutorial.layerOpen"
    :phase="tutorial.phase"
    :holes="tutorial.holes"
    :show-hint="tutorial.showHint"
    :show-continue-button="tutorial.showContinueButton"
    :hint-text="tutorial.hintText"
    :stack-z="tutorial.stackZ"
    :arrow-target="tutorial.arrowTarget"
    :skip-button-rect="tutorial.skipButtonRect"
    @skip="tutorial.onSkip()"
    @continue="tutorial.onContinue()"
    @fade-complete="tutorial.onFadeComplete()"
  />
</template>
