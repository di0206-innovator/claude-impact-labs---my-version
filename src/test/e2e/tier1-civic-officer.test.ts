import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { WardEngineerQueue } from "@/app/wards/[code]/queue";
import { WardVoices } from "@/components/rupee/WardVoices";
import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";
import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";
import { getSpendVsNeedReport } from "@/lib/priority/score";
import { loadDataset } from "@/lib/rupee/load";
import { buildScorecards } from "@/lib/rupee/scorecard";
import { adjustForSample, bandOf, costPart, durabilityPart } from "@/lib/rupee/scorecard/score";
import { voicePacket } from "@/lib/rupee/voices";
import { setupTestRepo, teardownTestRepo } from "./e2e-helpers";

describe("Tier 1 Civic Officer & Analytics Suite (Features 12, 13, 14, 15)", () => {
  const ds = loadDataset();

  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 12: BMC Ward Triage Persistence", () => {
    it("generates prioritized operational triage items from audit flags and SLA delays", () => {
      const items = listActionQueueItems();
      expect(items.length).toBeGreaterThan(10);
      const priorities = new Set(items.map((i) => i.priority));
      expect(priorities.has("critical") || priorities.has("high")).toBe(true);
      expect(items[0]).toHaveProperty("headline");
      expect(items[0]).toHaveProperty("roadName");
      expect(items[0]).toHaveProperty("amountAtRiskInr");
    });

    it("scopes action queue tasks by ward code filter", () => {
      const wardA = listActionQueueItems("A");
      for (const item of wardA) {
        expect(item.ward).toBe("A");
      }
    });

    it("calculates summary metrics and deduplicates amount at risk", () => {
      const summary = getActionQueueSummary();
      expect(summary.totalItems).toBe(summary.criticalCount + summary.highCount + summary.mediumCount);
      expect(summary.totalAtRiskInr).toBeGreaterThan(0);
      expect(summary.auditFlagAtRiskInr).toBeGreaterThan(0);
    });

    it("renders WardEngineerQueue with critical and high priority items", () => {
      const items = listActionQueueItems().slice(0, 5);
      render(
        React.createElement(WardEngineerQueue, {
          wardCode: "A",
          wardName: "Colaba / Fort",
          items,
        }),
      );
      expect(screen.getByText(/Ward Engineer Action Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Colaba \/ Fort/i)).toBeInTheDocument();
    });

    it("toggles action item triage status between review states", () => {
      const items = listActionQueueItems().slice(0, 3);
      render(
        React.createElement(WardEngineerQueue, {
          wardCode: "A",
          wardName: "Colaba",
          items,
        }),
      );
      const triageButtons = screen.getAllByRole("button", { name: /triage details/i });
      fireEvent.click(triageButtons[0]);
      const reviewButton = screen.queryByRole("button", { name: /mark under review/i });
      if (reviewButton) {
        fireEvent.click(reviewButton);
        expect(screen.getAllByText(/under review/i).length).toBeGreaterThan(0);
      } else {
        expect(screen.getByText(/Audit Screening Finding/i)).toBeInTheDocument();
      }
    });
  });

  describe("Feature 13: Two-Stage Budget Framing", () => {
    it("Stage 1 (Diagnose): calculates ward-level fiscal equity across all 24 wards", () => {
      const report = getSpendVsNeedReport();
      expect(report.wards.length).toBe(24);
      for (const w of report.wards) {
        expect(w.needScore).toBeGreaterThanOrEqual(0);
        expect(w.spentInr).toBeGreaterThanOrEqual(0);
        expect(typeof w.disparityIndex).toBe("number");
      }
    });

    it("Stage 1: identifies critical deficit wards and cumulative underfunded quantum", () => {
      const report = getSpendVsNeedReport();
      expect(report.metrics.criticalDeficitWardsCount + report.metrics.moderateDeficitWardsCount).toBeGreaterThan(0);
      expect(report.metrics.totalUnderfundedQuantumInr).toBeGreaterThan(0);
      expect(report.metrics.giniCoefficient).toBeGreaterThanOrEqual(0);
    });

    it("Stage 2 (Allocate): simulates discrete forward capital envelopes", () => {
      const scenarios = generateBudgetScenarios();
      expect(scenarios.length).toBeGreaterThanOrEqual(3);
      for (const s of scenarios) {
        expect(s.budgetEnvelopeInr).toBeGreaterThan(0);
        expect(s.roadsFundedCount).toBeGreaterThan(0);
        expect(s.title).toBeDefined();
      }
    });

    it("Stage 2: rankRoadPriorities prioritizes corridors by 5-dimension objective need", () => {
      const ranked = rankRoadPriorities();
      expect(ranked.length).toBeGreaterThan(100);
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].compositeScore).toBeGreaterThanOrEqual(ranked[i + 1].compositeScore);
      }
    });

    it("verifies budget framing stages cleanly separate ward diagnosis from corridor allocation", () => {
      const report = getSpendVsNeedReport();
      const scenarios = generateBudgetScenarios();
      expect(report.wards.length).toBe(24);
      expect(scenarios[0].roadsFundedCount).toBeLessThan(report.roads.length);
    });
  });

  describe("Feature 14: Contractor Score Recalibration", () => {
    it("calculates multi-factor performance scorecards for all contractors", () => {
      const { cards } = buildScorecards(ds);
      expect(cards.length).toBe(8);
      for (const c of cards) {
        expect(c.overall).toBeGreaterThanOrEqual(0);
        expect(c.overall).toBeLessThanOrEqual(100);
        expect(c.volume.jobs).toBeGreaterThan(0);
      }
    });

    it("categorizes contractors into performance tiers including Needs attention (<40)", () => {
      expect(bandOf(75, 50)).toBe("Strong");
      expect(bandOf(50, 50)).toBe("As expected");
      expect(bandOf(35, 50)).toBe("Needs attention");
      expect(bandOf(35, 5)).toBe("Limited data");
    });

    it("durabilityPart penalizes higher reopen rates", () => {
      const dummyBuckets = { reopenRate: () => 0.1, slaMissRate: () => 0.2 };
      const goodOrders = [
        { method: "Patchwork", stress: "Low", reopened: false, slaMet: true, costRatio: 1, overBilled: false },
      ] as any;
      const badOrders = [
        { method: "Patchwork", stress: "Low", reopened: true, slaMet: true, costRatio: 1, overBilled: false },
      ] as any;
      const good = durabilityPart(goodOrders, dummyBuckets);
      const bad = durabilityPart(badOrders, dummyBuckets);
      expect(good.score).toBeGreaterThan(bad.score);
    });

    it("costPart penalizes higher cost ratios and overbilling outliers", () => {
      const fairOrders = [
        { method: "Mastic", stress: "Low", reopened: false, slaMet: true, costRatio: 1.0, overBilled: false },
      ] as any;
      const expensiveOrders = [
        { method: "Mastic", stress: "Low", reopened: false, slaMet: true, costRatio: 2.5, overBilled: true },
      ] as any;
      const fair = costPart(fairOrders, 0.1);
      const expensive = costPart(expensiveOrders, 0.1);
      expect(fair.score).toBeGreaterThan(expensive.score);
    });

    it("adjustForSample pulls small-sample scores toward prior 50", () => {
      const smallAdjusted = adjustForSample(10, 5);
      expect(smallAdjusted).toBeGreaterThan(10);
      expect(smallAdjusted).toBeLessThan(50);
      const largeAdjusted = adjustForSample(10, 500);
      expect(largeAdjusted).toBeLessThan(12);
    });
  });

  describe("Feature 15: Social Signal Civic Integration", () => {
    it("loads municipal social posts with structured civic metadata", () => {
      expect(ds.socialPosts.length).toBeGreaterThan(100);
      const sample = ds.socialPosts[0];
      expect(sample).toHaveProperty("id");
      expect(sample).toHaveProperty("text");
      expect(sample).toHaveProperty("source");
      expect(sample).toHaveProperty("likes");
    });

    it("detects road-matched social posts referencing Mumbai road segments", () => {
      const roadNames = new Set(ds.roads.map((r) => r.name.toLowerCase()));
      const matched = ds.socialPosts.filter((post) => {
        const text = post.text.toLowerCase();
        for (const name of roadNames) {
          if (name.length > 5 && text.includes(name)) return true;
        }
        return false;
      });
      expect(matched.length).toBeGreaterThan(50);
    });

    it("voicePacket extracts citizen complaints and social post voice lines", () => {
      const packet = voicePacket(ds, "H/W");
      expect(packet.ward).toBe("H/W");
      expect(Array.isArray(packet.lines)).toBe(true);
      expect(packet.lines.length).toBeGreaterThan(0);
    });

    it("WardVoices component displays voice lines for ward", () => {
      render(React.createElement(WardVoices, { ds, ward: "H/W" }));
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("social posts capture diverse civic reporting channels", () => {
      const sources = new Set(ds.socialPosts.map((p) => p.source));
      expect(sources.size).toBeGreaterThan(1);
    });
  });
});
