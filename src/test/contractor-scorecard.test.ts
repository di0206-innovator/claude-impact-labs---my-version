import { describe, expect, it } from "vitest";
import { loadDataset } from "@/lib/rupee/load";
import { buildScorecards, getScorecards, ratioScore } from "@/lib/rupee/scorecard";
import { overallOf } from "@/lib/rupee/scorecard/score";

describe("Contractor Scorecard Recalibration & Dynamic Range", () => {
  it("computes ratioScore using a piecewise linear transfer function", () => {
    expect(ratioScore(0)).toBe(100);
    expect(ratioScore(0.5)).toBe(75);
    expect(ratioScore(1.0)).toBe(50);
    expect(ratioScore(1.5)).toBe(25);
    expect(ratioScore(2.0)).toBe(0);
    expect(ratioScore(2.5)).toBe(0);
    expect(ratioScore(10)).toBe(0);
  });

  it("applies repeat billing and audit flag deductions in overallOf", () => {
    // Zero penalties
    const base = overallOf(100, 100, 100, 0, 0);
    expect(base).toBe(100);

    // Partial penalties
    const withPenalties = overallOf(100, 100, 100, 0.1, 10);
    // repeatPenalty = 0.1 * 30 = 3, flagPenalty = 10 * 0.2 = 2 => deduction = 5
    expect(withPenalties).toBe(95);

    // Capped penalties at 15 each (30 total)
    const heavyPenalties = overallOf(100, 100, 100, 1.0, 200);
    expect(heavyPenalties).toBe(70);

    // Floor at 0
    const zeroFloor = overallOf(10, 10, 10, 1.0, 200);
    expect(zeroFloor).toBe(0);
  });

  it("expands dynamic range across all 8 contractors without score compression", () => {
    const ds = loadDataset();
    const sc = buildScorecards(ds);
    expect(sc.cards).toHaveLength(8);

    const scoresByName = new Map(sc.cards.map((c) => [c.name, c]));

    // Top contractors remain in "Strong" band (>= 60)
    const deccan = scoresByName.get("Deccan Paving Solutions");
    expect(deccan).toBeDefined();
    expect(deccan!.overall).toBeGreaterThanOrEqual(60);
    expect(deccan!.band).toBe("Strong");

    const sahyadri = scoresByName.get("Sahyadri Infra Works");
    expect(sahyadri).toBeDefined();
    expect(sahyadri!.overall).toBeGreaterThanOrEqual(60);
    expect(sahyadri!.band).toBe("Strong");

    // Chronically failing contractors drop below 40 into "Needs attention"
    const mahalaxmi = scoresByName.get("Mahalaxmi Civil Contractors");
    expect(mahalaxmi).toBeDefined();
    expect(mahalaxmi!.overall).toBeLessThan(40);
    expect(mahalaxmi!.band).toBe("Needs attention");

    const arabian = scoresByName.get("Arabian Sea Engineering");
    expect(arabian).toBeDefined();
    expect(arabian!.overall).toBeLessThan(40);
    expect(arabian!.band).toBe("Needs attention");

    const western = scoresByName.get("Western Coast Asphalt Co");
    expect(western).toBeDefined();
    expect(western!.overall).toBeLessThan(40);
    expect(western!.band).toBe("Needs attention");

    // Middle contractors occupy "As expected" band
    const mithi = scoresByName.get("Mithi Infra Projects");
    expect(mithi).toBeDefined();
    expect(mithi!.overall).toBeGreaterThanOrEqual(40);
    expect(mithi!.overall).toBeLessThan(60);
    expect(mithi!.band).toBe("As expected");

    // Confirm range spans at least 40 points
    const maxScore = Math.max(...sc.cards.map((c) => c.overall));
    const minScore = Math.min(...sc.cards.map((c) => c.overall));
    expect(maxScore - minScore).toBeGreaterThanOrEqual(40);
  });

  it("getScorecards returns valid ranked set with correct band distribution", () => {
    const sc = getScorecards();
    const bands = sc.cards.map((c) => c.band);
    expect(bands).toContain("Strong");
    expect(bands).toContain("As expected");
    expect(bands).toContain("Needs attention");
  });
});
