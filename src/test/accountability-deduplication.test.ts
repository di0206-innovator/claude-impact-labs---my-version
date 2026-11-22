import { describe, expect, it } from "vitest";
import { deduplicateComplaints, detectDuplicateBillings } from "@/lib/rupee/deduplication";
import type { Complaint } from "@/lib/rupee/load";
import type { Road, WorkOrder } from "@/lib/rupee/types";

function createComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: "C-1",
    receivedAt: "2025-07-01 10:00",
    channel: "citizen",
    category: "Pothole",
    description: "Pothole on main lane",
    language: "en",
    locality: "Bandra West",
    ward: "H/W",
    lat: 19.055,
    lng: 72.83,
    upvotes: 2,
    status: "open",
    resolvedAt: null,
    ...overrides,
  };
}

function createOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "WO-1",
    complaintIds: [],
    ward: "H/W",
    roadId: "RD-1",
    workType: "Pothole",
    method: "Cold mix patch",
    contractorId: "CT-1",
    contractorName: "Quality Roads",
    assignedAt: "2025-07-01 08:00",
    startedAt: "2025-07-01 09:00",
    completedAt: "2025-07-01 14:00",
    areaSqm: 10,
    costInr: 20000,
    slaHours: 24,
    slaMet: true,
    reopened: false,
    remark: "Done",
    ...overrides,
  };
}

describe("Accountability Deduplication Engine", () => {
  it("clusters complaints within distance and time thresholds", () => {
    const c1 = createComplaint({ id: "C-1", receivedAt: "2025-07-01 10:00", lat: 19.055, lng: 72.83, upvotes: 1 });
    const c2 = createComplaint({ id: "C-2", receivedAt: "2025-07-01 14:00", lat: 19.0551, lng: 72.8301, upvotes: 5 });
    const c3 = createComplaint({ id: "C-3", receivedAt: "2025-07-20 10:00", lat: 19.055, lng: 72.83 }); // much later

    const result = deduplicateComplaints([c1, c2, c3], { maxDistanceMeters: 75, maxTimeDeltaHours: 72 });
    expect(result.duplicateCount).toBe(1);
    expect(result.clusters.length).toBe(1);
    expect(result.clusters[0].complaintCount).toBe(2);
    expect(result.clusters[0].primaryComplaintId).toBe("C-1"); // earliest
    expect(result.clusters[0].duplicateIds).toEqual(["C-2"]);
    expect(result.canonicalComplaints.length).toBe(2); // C1 and C3
  });

  it("does not cluster complaints in different categories or wards", () => {
    const c1 = createComplaint({ id: "C-1", category: "Pothole", ward: "H/W" });
    const c2 = createComplaint({ id: "C-2", category: "Drainage", ward: "H/W" });
    const c3 = createComplaint({ id: "C-3", category: "Pothole", ward: "K/W" });

    const result = deduplicateComplaints([c1, c2, c3]);
    expect(result.duplicateCount).toBe(0);
    expect(result.clusters.length).toBe(0);
    expect(result.canonicalComplaints.length).toBe(3);
  });

  it("detects rapid repeat billings on the same road within 7 days", () => {
    const road: Road = {
      id: "RD-1",
      name: "Hill Road",
      segmentNo: 1,
      ward: "H/W",
      roadType: "Major Arterial",
      surface: "Asphalt",
      lanes: 4,
      lengthM: 400,
      start: { lat: 19.055, lng: 72.83 },
      end: { lat: 19.058, lng: 72.83 },
      lastResurfaced: "2022-01-01",
      underDlp: false,
      busRoute: true,
    };
    const roadMap = new Map([[road.id, road]]);

    const wo1 = createOrder({ id: "WO-1", completedAt: "2025-07-01 12:00", costInr: 25000 });
    const wo2 = createOrder({ id: "WO-2", completedAt: "2025-07-04 12:00", costInr: 30000 }); // 3 days later
    const wo3 = createOrder({ id: "WO-3", completedAt: "2025-07-25 12:00", costInr: 20000 }); // 24 days later

    const repeatClusters = detectDuplicateBillings([wo1, wo2, wo3], roadMap, 7);
    expect(repeatClusters.length).toBe(1);
    expect(repeatClusters[0].primaryOrderId).toBe("WO-1");
    expect(repeatClusters[0].repeatOrderIds).toEqual(["WO-2"]);
    expect(repeatClusters[0].excessBilledInr).toBe(30000);
    expect(repeatClusters[0].daysApart).toBe(3);
    expect(repeatClusters[0].explanation).toContain("Hill Road");
  });
});
