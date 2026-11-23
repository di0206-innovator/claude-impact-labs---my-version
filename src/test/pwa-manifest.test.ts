import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("PWA manifest and service worker assets", () => {
  it("exposes a valid standalone web app manifest for Rastabaaz", () => {
    const m = manifest();
    expect(m.short_name).toBe("Rastabaaz");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#064E4B");
    expect(m.background_color).toBe("#064E4B");
    expect(m.start_url).toBe("/");
    expect(m.icons?.some((i) => i.sizes === "192x192")).toBe(true);
    expect(m.icons?.some((i) => i.sizes === "512x512")).toBe(true);
    expect(m.shortcuts?.some((s) => s.url === "/report")).toBe(true);
  });

  it("ships service worker and required PNG app icons in public/", () => {
    expect(existsSync("public/sw.js")).toBe(true);
    expect(existsSync("public/icons/icon-192.png")).toBe(true);
    expect(existsSync("public/icons/icon-512.png")).toBe(true);
    expect(existsSync("public/icons/apple-touch-icon.png")).toBe(true);
  });
});
