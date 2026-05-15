import "remixicon/fonts/remixicon.css";

const LOGIC_W = 750;
const LOGIC_H = 1500;

function setScale() {
  const scale = Math.min(
    window.innerWidth / LOGIC_W,
    window.innerHeight / LOGIC_H
  );
  document.documentElement.style.setProperty("--scale", String(scale));
}

setScale();
window.addEventListener("resize", setScale);
