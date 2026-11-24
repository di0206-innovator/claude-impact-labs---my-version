// maplibre-gl 6 starts its web worker from a URL built at runtime next to its
// own module file. Bundlers rename and move that file, so the URL 404s and the
// map's GeoJSON layers never render. Serving the worker and the shared chunk it
// imports from `public/maplibre/` gives `setWorkerUrl` a stable address.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "maplibre");

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  const sourcePath = join(from, file);
  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, join(to, file));
  }
}
