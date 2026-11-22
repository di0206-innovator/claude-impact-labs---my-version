import { describe, expect, it } from "vitest";
import {
  analyzeContractorCostSkew,
  detectCostAnomalies,
} from "@/lib/rupee/cost-anomaly";
import type { Dataset } from "@/lib/rupee/load";
import type { WorkOrder } from "@/lib/rupee/types";

function baseDataset(): Dataset {
  return {
    wards: [{ code: "K/W", name: "Andheri West", zone: "Western", office: "", centroid: { lat: 19.13, lng: 72.82 }, areaKm2: 24, population: 700000, lowLyingIndex: 0.5, crews: 4, budgetInr: 10000000, localities: [] }],
    roads: [{ id: "RD-1", name: "SV Road", segmentNo: 1, ward: "K/W", roadType: "Arterial", surface: "Asphalt", lanes: 4, lengthM: 600, start: { lat: 19.12, lng: 72.83 }, end: { lat: 19.14, lng: 72.83 }, lastResurfaced: "2023-01-01", underDlp: false, busRoute: true }],
    workOrders: [],
    contractors: [{ id: "CT-1", name: "Western Infra", empanelledSince: 2018, activeWards: ["K/W"] }],
    rateCard: [
      { method: "Cold mix patch", unit: "per sqm", rateInr: 1800 },
      { method: "Culvert rebuild", unit: "per job", rateInr: 150000 },
    ],
    complaints: [],
    floodHotspots: [],
    rainfall: [],
    tides: [],
    traffic: [],
    accidents: [],
    facilities: [],
    socialPosts: [],
  };
}

function createOrder(overrides: Partial<WorkOrder>): WorkOrder {
  return {
    id: "WO-1",
    complaintIds: [],
    ward: "K/W",
    roadId: "RD-1",
    workType: "Pothole",
    method: "Cold mix patch",
    contractorId: "CT-1",
    contractorName: "Western Infra",
    assignedAt: "2025-06-01 08:00",
    startedAt: "2025-06-01 09:00",
    completedAt: "2025-06-01 14:00",
    areaSqm: 10,
    costInr: 18000,
    slaHours: 24,
    slaMet: true,
    reopened: false,
    remark: "",
    ...overrides,
  };
}

describe("Cost Anomaly Detection Engine", () => {
  it("flags rate card markups exceeding 1.35x benchmark and calculates amount at risk", () => {
    const ds = baseDataset();
    // Cold mix rate is 1800/sqm. For 10 sqm, benchmark is 18000. 1.35x = 24300.
    ds.workOrders = [
      createOrder({ id: "WO-OK", costInr: 22000 }), // below 1.35x
      createOrder({ id: "WO-FLAGGED", costInr: 36000 }), // 2x benchmark
    ];

    const anomalies = detectCostAnomalies(ds);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].workOrderId).toBe("WO-FLAGGED");
    expect(anomalies[0].benchmarkInr).toBe(18000);
    expect(anomalies[0].markupPct).toBe(100);
    expect(anomalies[0].amountAtRiskInr).toBe(18000);
    expect(anomalies[0].reason).toContain("exceeds rate-card expectation");
  });

  it("identifies extreme unit cost outliers when rate card is job-based or varied", () => {
    const ds = baseDataset();
    // Benchmark method without direct rate card entry
    ds.workOrders = [
      createOrder({ id: "WO-N1", method: "Mastic asphalt", areaSqm: 10, costInr: 25000 }), // 2500/sqm
      createOrder({ id: "WO-N2", method: "Mastic asphalt", areaSqm: 10, costInr: 25000 }),
      createOrder({ id: "WO-N3", method: "Mastic asphalt", areaSqm: 10, costInr: 26000 }),
      createOrder({ id: "WO-OUTLIER", method: "Mastic asphalt", areaSqm: 10, costInr: 75000 }), // 7500/sqm (> 2.0x median)
    ];

    const anomalies = detectCostAnomalies(ds);
    const outlier = anomalies.find((a) => a.workOrderId === "WO-OUTLIER");
    expect(outlier).toBeDefined();
    expect(outlier?.anomalyType).toBe("unit_cost_outlier");
    expect(outlier?.amountAtRiskInr).toBeGreaterThan(0);
  });

  it("applies Bayesian shrinkage to contractor median cost ratio when sample size N < 15", () => {
    const ds = baseDataset();
    // Create 3 orders with 1.8x markup for CT-1
    ds.workOrders = [
      createOrder({ id: "WO-1", costInr: 32400 }),
      createOrder({ id: "WO-2", costInr: 32400 }),
      createOrder({ id: "WO-3", costInr: 32400 }),
    ];

    const profiles = analyzeContractorCostSkew(ds);
    expect(profiles.length).toBe(1);
    const ct = profiles[0];
    expect(ct.contractorId).toBe("CT-1");
    expect(ct.ordersCount).toBe(3);
    expect(ct.limitedData).toBe(true);
    expect(ct.medianCostRatio).toBe(1.8);
    // With Bayesian shrinkage toward 1.0 (with priorWeight=10), shrunken ratio should be much closer to 1.0
    expect(ct.shrunkenRatio).toBeLessThan(1.8);
    expect(ct.shrunkenRatio).toBeGreaterThan(1.0);
  });
});
