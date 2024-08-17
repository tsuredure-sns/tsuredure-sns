import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
});
console.log("crossOriginIsolated", window.crossOriginIsolated);
