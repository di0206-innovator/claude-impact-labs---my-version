import { describe, expect, it } from "vitest";
import { distToSegment } from "@/lib/priority/geometry";
import {
  calculateDisparityMetrics,
  calculateRoadSpendVsNeed,
  calculateWardSpendVsNeed,
  getSpendVsNeedReport,
} from "@/lib/priority/score";
import { getRupee } from "@/lib/rupee/index";

describe("Priority Scoring & Disparity Logic", () => {
  it("calculates flat-earth segment distance accurately", () => {
    const a = { lat: 19.0, lng: 72.8 };
    const b = { lat: 19.0, lng: 72.9 };
    // Point directly on midpoint of segment
    const onSeg = distToSegment(19.0, 72.85, a, b);
    expect(onSeg).toBeLessThan(1); // < 1 meter

    // Point offset north
    const offset = distToSegment(19.001, 72.85, a, b);
    expect(offset).toBeGreaterThan(100);
    expect(offset).toBeLessThan(120);
  });

  it("calculates deterministic road spend-vs-need scores across all Mumbai roads", () => {
    const { ds, flags } = getRupee();
    const scored = calculateRoadSpendVsNeed(ds, flags);

    expect(scored.length).toBe(ds.roads.length);
    expect(scored.length).toBeGreaterThanOrEqual(250);

    // Verify first ranked item has highest need score
    const top = scored[0];
    expect(top.needRank).toBe(1);
    expect(top.needScore).toBeGreaterThanOrEqual(scored[scored.length - 1].needScore);

    // Check bounded values
    for (const r of scored) {
      expect(r.needScore).toBeGreaterThanOrEqual(0);
      expect(r.needScore).toBeLessThanOrEqual(100);
      expect(r.needRank).toBeGreaterThanOrEqual(1);

      const d = r.dimensions;
      expect(d.complaintsScore).toBeGreaterThanOrEqual(0);
      expect(d.complaintsScore).toBeLessThanOrEqual(100);
      expect(d.reopenScore).toBeGreaterThanOrEqual(0);
      expect(d.reopenScore).toBeLessThanOrEqual(100);
      expect(d.accidentsScore).toBeGreaterThanOrEqual(0);
      expect(d.accidentsScore).toBeLessThanOrEqual(100);
      expect(d.floodingScore).toBeGreaterThanOrEqual(0);
      expect(d.floodingScore).toBeLessThanOrEqual(100);
      expect(d.trafficScore).toBeGreaterThanOrEqual(0);
      expect(d.trafficScore).toBeLessThanOrEqual(100);
      expect(d.facilityScore).toBeGreaterThanOrEqual(0);
      expect(d.facilityScore).toBeLessThanOrEqual(100);

      expect(["critical_deficit", "moderate_deficit", "equitable", "surplus"]).toContain(
        r.status,
      );
      expect(typeof r.disparityInr).toBe("number");
      expect(r.expectedSpendInr).toBeGreaterThanOrEqual(0);
    }
  });

  it("calculates ward spend-vs-need allocations, ratios and rankings", () => {
    const { ds, flags, ledgers } = getRupee();
    const roads = calculateRoadSpendVsNeed(ds, flags);
    const wards = calculateWardSpendVsNeed(ds, roads, ledgers);

    expect(wards.length).toBe(24);

    // Check share percentages sum close to 100%
    const totalNeedShare = wards.reduce((sum, w) => sum + w.needSharePct, 0);
    const totalSpendShare = wards.reduce((sum, w) => sum + w.spendSharePct, 0);
    const totalBudgetShare = wards.reduce((sum, w) => sum + w.budgetSharePct, 0);

    expect(totalNeedShare).toBeGreaterThan(98);
    expect(totalNeedShare).toBeLessThan(102);
    expect(totalSpendShare).toBeGreaterThan(98);
    expect(totalSpendShare).toBeLessThan(102);
    expect(totalBudgetShare).toBeGreaterThan(98);
    expect(totalBudgetShare).toBeLessThan(102);

    // Verify rankings 1 to 24
    const needRanks = new Set(wards.map((w) => w.needRank));
    const spendRanks = new Set(wards.map((w) => w.spendRank));
    const dispRanks = new Set(wards.map((w) => w.disparityRank));

    expect(needRanks.size).toBe(24);
    expect(spendRanks.size).toBe(24);
    expect(dispRanks.size).toBe(24);

    for (const w of wards) {
      expect(w.needScore).toBeGreaterThanOrEqual(10);
      expect(w.needScore).toBeLessThanOrEqual(100);
      expect(w.disparityIndex).toBeCloseTo(w.spendSharePct - w.needSharePct, 1);
      expect(w.spendToNeedRatio).toBeGreaterThan(0);
      expect(w.unfundedNeedInr).toBeGreaterThanOrEqual(0);
    }
  });

  it("calculates citywide disparity metrics and Gini coefficient", () => {
    const { ds, flags, ledgers } = getRupee();
    const roads = calculateRoadSpendVsNeed(ds, flags);
    const wards = calculateWardSpendVsNeed(ds, roads, ledgers);
    const metrics = calculateDisparityMetrics(wards);

    expect(metrics.giniCoefficient).toBeGreaterThanOrEqual(0);
    expect(metrics.giniCoefficient).toBeLessThanOrEqual(1);

    expect(metrics.disparitySpread).toBeGreaterThan(0);
    expect(
      metrics.criticalDeficitWardsCount +
        metrics.moderateDeficitWardsCount +
        metrics.equitableWardsCount +
        metrics.surplusWardsCount,
    ).toBe(24);

    expect(metrics.totalUnderfundedQuantumInr).toBeGreaterThan(0);
    expect(metrics.maxDeficitWard.wardCode).toBeTruthy();
    expect(metrics.maxSurplusWard.wardCode).toBeTruthy();
    expect(metrics.maxDeficitWard.deficitPct).toBeLessThanOrEqual(
      metrics.maxSurplusWard.surplusPct,
    );
  });

  it("getSpendVsNeedReport generates an end-to-end report deterministically", () => {
    const report1 = getSpendVsNeedReport();
    const report2 = getSpendVsNeedReport();

    expect(report1.wards.length).toBe(24);
    expect(report1.roads.length).toBe(report2.roads.length);
    expect(report1.metrics.giniCoefficient).toBe(report2.metrics.giniCoefficient);
    expect(report1.metrics.totalUnderfundedQuantumInr).toBe(
      report2.metrics.totalUnderfundedQuantumInr,
    );
    expect(report1.wards[0].wardCode).toBe(report2.wards[0].wardCode);
  });
});
