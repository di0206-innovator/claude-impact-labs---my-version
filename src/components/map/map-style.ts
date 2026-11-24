import type { StyleSpecification } from "maplibre-gl";

export type MarkerColors = {
  enamel: string;
  dark: string;
  oxide: string;
  marking: string;
  card: string;
};

const FALLBACK: MarkerColors = {
  enamel: "#4a2bc2",
  dark: "#171717",
  oxide: "#db372d",
  marking: "#ffab27",
  card: "#ffffff",
};

export function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function readMarkerColors(): MarkerColors {
  return {
    enamel: token("--enamel", FALLBACK.enamel),
    dark: token("--asphalt", FALLBACK.dark),
    oxide: token("--oxide", FALLBACK.oxide),
    marking: token("--marking", FALLBACK.marking),
    card: token("--card", FALLBACK.card),
  };
}

export function osmStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {
          "raster-saturation": -0.36,
          "raster-contrast": 0.04,
          "raster-brightness-min": 0.05,
          "raster-brightness-max": 0.98,
          "raster-opacity": 0.96,
        },
      },
    ],
  };
}
