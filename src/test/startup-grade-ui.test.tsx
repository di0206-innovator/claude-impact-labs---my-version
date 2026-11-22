import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return readFileSync(relPath, "utf8");
}

describe("startup-grade UI/UX overhaul invariants", () => {
  it("defines complete glassmorphic surface tokens and classes", () => {
    const tokens = read("src/styles/tokens.css");
    const motion = read("src/styles/motion.css");

    expect(tokens).toMatch(/--glass-bg:/);
    expect(tokens).toMatch(/--glass-bg-elevated:/);
    expect(tokens).toMatch(/--glass-blur:\s*blur\(16px\)/);
    expect(tokens).toMatch(/--glass-shadow-floating:/);

    expect(motion).toMatch(/\.rb-glass\s*\{[^}]*backdrop-filter/);
    expect(motion).toMatch(/\.rb-glass-elevated\s*\{[^}]*backdrop-filter/);
    expect(motion).toMatch(/\.rb-glass-floating\s*\{[^}]*backdrop-filter/);
    expect(motion).toMatch(/\.rb-glass-card\s*\{[^}]*backdrop-filter/);
  });

  it("implements scroll-driven parallax effects and smooth accordion keyframes", () => {
    const motion = read("src/styles/motion.css");

    expect(motion).toMatch(/@supports\s*\(\s*animation-timeline:\s*scroll\(\)\s*\)/);
    expect(motion).toMatch(/\.rb-parallax-hero\s*\{/);
    expect(motion).toMatch(/\.rb-parallax-card\s*\{/);
    expect(motion).toMatch(/@keyframes\s+rb-parallax-float/);

    expect(motion).toMatch(/rb-accordion-expand/);
    expect(motion).toMatch(/\.rb-accordion\s+details\[open\]\s*>\s*\.ux4g-accordion__body/);
  });

  it("enforces crisp Geist/Inter typography scale with monospace figure accents", () => {
    const tokens = read("src/styles/tokens.css");
    const motion = read("src/styles/motion.css");

    expect(tokens).toMatch(/--font-ui:[^;]*Inter/);
    expect(tokens).toMatch(/--font-figure:[^;]*Geist Mono/);

    expect(motion).toMatch(/\.rb-tabular-nums\s*\{[^}]*tabular-nums/);
    expect(motion).toMatch(/\.rb-font-mono\s*\{[^}]*var\(--font-figure\)/);
  });

  it("provides priority road pulse beacons and live status indicators", () => {
    const motion = read("src/styles/motion.css");
    const mapSheet = read("src/styles/map-sheet.css");
    const mapLayers = read("src/components/map/map-layers.ts");

    expect(motion).toMatch(/\.rb-pulse-beacon/);
    expect(motion).toMatch(/@keyframes\s+rb-beacon-ring/);
    expect(motion).toMatch(/\.rb-pulse-dot/);
    expect(motion).toMatch(/@keyframes\s+rb-pulse-subtle/);

    expect(mapSheet).toMatch(/\.rb-band-high\s*\{[^}]*box-shadow/);
    expect(mapLayers).toMatch(/PULSE_HALO_LAYER/);
  });

  it("upgrades mobile tab bar to frosted glass floating drawer", () => {
    const nav = read("src/styles/nav.css");
    const mobileBlock = nav.slice(nav.search(/@media\s*\(\s*max-width:\s*47\.99rem\s*\)/));

    expect(mobileBlock).toMatch(/\.rb-nav\s*\{[^}]*backdrop-filter:\s*var\(--glass-blur\)/);
    expect(mobileBlock).toMatch(/\.rb-nav\s*\{[^}]*background:\s*var\(--glass-bg-elevated\)/);
    expect(mobileBlock).toMatch(/\.rb-nav-link:active\s*\{[^}]*transform:\s*scale\(/);
  });

  it("strictly disables all parallax, motion, and accordion animations under reduced motion", () => {
    const motion = read("src/styles/motion.css");
    const reducedBlock = motion.slice(motion.search(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/));

    expect(reducedBlock).toMatch(/\.rb-parallax-hero/);
    expect(reducedBlock).toMatch(/\.rb-parallax-card/);
    expect(reducedBlock).toMatch(/\.rb-pulse-beacon/);
    expect(reducedBlock).toMatch(/\.rb-pulse-dot/);
    expect(reducedBlock).toMatch(/rb-accordion-expand|ux4g-accordion__body/);
    expect(reducedBlock).toMatch(/animation:\s*none\s*!important/);
  });
});
