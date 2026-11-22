import type { Map as MapLibreMap } from "maplibre-gl";

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function goTo(map: MapLibreMap, center: [number, number], zoom: number) {
  const camera = { center, zoom };
  if (prefersReducedMotion()) {
    map.jumpTo(camera);
  } else {
    map.flyTo({
      ...camera,
      duration: 1100,
      curve: 1.42,
      speed: 1.15,
      essential: true,
      easing: (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    });
  }
}
