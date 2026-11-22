import type { LatLng, Road, WorkOrder } from "./types";
import type { Complaint } from "./load";
import { daysBetween } from "./audit";

export type MatchTier = "exact" | "high" | "medium" | "low" | "none";

export type MatchRelation =
  | "targeted_fix"
  | "segment_resurfacing"
  | "monsoon_patch"
  | "post_facto_reconciliation"
  | "unverified_association";

export type ComplaintMatchResult = {
  complaintId: string;
  workOrderId: string;
  roadId: string;
  score: number; // 0 to 1
  tier: MatchTier;
  relation: MatchRelation;
  distanceMeters: number | null;
  daysDelta: number;
  categoryMatch: boolean;
  reason: string;
};

const CATEGORY_WORK_TYPE_MAP: Record<string, string[]> = {
  pothole: ["pothole", "patch", "road surface"],
  "broken surface": ["broken paver blocks", "road cave-in", "pothole"],
  "open manhole": ["open chamber / manhole", "manhole cover"],
  waterlogging: ["choked drain / nullah overflow", "drain desilting"],
  "drainage overflow": ["choked drain / nullah overflow", "drain desilting"],
  "uneven paver": ["broken paver blocks", "paver"],
};

export function distanceToSegmentMeters(
  lat: number,
  lng: number,
  a: LatLng,
  b: LatLng,
): number {
  const refLat = (a.lat + b.lat) / 2;
  const mx = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const my = 110_540;
  const ax = (a.lng - lng) * mx;
  const ay = (a.lat - lat) * my;
  const bx = (b.lng - lng) * mx;
  const by = (b.lat - lat) * my;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function isCategoryCompatible(complaintCat: string, workType: string): boolean {
  const cLower = complaintCat.trim().toLowerCase();
  const wLower = workType.trim().toLowerCase();
  if (cLower === wLower || wLower.includes(cLower) || cLower.includes(wLower)) {
    return true;
  }
  const mapped = CATEGORY_WORK_TYPE_MAP[cLower];
  if (mapped && mapped.some((m) => wLower.includes(m))) return true;
  return false;
}

export function scoreComplaintToWorkOrder(
  complaint: Complaint,
  order: WorkOrder,
  road?: Road,
): ComplaintMatchResult {
  const isExplicit = order.complaintIds.includes(complaint.id);
  const catMatch = isCategoryCompatible(complaint.category, order.workType);

  let distM: number | null = null;
  if (complaint.lat != null && complaint.lng != null && road?.start && road?.end) {
    distM = Math.round(distanceToSegmentMeters(complaint.lat, complaint.lng, road.start, road.end));
  }

  const daysDelta = Math.abs(daysBetween(order.completedAt || order.assignedAt, complaint.receivedAt));

  let score = 0;
  if (isExplicit) {
    score = 1.0;
  } else {
    // Spatial component (up to 0.40)
    if (distM != null) {
      if (distM <= 50) score += 0.40;
      else if (distM <= 150) score += 0.30;
      else if (distM <= 300) score += 0.15;
    } else if (complaint.ward === order.ward) {
      score += 0.10;
    }

    // Temporal component (up to 0.35)
    if (daysDelta <= 3) score += 0.35;
    else if (daysDelta <= 7) score += 0.25;
    else if (daysDelta <= 14) score += 0.15;
    else if (daysDelta <= 30) score += 0.05;

    // Category component (up to 0.25)
    if (catMatch) score += 0.25;
  }

  const tier: MatchTier =
    score >= 0.85 ? "exact" : score >= 0.65 ? "high" : score >= 0.45 ? "medium" : score >= 0.25 ? "low" : "none";

  let relation: MatchRelation = "unverified_association";
  if (isExplicit) relation = "targeted_fix";
  else if (catMatch && distM != null && distM <= 50 && daysDelta <= 7) relation = "targeted_fix";
  else if (catMatch && distM != null && distM <= 200) relation = "segment_resurfacing";
  else if (daysDelta <= 14) relation = "monsoon_patch";
  else relation = "post_facto_reconciliation";

  const reason = isExplicit
    ? `Explicitly linked complaint record (${complaint.id}) on work order ${order.id}.`
    : `Inferred match (score ${(score * 100).toFixed(0)}%): ${catMatch ? "compatible issue" : "different category"}, ` +
      `${distM != null ? `${distM}m away` : "same ward"}, ${daysDelta.toFixed(1)} days delta.`;

  return {
    complaintId: complaint.id,
    workOrderId: order.id,
    roadId: order.roadId,
    score: Math.min(1, Math.max(0, Number(score.toFixed(3)))),
    tier,
    relation,
    distanceMeters: distM,
    daysDelta: Number(daysDelta.toFixed(1)),
    categoryMatch: catMatch,
    reason,
  };
}

export function matchComplaintToWorkOrders(
  complaint: Complaint,
  workOrders: WorkOrder[],
  roads: Map<string, Road>,
  minScore = 0.45,
): ComplaintMatchResult[] {
  const matches: ComplaintMatchResult[] = [];
  for (const order of workOrders) {
    if (complaint.ward && order.ward !== complaint.ward) continue;
    const road = roads.get(order.roadId);
    const result = scoreComplaintToWorkOrder(complaint, order, road);
    if (result.score >= minScore) matches.push(result);
  }
  return matches.sort((a, b) => b.score - a.score);
}
