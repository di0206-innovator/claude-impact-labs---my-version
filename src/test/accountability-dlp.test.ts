import { describe, expect, it } from "vitest";
import { isSurfaceWorkCoveredByDlp, screenDlpWorkOrders } from "@/lib/rupee/dlp";
import type { Dataset } from "@/lib/rupee/load";
import type { WorkOrder } from "@/lib/rupee/types";

function baseDataset(): Dataset {
  return {
    wards: [{ code: "F/N", name: "Matunga", zone: "City", office: "", centroid: { lat: 19.03, lng: 72.86 }, areaKm2: 12, population: 500000, lowLyingIndex: 0.6, crews: 3, budgetInr: 8000000, localities: [] }],
    roads: [
      { id: "RD-DLP", name: "Ambedkar Road", segmentNo: 1, ward: "F/N", roadType: "Major Arterial", surface: "Asphalt", lanes: 6, lengthM: 1000, start: { lat: 19.02, lng: 72.85 }, end: { lat: 19.04, lng: 72.85 }, lastResurfaced: "2024-04-15", underDlp: true, busRoute: true },
      { id: "RD-REG", name: "Five Gardens Lane", segmentNo: 1, ward: "F/N", roadType: "Local", surface: "Paver", lanes: 2, lengthM: 200, start: { lat: 19.02, lng: 72.85 }, end: { lat: 19.03, lng: 72.85 }, lastResurfaced: "2019-01-01", underDlp: false, busRoute: false },
    ],
    workOrders: [],
    contractors: [{ id: "CT-ROAD", name: "Apex Build", empanelledSince: 2020, activeWards: ["F/N"] }],
    rateCard: [{ method: "Cold mix patch", unit: "per sqm", rateInr: 1800 }],
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
    ward: "F/N",
    roadId: "RD-DLP",
    workType: "Pothole",
    method: "Cold mix patch",
    contractorId: "CT-ROAD",
    contractorName: "Apex Build",
    assignedAt: "2025-06-05 08:00",
    startedAt: "2025-06-05 09:00",
    completedAt: "2025-06-05 14:00",
    areaSqm: 12,
    costInr: 21600,
    slaHours: 24,
    slaMet: true,
    reopened: false,
    remark: "",
    ...overrides,
  };
}

describe("DLP Screening Engine", () => {
  it("recognizes surface defect types covered by standard resurfacing DLP", () => {
    expect(isSurfaceWorkCoveredByDlp("Pothole")).toBe(true);
    expect(isSurfaceWorkCoveredByDlp("Broken paver blocks")).toBe(true);
    expect(isSurfaceWorkCoveredByDlp("Road cave-in")).toBe(true);
    expect(isSurfaceWorkCoveredByDlp("Drain desilting")).toBe(false);
    expect(isSurfaceWorkCoveredByDlp("Choked drain / nullah overflow")).toBe(false);
  });

  it("flags surface repairs billed on DLP roads and includes required disclaimer", () => {
    const ds = baseDataset();
    ds.workOrders = [
      createOrder({ id: "WO-SURFACE", roadId: "RD-DLP", workType: "Pothole", costInr: 25000 }),
      createOrder({ id: "WO-DRAIN", roadId: "RD-DLP", workType: "Drain desilting", costInr: 50000 }),
      createOrder({ id: "WO-NON-DLP", roadId: "RD-REG", workType: "Pothole", costInr: 20000 }),
    ];

    const report = screenDlpWorkOrders(ds);
    expect(report.totalConflicts).toBe(1);
    expect(report.totalAmountAtRiskInr).toBe(25000);
    expect(report.items[0].workOrderId).toBe("WO-SURFACE");
    expect(report.items[0].roadName).toBe("Ambedkar Road");
    expect(report.items[0].recommendedAction).toContain("Verify original DLP concession contract");
    expect(report.disclaimer).toContain("under_dlp is a screening hint, NEVER a confirmed contractual liability verdict");

    const wardSummary = report.byWard.get("F/N");
    expect(wardSummary?.conflictingOrdersCount).toBe(1);
    expect(wardSummary?.totalAmountAtRiskInr).toBe(25000);
    expect(wardSummary?.roadsAffected).toEqual(["Ambedkar Road"]);
  });
});
