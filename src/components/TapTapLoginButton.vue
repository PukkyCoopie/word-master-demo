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
      decoding="sync"
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
  width: 75%;
  margin: 0 auto;
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
  width: 100%;
  height: auto;
  min-height: calc(v-bind(buttonHeightRpx) * var(--rpx));
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
