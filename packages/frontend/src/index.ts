import { registerSW } from "virtual:pwa-register";

registerSW();
console.log("crossOriginIsolated", window.crossOriginIsolated);
