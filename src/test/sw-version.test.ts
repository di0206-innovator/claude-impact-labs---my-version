import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateServiceWorker, getBuildSha } from "../../scripts/generate-sw";

describe("Service Worker Cache Versioning", () => {
  it("computes a valid build SHA", () => {
    const sha = getBuildSha();
    expect(sha).toBeDefined();
    expect(sha.length).toBeGreaterThanOrEqual(4);
  });

  it("dynamically versions CACHE_NAME in public/sw.js based on input SHA", () => {
    const testSha = "testsha999";
    const cacheName = generateServiceWorker(testSha);
    expect(cacheName).toBe("rastabaaz-shell-testsha999");

    const swContent = fs.readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
    expect(swContent).toContain('const CACHE_NAME = "rastabaaz-shell-testsha999";');
    expect(swContent).toContain('keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))');

    // Restore standard generation
    generateServiceWorker();
  });
});
