import type { Complaint } from "./load";
import type { Road, WorkOrder } from "./types";
import { daysBetween } from "./audit";

export type ComplaintCluster = {
  clusterId: string;
  primaryComplaintId: string;
  category: string;
  ward: string;
  complaintCount: number;
  duplicateIds: string[];
  centroid: { lat: number; lng: number } | null;
  earliestReportedAt: string;
  latestReportedAt: string;
  timeSpanHours: number;
};

export type DeduplicationOptions = {
  maxDistanceMeters?: number; // default 75m
  maxTimeDeltaHours?: number; // default 72h
  sameWardOnly?: boolean; // default true
};

export type RepeatBillingCluster = {
  clusterId: string;
  roadId: string;
  roadName: string;
  ward: string;
  method: string;
  workType: string;
  primaryOrderId: string;
  repeatOrderIds: string[];
  totalBilledInr: number;
  excessBilledInr: number; // amount billed after the primary order
  daysApart: number;
  hasInterveningComplaint: boolean;
  explanation: string;
};

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const refLat = ((lat1 + lat2) / 2 * Math.PI) / 180;
  const dx = (lng2 - lng1) * 111_320 * Math.cos(refLat);
  const dy = (lat2 - lat1) * 110_540;
  return Math.hypot(dx, dy);
}

class DisjointSet {
  private parent = new Map<string, string>();

  find(id: string): string {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      return id;
    }
    const p = this.parent.get(id)!;
    if (p !== id) {
      const root = this.find(p);
      this.parent.set(id, root);
      return root;
    }
    return p;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

export function deduplicateComplaints(
  complaints: Complaint[],
  options: DeduplicationOptions = {},
): { clusters: ComplaintCluster[]; duplicateCount: number; canonicalComplaints: Complaint[] } {
  const maxDist = options.maxDistanceMeters ?? 75;
  const maxHours = options.maxTimeDeltaHours ?? 72;
  const sameWard = options.sameWardOnly ?? true;

  const dsu = new DisjointSet();
  const byId = new Map<string, Complaint>();
  for (const c of complaints) {
    byId.set(c.id, c);
    dsu.find(c.id);
  }

  // Group complaints by ward and coarse category to avoid O(N^2) over the full city
  const buckets = new Map<string, Complaint[]>();
  for (const c of complaints) {
    const bucketKey = `${c.ward ?? "NO_WARD"}_${c.category.trim().toLowerCase()}`;
    const list = buckets.get(bucketKey) ?? [];
    list.push(c);
    buckets.set(bucketKey, list);
  }

  for (const list of buckets.values()) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (sameWard && a.ward !== b.ward) continue;

        const hoursDelta = Math.abs(daysBetween(a.receivedAt, b.receivedAt) * 24);
        if (hoursDelta > maxHours) continue;

        if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
          const dist = distanceMeters(a.lat, a.lng, b.lat, b.lng);
          if (dist <= maxDist) {
            dsu.union(a.id, b.id);
          }
        } else if (a.locality && b.locality && a.locality.toLowerCase() === b.locality.toLowerCase()) {
          dsu.union(a.id, b.id);
        }
      }
    }
  }

  const groups = new Map<string, Complaint[]>();
  for (const c of complaints) {
    const root = dsu.find(c.id);
    const list = groups.get(root) ?? [];
    list.push(c);
    groups.set(root, list);
  }

  const clusters: ComplaintCluster[] = [];
  const canonicalComplaints: Complaint[] = [];
  let duplicateCount = 0;

  for (const [rootId, group] of groups.entries()) {
    // Sort by earliest receivedAt, then highest upvotes
    group.sort((a, b) => {
      const timeDiff = new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (b.upvotes ?? 0) - (a.upvotes ?? 0);
    });

    const primary = group[0];
    canonicalComplaints.push(primary);

    if (group.length > 1) {
      const duplicates = group.slice(1);
      duplicateCount += duplicates.length;

      let sumLat = 0;
      let sumLng = 0;
      let coordCount = 0;
      for (const item of group) {
        if (item.lat != null && item.lng != null) {
          sumLat += item.lat;
          sumLng += item.lng;
          coordCount++;
        }
      }

      const earliest = group[0].receivedAt;
      const latest = group[group.length - 1].receivedAt;
      const spanHours = Math.abs(daysBetween(latest, earliest) * 24);

      clusters.push({
        clusterId: `cluster_${rootId}`,
        primaryComplaintId: primary.id,
        category: primary.category,
        ward: primary.ward ?? "Unknown",
        complaintCount: group.length,
        duplicateIds: duplicates.map((d) => d.id),
        centroid: coordCount > 0 ? { lat: sumLat / coordCount, lng: sumLng / coordCount } : null,
        earliestReportedAt: earliest,
        latestReportedAt: latest,
        timeSpanHours: Number(spanHours.toFixed(1)),
      });
    }
  }

  return { clusters, duplicateCount, canonicalComplaints };
}

export function detectDuplicateBillings(
  workOrders: WorkOrder[],
  roads: Map<string, Road>,
  maxDaysGap = 7,
): RepeatBillingCluster[] {
  const byRoadAndMethod = new Map<string, WorkOrder[]>();
  for (const order of workOrders) {
    const key = `${order.roadId}::${order.method.toLowerCase().trim()}`;
    const list = byRoadAndMethod.get(key) ?? [];
    list.push(order);
    byRoadAndMethod.set(key, list);
  }

  const clusters: RepeatBillingCluster[] = [];

  for (const [key, orders] of byRoadAndMethod.entries()) {
    if (orders.length < 2) continue;
    // Sort chronologically
    orders.sort((a, b) => new Date(a.completedAt || a.assignedAt).getTime() - new Date(b.completedAt || b.assignedAt).getTime());

    for (let i = 0; i < orders.length; i++) {
      const first = orders[i];
      const repeats: WorkOrder[] = [];

      for (let j = i + 1; j < orders.length; j++) {
        const next = orders[j];
        const gap = daysBetween(next.completedAt || next.assignedAt, first.completedAt || first.assignedAt);
        if (gap >= 0 && gap <= maxDaysGap) {
          repeats.push(next);
        }
      }

      if (repeats.length > 0) {
        const road = roads.get(first.roadId);
        const roadName = road?.name ?? first.roadId;
        const totalBilled = first.costInr + repeats.reduce((sum, r) => sum + r.costInr, 0);
        const excessBilled = repeats.reduce((sum, r) => sum + r.costInr, 0);
        const hasIntervening = repeats.some((r) => r.complaintIds.length > 0);
        const maxGap = Math.max(...repeats.map((r) => daysBetween(r.completedAt || r.assignedAt, first.completedAt || first.assignedAt)));

        clusters.push({
          clusterId: `repeat_${first.id}`,
          roadId: first.roadId,
          roadName,
          ward: first.ward,
          method: first.method,
          workType: first.workType,
          primaryOrderId: first.id,
          repeatOrderIds: repeats.map((r) => r.id),
          totalBilledInr: totalBilled,
          excessBilledInr: excessBilled,
          daysApart: Number(maxGap.toFixed(1)),
          hasInterveningComplaint: hasIntervening,
          explanation: `Road ${roadName} had ${repeats.length} repeat ${first.method} bill(s) within ${maxGap.toFixed(0)} days of job ${first.id}, with ${excessBilled.toLocaleString("en-IN")} INR additional billed amount.`,
        });
      }
    }
  }

  return clusters;
}
