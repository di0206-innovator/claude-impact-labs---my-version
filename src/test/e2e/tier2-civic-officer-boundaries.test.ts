import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { WardEngineerQueue } from "@/app/wards/[code]/queue";
import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";
import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";
import { getSpendVsNeedReport } from "@/lib/priority/score";
import { loadDataset } from "@/lib/rupee/load";
import {
  adjustForSample,
  bandOf,
  costPart,
  durabilityPart,
  overallOf,
  PRIOR_JOBS,
  WEIGHTS,
} from "@/lib/rupee/scorecard/score";
import { templateVoices, voicePacket, voicePreview, wardForPost } from "@/lib/rupee/voices";
import { setupTestRepo, teardownTestRepo } from "./e2e-helpers";

describe("Tier 2 Civic Officer & Analytics Boundaries (Features 12, 13, 14, 15)", () => {
  const ds = loadDataset();

  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 12: BMC Ward Triage Boundaries", () => {
    it("returns empty queue when filtered by nonexistent ward code", () => {
      const items = listActionQueueItems("ZZZ");
      expect(items).toEqual([]);
    });

    it("returns zeroed summary metrics for nonexistent ward filter", () => {
      const summary = getActionQueueSummary("ZZZ");
      expect(summary.totalItems).toBe(0);
      expect(summary.criticalCount).toBe(0);
      expect(summary.highCount).toBe(0);
      expect(summary.mediumCount).toBe(0);
      expect(summary.totalAtRiskInr).toBe(0);
      expect(summary.auditFlagAtRiskInr).toBe(0);
    });

    it("verifies queue items are strictly ordered: critical -> high -> medium", () => {
      const items = listActionQueueItems();
      const rank = { critical: 0, high: 1, medium: 2 };
      for (let i = 0; i < items.length - 1; i++) {
        expect(rank[items[i].priority]).toBeLessThanOrEqual(rank[items[i + 1].priority]);
      }
    });

    it("deduplicates total amount at risk across entities with multiple audit flags", () => {
      const items = listActionQueueItems();
      const rawSum = items.reduce((sum, i) => sum + i.amountAtRiskInr, 0);
      const summary = getActionQueueSummary();
      expect(summary.totalAtRiskInr).toBeGreaterThan(0);
      expect(summary.auditFlagAtRiskInr).toBeGreaterThan(0);
      expect(summary.totalAtRiskInr).toBeLessThanOrEqual(rawSum);
    });

    it("renders WardEngineerQueue with zero items in clean empty state", () => {
      render(
        React.createElement(WardEngineerQueue, {
          wardCode: "ZZ",
          wardName: "Test Empty Ward",
          items: [],
        }),
      );
      expect(screen.getByText(/Ward Engineer Action Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Empty Ward/i)).toBeInTheDocument();
    });
  });

  describe("Feature 13: Budget Allocation & Scoring Boundaries", () => {
    it("zero budget envelope allocates zero rupees and funds zero corridors", () => {
      const scenarios = generateBudgetScenarios(0);
      const balanced = scenarios.find((s) => s.id === "balanced");
      expect(balanced).toBeDefined();
      expect(balanced?.allocatedInr).toBe(0);
      expect(balanced?.roadsFundedCount).toBe(0);
    });

    it("negative budget envelope funds zero corridors gracefully", () => {
      const scenarios = generateBudgetScenarios(-10_000_000);
      for (const s of scenarios) {
        expect(s.allocatedInr).toBe(0);
        expect(s.roadsFundedCount).toBe(0);
      }
    });

    it("extreme large budget envelope caps allocation at available corridor need", () => {
      const scenarios = generateBudgetScenarios(10_000_000_000);
      const balanced = scenarios.find((s) => s.id === "balanced");
      expect(balanced).toBeDefined();
      expect(balanced!.roadsFundedCount).toBeGreaterThan(50);
      expect(balanced!.allocatedInr).toBeLessThanOrEqual(10_000_000_000);
    });

    it("handles all-zero custom priority weights without divide-by-zero NaN errors", () => {
      const ranked = rankRoadPriorities({
        vulnerability: 0,
        safety: 0,
        deficit: 0,
        burden: 0,
        equity: 0,
      });
      expect(ranked.length).toBeGreaterThan(0);
      for (const r of ranked) {
        expect(Number.isFinite(r.compositeScore)).toBe(true);
        expect(r.compositeScore).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns empty ranking array when filtering priorities by invalid ward", () => {
      const ranked = rankRoadPriorities(undefined, "INVALID_WARD_99");
      expect(ranked).toEqual([]);
    });

    it("Stage 1 (Diagnose): verifies every ward exhibits finite need and disparity scores", () => {
      const report = getSpendVsNeedReport();
      expect(report.wards.length).toBe(24);
      for (const w of report.wards) {
        expect(Number.isFinite(w.needScore)).toBe(true);
        expect(Number.isFinite(w.disparityIndex)).toBe(true);
      }
    });
  });

  describe("Feature 14: Contractor Score Recalibration & Penalties", () => {
    const dummyBuckets = { reopenRate: () => 0.1, slaMissRate: () => 0.2 };

    it("100% rework failure penalty scales durability score to minimum band", () => {
      const allReopened = Array.from({ length: 20 }, () => ({
        method: "Patchwork",
        stress: "Low",
        reopened: true,
        slaMet: true,
        costRatio: 1.0,
        overBilled: false,
      })) as any;
      const res = durabilityPart(allReopened, dummyBuckets);
      expect(res.actualRate).toBe(1.0);
      expect(res.score).toBeLessThan(15);
    });

    it("extreme overbilling outlier penalty scales cost score down severely", () => {
      const severeOverbill = Array.from({ length: 20 }, () => ({
        method: "Mastic",
        stress: "High",
        reopened: false,
        slaMet: true,
        costRatio: 5.0,
        overBilled: true,
      })) as any;
      const res = costPart(severeOverbill, 0.05);
      expect(res.score).toBeLessThan(25);
    });

    it("Bayesian shrinkage: zero jobs pulls raw score of 100 exactly to prior score 50", () => {
      const shrunk = adjustForSample(100, 0);
      expect(shrunk).toBe(50);
    });

    it("enforces sample size boundary: <20 jobs is 'Limited data', >=20 unlocks tiers", () => {
      expect(bandOf(85, PRIOR_JOBS - 1)).toBe("Limited data");
      expect(bandOf(85, PRIOR_JOBS)).toBe("Strong");
    });

    it("evaluates score band boundary transitions (39.9 vs 40 and 59.9 vs 60)", () => {
      expect(bandOf(39.9, 25)).toBe("Needs attention");
      expect(bandOf(40.0, 25)).toBe("As expected");
      expect(bandOf(59.9, 25)).toBe("As expected");
      expect(bandOf(60.0, 25)).toBe("Strong");
    });

    it("verifies mathematical weight invariants for composite contractor score", () => {
      const sumWeights = WEIGHTS.durability + WEIGHTS.cost + WEIGHTS.speed;
      expect(sumWeights).toBeCloseTo(1.0, 5);
      expect(overallOf(0, 0, 0)).toBe(0);
      expect(overallOf(100, 100, 100)).toBe(100);
    });
  });

  describe("Feature 15: Social Signal & Geocoding Boundaries", () => {
    it("returns null when post text lacks recognizable Mumbai locality names", () => {
      expect(wardForPost("Just a general rant with no place or street name")).toBeNull();
      expect(wardForPost("Why is traffic so terrible today?")).toBeNull();
    });

    it("returns null for empty or whitespace-only social post text", () => {
      expect(wardForPost("")).toBeNull();
      expect(wardForPost("    \n\t   ")).toBeNull();
    });

    it("resolves to ward of the longest matched locality when multiple match", () => {
      const ward = wardForPost("Driving from Bandra to Bandra West station");
      expect(ward).toBe("H/W");
    });

    it("returns empty lines array when requesting voice packet for invalid ward code", () => {
      const packet = voicePacket(ds, "UNKNOWN_WARD");
      expect(packet.ward).toBe("UNKNOWN_WARD");
      expect(packet.lines).toEqual([]);
    });

    it("generates fallback text when voice packet has no complaint or social lines", () => {
      const text = templateVoices({ ward: "ZZ", lines: [] });
      expect(text).toContain("ZZ ward has no complaint text or social post");
    });

    it("voicePreview returns empty array when given empty voice lines array", () => {
      expect(voicePreview([])).toEqual([]);
    });
  });
});
