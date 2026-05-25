<template>
  <button
    type="button"
    class="taptap-login-btn"
    :disabled="disabled"
    :aria-busy="disabled || undefined"
    aria-label="TapTap 登录"
    @click="$emit('click')"
  >
    <img
      v-if="!imageMissing"
      class="taptap-login-btn__art"
      :src="TAP_TAP_LOGIN_BUTTON_SRC"
      alt=""
      aria-hidden="true"
      draggable="false"
      @error="imageMissing = true"
    />
  </button>
</template>

<script setup>
import { ref } from "vue";
import {
  TAP_TAP_LOGIN_BUTTON_HEIGHT_RPX,
  TAP_TAP_LOGIN_BUTTON_SRC,
} from "../taptap/tapTapLoginButtonAssets.js";

defineProps({
  disabled: { type: Boolean, default: false },
});

defineEmits(["click"]);

const imageMissing = ref(false);
const buttonHeightRpx = TAP_TAP_LOGIN_BUTTON_HEIGHT_RPX;
</script>

<style scoped>
.taptap-login-btn {
  display: block;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  line-height: 0;
  box-shadow: none;
  filter: none;
}

.taptap-login-btn:disabled {
  cursor: wait;
  opacity: 0.55;
}

.taptap-login-btn__art {
  display: block;
  height: calc(v-bind(buttonHeightRpx) * var(--rpx));
  width: auto;
  max-width: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
