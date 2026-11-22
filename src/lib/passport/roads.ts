import { getRupee } from "../rupee/index";
import type { Road } from "../rupee/types";
import type { RoadExplorerFilter, RoadExplorerStats, RoadListItem } from "./types";

export type { RoadExplorerFilter, RoadExplorerStats, RoadListItem };

export function listRoadSummaries(filter?: RoadExplorerFilter): RoadListItem[] {
  const { ds, flags } = getRupee();

  const ordersByRoad = new Map<string, typeof ds.workOrders>();
  for (const o of ds.workOrders) {
    const list = ordersByRoad.get(o.roadId) ?? [];
    list.push(o);
    ordersByRoad.set(o.roadId, list);
  }

  const flagsByRoad = new Map<string, number>();
  for (const f of flags) {
    flagsByRoad.set(f.roadId, (flagsByRoad.get(f.roadId) ?? 0) + 1);
  }

  const complaintsByWard = new Map<string, typeof ds.complaints>();
  for (const c of ds.complaints) {
    if (!c.ward) continue;
    const list = complaintsByWard.get(c.ward) ?? [];
    list.push(c);
    complaintsByWard.set(c.ward, list);
  }

  let items: RoadListItem[] = ds.roads.map((road) => {
    const orders = ordersByRoad.get(road.id) ?? [];
    const billed = orders.reduce((sum, o) => sum + o.costInr, 0);
    const reopened = orders.filter((o) => o.reopened).length;
    const reopenRate = orders.length > 0 ? reopened / orders.length : 0;
    const flagCount = flagsByRoad.get(road.id) ?? 0;

    const wardComplaints = complaintsByWard.get(road.ward) ?? [];
    const openComplaints = wardComplaints.filter(
      (c) => c.status.toLowerCase().includes("open") && c.locality.toLowerCase().includes(road.name.toLowerCase()),
    ).length;

    let status: RoadListItem["status"] = "held";
    if (flagCount > 0) status = "flagged";
    else if (reopenRate >= 0.3) status = "high_risk";
    else if (reopenRate > 0 || road.underDlp) status = "under_review";

    return {
      id: road.id,
      name: road.name,
      ward: road.ward,
      roadType: road.roadType,
      surface: road.surface,
      lanes: road.lanes,
      lengthM: road.lengthM,
      underDlp: road.underDlp,
      lastResurfaced: road.lastResurfaced,
      busRoute: road.busRoute,
      totalBilledInr: billed,
      orderCount: orders.length,
      reopenCount: reopened,
      reopenRate,
      flagCount,
      openComplaintCount: openComplaints,
      status,
    };
  });

  if (filter?.ward) {
    const w = filter.ward.toUpperCase();
    items = items.filter((item) => item.ward === w);
  }

  if (filter?.surface) {
    items = items.filter((item) => item.surface.toLowerCase() === filter.surface?.toLowerCase());
  }

  if (filter?.underDlp !== undefined) {
    items = items.filter((item) => item.underDlp === filter.underDlp);
  }

  if (filter?.hasFlags) {
    items = items.filter((item) => item.flagCount > 0);
  }

  if (filter?.query) {
    const q = filter.query.toLowerCase().trim();
    items = items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.ward.toLowerCase().includes(q),
    );
  }

  const sort = filter?.sortBy ?? "billed_desc";
  items.sort((a, b) => {
    if (sort === "billed_desc") return b.totalBilledInr - a.totalBilledInr;
    if (sort === "orders_desc") return b.orderCount - a.orderCount;
    if (sort === "reopen_desc") return b.reopenRate - a.reopenRate;
    return a.name.localeCompare(b.name);
  });

  return items;
}

export function getRoadExplorerStats() {
  const items = listRoadSummaries();
  const totalBilled = items.reduce((sum, i) => sum + i.totalBilledInr, 0);
  const flaggedCount = items.filter((i) => i.flagCount > 0).length;
  const dlpCount = items.filter((i) => i.underDlp).length;
  const avgReopenRate = items.reduce((sum, i) => sum + i.reopenRate, 0) / (items.length || 1);

  return {
    totalRoads: items.length,
    totalBilledInr: totalBilled,
    flaggedRoadsCount: flaggedCount,
    dlpRoadsCount: dlpCount,
    averageReopenRate: avgReopenRate,
  };
}
