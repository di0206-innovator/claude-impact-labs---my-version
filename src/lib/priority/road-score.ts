import type { Dataset } from "../rupee/load";
import type { Accident, Facility, FloodHotspot } from "../rupee/load";
import type { AuditFlag } from "../rupee/types";
import { distToSegment } from "./geometry";
import type { RoadSpendVsNeed } from "./types";

const ROAD_CAUSE = /pothole|waterlogged|uneven|open chamber/i;

function norm(val: number, max: number): number {
  return max > 0 ? Math.min(1, val / max) : 0;
}

function accidentWeight(list: Accident[]): number {
  return list.reduce((sum, a) => sum + (ROAD_CAUSE.test(a.probableCause) ? 2 : 1), 0);
}

function floodWeight(list: FloodHotspot[]): number {
  return list.reduce((sum, h) => sum + (h.tideSensitive ? 2 : 1), 0);
}

function facilityWeight(list: Facility[]): number {
  return list.reduce((sum, f) => sum + (f.emergencyServices ? 2 : 1), 0);
}

export function calculateRoadSpendVsNeed(ds: Dataset, flags: AuditFlag[]): RoadSpendVsNeed[] {
  const flagsByRoad = new Map<string, number>();
  for (const f of flags) flagsByRoad.set(f.roadId, (flagsByRoad.get(f.roadId) ?? 0) + 1);

  const ordersByRoad = new Map<string, typeof ds.workOrders>();
  const spentByRoad = new Map<string, number>();
  for (const o of ds.workOrders) {
    const bucket = ordersByRoad.get(o.roadId) ?? [];
    bucket.push(o);
    ordersByRoad.set(o.roadId, bucket);
    spentByRoad.set(o.roadId, (spentByRoad.get(o.roadId) ?? 0) + o.costInr);
  }

  const accidentsByRoad = new Map<string, Accident[]>();
  for (const a of ds.accidents) {
    const list = accidentsByRoad.get(a.roadId) ?? [];
    list.push(a);
    accidentsByRoad.set(a.roadId, list);
  }

  const facilitiesByRoad = new Map<string, Facility[]>();
  for (const f of ds.facilities) {
    if (f.ambulanceEntryRoad) {
      const list = facilitiesByRoad.get(f.ambulanceEntryRoad) ?? [];
      list.push(f);
      facilitiesByRoad.set(f.ambulanceEntryRoad, list);
    }
  }

  const openComplaintsByRoad = new Map<string, number>();
  for (const c of ds.complaints) {
    if (c.status !== "Open" && c.status !== "In Progress") continue;
    if (c.lat == null || c.lng == null) continue;
    for (const r of ds.roads) {
      if (distToSegment(c.lat, c.lng, r.start, r.end) <= 300) {
        openComplaintsByRoad.set(r.id, (openComplaintsByRoad.get(r.id) ?? 0) + 1);
        break;
      }
    }
  }

  const trafficByRoad = new Map(ds.traffic.map((t) => [t.roadId, t]));
  const maxPeak = Math.max(1, ...ds.traffic.map((t) => t.peakHourVehicles));

  const roadsData = ds.roads.map((r) => {
    const flood = ds.floodHotspots.filter((h) => distToSegment(h.lat, h.lng, r.start, r.end) <= 400);
    const orders = ordersByRoad.get(r.id) ?? [];
    const openCount = openComplaintsByRoad.get(r.id) ?? 0;
    const reopenedCount = orders.filter((o) => o.reopened).length;
    const accidents = accidentsByRoad.get(r.id) ?? [];
    const facilities = facilitiesByRoad.get(r.id) ?? [];
    const traffic = trafficByRoad.get(r.id);

    return {
      r,
      orders,
      openCount,
      reopenedCount,
      accWeight: accidentWeight(accidents),
      floodWeight: floodWeight(flood),
      facilityWeight: facilityWeight(facilities),
      trafficScore: traffic
        ? 0.5 * (traffic.peakHourVehicles / maxPeak) +
          0.3 * (traffic.congestionIndex / 10) +
          0.2 * (traffic.busRoutesCount > 0 ? 1 : 0)
        : 0,
      spentInr: spentByRoad.get(r.id) ?? 0,
    };
  });

  const maxOpen = Math.max(1, ...roadsData.map((d) => d.openCount));
  const maxReopened = Math.max(1, ...roadsData.map((d) => d.reopenedCount));
  const maxAcc = Math.max(1, ...roadsData.map((d) => d.accWeight));
  const maxFlood = Math.max(1, ...roadsData.map((d) => d.floodWeight));
  const maxFacility = Math.max(1, ...roadsData.map((d) => d.facilityWeight));

  const totalCitySpend = roadsData.reduce((sum, d) => sum + d.spentInr, 0);

  const scored: RoadSpendVsNeed[] = roadsData.map((d) => {
    const cScore = Math.round(norm(d.openCount, maxOpen) * 100);
    const rScore = Math.round(norm(d.reopenedCount, maxReopened) * 100);
    const aScore = Math.round(norm(d.accWeight, maxAcc) * 100);
    const fScore = Math.round(norm(d.floodWeight, maxFlood) * 100);
    const tScore = Math.round(Math.min(1, d.trafficScore) * 100);
    const facScore = Math.round(norm(d.facilityWeight, maxFacility) * 100);

    const needScore = Math.min(
      100,
      Math.round(
        0.3 * cScore + 0.25 * rScore + 0.15 * aScore + 0.15 * fScore + 0.1 * tScore + 0.05 * facScore,
      ),
    );

    return {
      roadId: d.r.id,
      roadName: d.r.name,
      ward: d.r.ward,
      needScore,
      needRank: 0,
      dimensions: {
        complaintsScore: cScore,
        reopenScore: rScore,
        accidentsScore: aScore,
        floodingScore: fScore,
        trafficScore: tScore,
        facilityScore: facScore,
      },
      lengthM: d.r.lengthM,
      surface: d.r.surface,
      workOrderCount: d.orders.length,
      spentInr: d.spentInr,
      expectedSpendInr: 0,
      disparityInr: 0,
      status: "equitable",
      underDlp: d.r.underDlp,
      flagsCount: flagsByRoad.get(d.r.id) ?? 0,
      openComplaintsCount: d.openCount,
    };
  });

  const totalNeed = Math.max(1, scored.reduce((sum, r) => sum + r.needScore, 0));
  scored.sort((a, b) => b.needScore - a.needScore || a.roadId.localeCompare(b.roadId));

  scored.forEach((road, index) => {
    road.needRank = index + 1;
    road.expectedSpendInr = Math.round(totalCitySpend * (road.needScore / totalNeed));
    road.disparityInr = road.spentInr - road.expectedSpendInr;

    if (road.spentInr === 0 && road.needScore >= 35) {
      road.status = "critical_deficit";
    } else if (road.spentInr < 0.6 * road.expectedSpendInr) {
      road.status = "moderate_deficit";
    } else if (road.spentInr > 1.35 * road.expectedSpendInr) {
      road.status = "surplus";
    } else {
      road.status = "equitable";
    }
  });

  return scored;
}
