import { createApp } from "vue";
import "remixicon/fonts/remixicon.css";
import "../css/game.css";
import App from "./App.vue";
import { warmupAllReglMaterialHubs } from "./lib/reglMaterialWarmup.js";

warmupAllReglMaterialHubs();

document.addEventListener("contextmenu", (e) => e.preventDefault(), { capture: true });

const app = createApp(App);
app.mount("#app");
