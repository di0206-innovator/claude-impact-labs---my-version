import { describe, expect, it } from "vitest";
import {
  distanceToSegmentMeters,
  isCategoryCompatible,
  matchComplaintToWorkOrders,
  scoreComplaintToWorkOrder,
} from "@/lib/rupee/matching";
import type { Complaint } from "@/lib/rupee/load";
import type { Road, WorkOrder } from "@/lib/rupee/types";

function createComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: "CMP-01",
    receivedAt: "2025-07-10 10:00",
    channel: "citizen",
    category: "pothole",
    description: "Deep pothole near junction",
    language: "en",
    locality: "Dadar",
    ward: "G/N",
    lat: 19.018,
    lng: 72.843,
    upvotes: 4,
    status: "open",
    resolvedAt: null,
    ...overrides,
  };
}

function createOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "WO-01",
    complaintIds: [],
    ward: "G/N",
    roadId: "RD-01",
    workType: "Pothole",
    method: "Cold mix patch",
    contractorId: "CT-01",
    contractorName: "Apex Infra",
    assignedAt: "2025-07-11 08:00",
    startedAt: "2025-07-11 09:00",
    completedAt: "2025-07-11 15:00",
    areaSqm: 10,
    costInr: 18000,
    slaHours: 24,
    slaMet: true,
    reopened: false,
    remark: "Repaired",
    ...overrides,
  };
}

function createRoad(overrides: Partial<Road> = {}): Road {
  return {
    id: "RD-01",
    name: "Senapati Bapat Marg",
    segmentNo: 1,
    ward: "G/N",
    roadType: "Major Arterial",
    surface: "Asphalt",
    lanes: 4,
    lengthM: 500,
    start: { lat: 19.017, lng: 72.843 },
    end: { lat: 19.021, lng: 72.843 },
    lastResurfaced: "2023-01-01",
    underDlp: false,
    busRoute: true,
    ...overrides,
  };
}

describe("Accountability Matching Engine", () => {
  it("computes flat-Earth geodesic distance accurately", () => {
    const a = { lat: 19.0, lng: 72.8 };
    const b = { lat: 19.01, lng: 72.8 };
    const dist = distanceToSegmentMeters(19.005, 72.8, a, b);
    expect(dist).toBeCloseTo(0, 0);

    // Point 100m east
    const eastPoint = { lat: 19.005, lng: 72.8009 };
    const distEast = distanceToSegmentMeters(eastPoint.lat, eastPoint.lng, a, b);
    expect(distEast).toBeGreaterThan(50);
    expect(distEast).toBeLessThan(150);
  });

  it("checks category compatibility correctly across aliases", () => {
    expect(isCategoryCompatible("pothole", "Pothole")).toBe(true);
    expect(isCategoryCompatible("pothole", "Cold mix patch")).toBe(true);
    expect(isCategoryCompatible("broken surface", "Broken paver blocks")).toBe(true);
    expect(isCategoryCompatible("waterlogging", "Drain desilting")).toBe(true);
    expect(isCategoryCompatible("pothole", "Street lighting maintenance")).toBe(false);
  });

  it("assigns score = 1.0 and targeted_fix relation for explicit complaint links", () => {
    const c = createComplaint({ id: "C-100" });
    const wo = createOrder({ complaintIds: ["C-100"] });
    const result = scoreComplaintToWorkOrder(c, wo);

    expect(result.score).toBe(1.0);
    expect(result.tier).toBe("exact");
    expect(result.relation).toBe("targeted_fix");
    expect(result.reason).toContain("Explicitly linked");
  });

  it("infers match score based on spatial, temporal, and category alignment", () => {
    const road = createRoad();
    const c = createComplaint({ lat: 19.0185, lng: 72.843, receivedAt: "2025-07-10 10:00" });
    const wo = createOrder({ assignedAt: "2025-07-11 08:00", completedAt: "2025-07-11 16:00" });

    const result = scoreComplaintToWorkOrder(c, wo, road);
    expect(result.score).toBeGreaterThanOrEqual(0.70);
    expect(["exact", "high"]).toContain(result.tier);
    expect(result.categoryMatch).toBe(true);
    expect(result.distanceMeters).toBeLessThan(50);
    expect(result.daysDelta).toBeLessThanOrEqual(2);
  });

  it("filters and ranks matches above minimum score threshold", () => {
    const road = createRoad();
    const roadMap = new Map([[road.id, road]]);
    const c = createComplaint();
    const woClose = createOrder({ id: "WO-CLOSE", assignedAt: "2025-07-10 12:00" });
    const woFar = createOrder({
      id: "WO-FAR",
      roadId: "RD-OTHER",
      ward: "P/N",
      workType: "Street Lighting",
      assignedAt: "2025-09-10 12:00",
      completedAt: "2025-09-10 18:00",
    });

    const matches = matchComplaintToWorkOrders(c, [woClose, woFar], roadMap, 0.45);
    expect(matches.length).toBe(1);
    expect(matches[0].workOrderId).toBe("WO-CLOSE");
  });
});
