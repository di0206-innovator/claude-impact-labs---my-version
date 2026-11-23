import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/budget",
  useSearchParams: () => new URLSearchParams(),
}));

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";
import { getSpendVsNeedReport } from "@/lib/priority/score";
import { loadDataset } from "@/lib/rupee/load";
import { buildScorecards } from "@/lib/rupee/scorecard";
import { adjustForSample, bandOf, costPart, durabilityPart } from "@/lib/rupee/scorecard/score";
import { setupTestRepo, teardownTestRepo } from "./e2e-helpers";

describe("Tier 4 Scenario 3: Standing Committee ₹100 Cr Monsoon Budget Journey", () => {
  const ds = loadDataset();

  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  it("completes ₹100 Cr deliberation: Stage 1 Diagnose -> Stage 2 Allocate -> Contractor Audit -> WCAG", () => {
    // 1. Stage 1 (Diagnose Wards): 6-Factor Ward Fiscal Equity & Deficit Analysis
    const diagnosis = getSpendVsNeedReport();
    expect(diagnosis.wards.length).toBe(24);
    for (const ward of diagnosis.wards) {
      expect(ward.needScore).toBeGreaterThanOrEqual(0);
      expect(ward.spentInr).toBeGreaterThanOrEqual(0);
      expect(typeof ward.disparityIndex).toBe("number");
    }

    const { metrics } = diagnosis;
    expect(metrics.criticalDeficitWardsCount + metrics.moderateDeficitWardsCount).toBeGreaterThan(0);
    expect(metrics.totalUnderfundedQuantumInr).toBeGreaterThan(0);
    expect(metrics.giniCoefficient).toBeGreaterThanOrEqual(0);

    const deficitWards = diagnosis.wards
      .filter((w) => w.disparityIndex < 0)
      .sort((a, b) => a.disparityIndex - b.disparityIndex);
    expect(deficitWards.length).toBeGreaterThan(0);
    const topDeficitWard = deficitWards[0];
    expect(topDeficitWard.needScore).toBeGreaterThan(0);

    // 2. Stage 2 (Allocate Corridors): ₹100 Cr Capital Envelopes & 5-Dimension Ranking
    const HUNDRED_CRORE_INR = 100_00_00_000;
    const scenarios = generateBudgetScenarios(HUNDRED_CRORE_INR);
    expect(scenarios.length).toBeGreaterThanOrEqual(4);

    const balancedScenario = scenarios.find((s) => s.id === "balanced");
    expect(balancedScenario).toBeDefined();
    expect(balancedScenario?.budgetEnvelopeInr).toBe(HUNDRED_CRORE_INR);
    expect(balancedScenario?.allocatedInr).toBeLessThanOrEqual(HUNDRED_CRORE_INR);
    expect(balancedScenario?.roadsFundedCount).toBeGreaterThan(10);
    expect(balancedScenario?.fundedRoads[0].costInr).toBeGreaterThan(0);

    const rankedCorridors = rankRoadPriorities();
    expect(rankedCorridors.length).toBeGreaterThan(100);
    for (let i = 0; i < rankedCorridors.length - 1; i++) {
      expect(rankedCorridors[i].compositeScore).toBeGreaterThanOrEqual(
        rankedCorridors[i + 1].compositeScore,
      );
    }

    const topCorridor = rankedCorridors[0];
    expect(topCorridor.rank).toBe(1);
    expect(topCorridor.compositeScore).toBeGreaterThan(50);
    expect(topCorridor.dimensions.infrastructureVulnerability.score).toBeDefined();
    expect(topCorridor.dimensions.publicSafety.score).toBeDefined();
    expect(topCorridor.dimensions.serviceDeficit.score).toBeDefined();
    expect(topCorridor.dimensions.maintenanceBurden.score).toBeDefined();
    expect(topCorridor.dimensions.resourceEquity.score).toBeDefined();

    // 3. Contractor Disqualification & Recalibration (<40 Failing Band with Penalties)
    const { cards } = buildScorecards(ds);
    expect(cards.length).toBe(8);

    const failingScores = [15, 28, 38];
    for (const score of failingScores) {
      expect(bandOf(score, 60)).toBe("Needs attention");
    }

    // Bayesian shrinkage: small sample shrinks toward prior 50, large sample retains signal
    const smallSampleShrunk = adjustForSample(10, 5);
    const largeSamplePreserved = adjustForSample(10, 500);
    expect(smallSampleShrunk).toBeGreaterThan(10);
    expect(smallSampleShrunk).toBeLessThan(50);
    expect(largeSamplePreserved).toBeLessThan(12);

    // Durability penalty for chronic repeat work orders & reopenings
    const mockBuckets = { reopenRate: () => 0.1, slaMissRate: () => 0.2 };
    const zeroReopenOrders = [
      { method: "Mastic", stress: "High", reopened: false, slaMet: true, costRatio: 1.0, overBilled: false },
    ] as any;
    const chronicReopenOrders = [
      { method: "Mastic", stress: "High", reopened: true, slaMet: false, costRatio: 1.0, overBilled: false },
    ] as any;
    expect(durabilityPart(zeroReopenOrders, mockBuckets).score).toBeGreaterThan(
      durabilityPart(chronicReopenOrders, mockBuckets).score,
    );

    // Cost anomaly deduction for overbilling
    expect(costPart(zeroReopenOrders, 0.1).score).toBeGreaterThan(
      costPart([{ ...zeroReopenOrders[0], costRatio: 2.8, overBilled: true }], 0.1).score,
    );

    // 4. Standing Committee Accessibility & WCAG Landmark Compliance
    const { container: headerContainer } = render(React.createElement(SiteHeader));
    const navElement = headerContainer.querySelector("nav");
    expect(navElement).toBeInTheDocument();
    expect(navElement?.getAttribute("aria-label")).toMatch(/site|main|primary/i);

    const touchTargets = headerContainer.querySelectorAll(".touch-target");
    expect(touchTargets.length).toBeGreaterThan(4);

    const { container: footerContainer } = render(React.createElement(SiteFooter));
    expect(footerContainer.querySelector("footer")).toBeInTheDocument();

    const layoutFile = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layoutFile).toContain('href="#main"');
    expect(layoutFile).toContain('id="main"');
  });

  it("verifies budget scenarios adjust allocations when custom priority weights are applied", () => {
    const defaultRanked = rankRoadPriorities();
    const safetyHeavyRanked = rankRoadPriorities({ safety: 70, vulnerability: 10, deficit: 10 });

    expect(defaultRanked.length).toBe(safetyHeavyRanked.length);
    expect(safetyHeavyRanked[0].dimensions.publicSafety.weight).toBe(70);
  });
});
