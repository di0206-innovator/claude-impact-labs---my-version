import { expectedCostInr } from "../rupee/audit";
import { getRupee } from "../rupee/index";
import { buildEvidenceEdges } from "./evidence-edges";
import { matchSocialPostsForRoad } from "./social-match";
import type {
  PassportComplaint,
  PassportRecommendedAction,
  PassportWorkOrder,
  RoadPassportData,
} from "./types";

export function getRoadPassport(roadId: string): RoadPassportData | null {
  const { ds, flags } = getRupee();
  const road = ds.roads.find((r) => r.id === roadId);
  if (!road) return null;

  const roadOrders = ds.workOrders.filter((wo) => wo.roadId === road.id);
  const roadFlags = flags.filter((f) => f.roadId === road.id);
  const flagByOrder = new Map<string, string[]>();
  for (const f of roadFlags) {
    const list = flagByOrder.get(f.workOrderId) ?? [];
    list.push(f.reason);
    flagByOrder.set(f.workOrderId, list);
  }

  const workOrders: PassportWorkOrder[] = roadOrders.map((wo) => {
    const exp = expectedCostInr(ds, wo) ?? wo.costInr;
    const diff = wo.costInr - exp;
    const pct = exp > 0 ? (diff / exp) * 100 : 0;
    return {
      ...wo,
      expectedCostInr: exp,
      varianceInr: Math.max(0, diff),
      variancePct: Math.round(pct),
      flags: flagByOrder.get(wo.id) ?? [],
      evidenceType: "explicit_source_link",
    };
  });

  const linkedComplaintIds = new Set<string>();
  for (const wo of roadOrders) {
    for (const cid of wo.complaintIds) linkedComplaintIds.add(cid);
  }

  const complaints: PassportComplaint[] = ds.complaints
    .filter((c) => linkedComplaintIds.has(c.id) || (c.ward === road.ward && c.locality.toLowerCase().includes(road.name.toLowerCase())))
    .map((c) => ({
      ...c,
      evidenceType: linkedComplaintIds.has(c.id)
        ? "explicit_source_link"
        : "inferred_candidate",
      distanceToRoadM: null,
    }));

  const accidents = ds.accidents.filter((a) => a.roadId === road.id);
  const facilities = ds.facilities.filter(
    (fac) => fac.ambulanceEntryRoad === road.id || (fac.ward === road.ward && fac.emergencyServices),
  );
  const floodHotspots = ds.floodHotspots.filter((h) => h.ward === road.ward);
  const traffic = ds.traffic.find((t) => t.roadId === road.id) ?? null;

  const totalBilledInr = workOrders.reduce((sum, wo) => sum + wo.costInr, 0);
  const totalExpectedInr = workOrders.reduce((sum, wo) => sum + wo.expectedCostInr, 0);
  const reopenedCount = workOrders.filter((wo) => wo.reopened).length;
  const slaMetCount = workOrders.filter((wo) => wo.slaMet).length;
  const flaggedOrders = new Set(roadFlags.map((f) => f.workOrderId));
  const flaggedInr = workOrders
    .filter((wo) => flaggedOrders.has(wo.id))
    .reduce((sum, wo) => sum + wo.costInr, 0);
  const failedInr = workOrders
    .filter((wo) => !flaggedOrders.has(wo.id) && wo.reopened)
    .reduce((sum, wo) => sum + wo.costInr, 0);
  const heldInr = Math.max(0, totalBilledInr - flaggedInr - failedInr);

  const methodMap = new Map<string, { billed: number; orders: number; reopened: number }>();
  for (const wo of workOrders) {
    const cur = methodMap.get(wo.method) ?? { billed: 0, orders: 0, reopened: 0 };
    cur.billed += wo.costInr;
    cur.orders += 1;
    if (wo.reopened) cur.reopened += 1;
    methodMap.set(wo.method, cur);
  }

  const methodBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    billedInr: data.billed,
    orders: data.orders,
    reopenRate: data.orders > 0 ? data.reopened / data.orders : 0,
  }));

  const contractorMap = new Map<string, { name: string; billed: number; orders: number; reopened: number }>();
  for (const wo of workOrders) {
    const cur = contractorMap.get(wo.contractorId) ?? {
      name: wo.contractorName,
      billed: 0,
      orders: 0,
      reopened: 0,
    };
    cur.billed += wo.costInr;
    cur.orders += 1;
    if (wo.reopened) cur.reopened += 1;
    contractorMap.set(wo.contractorId, cur);
  }

  const contractorBreakdown = Array.from(contractorMap.entries()).map(([id, data]) => ({
    contractorId: id,
    contractorName: data.name,
    billedInr: data.billed,
    orders: data.orders,
    reopenRate: data.orders > 0 ? data.reopened / data.orders : 0,
  }));

  const recommendedActions = buildRecommendedActions(
    road,
    workOrders,
    complaints,
    roadFlags,
    accidents,
    floodHotspots,
  );

  const evidenceEdges = buildEvidenceEdges(road, workOrders, complaints, facilities);
  const socialCorroboration = matchSocialPostsForRoad(road, ds.socialPosts);

  return {
    road,
    workOrders,
    complaints,
    accidents,
    facilities,
    floodHotspots,
    traffic,
    socialCorroboration,
    summary: {
      totalBilledInr,
      expectedCostInr: totalExpectedInr,
      varianceInr: Math.max(0, totalBilledInr - totalExpectedInr),
      totalOrders: workOrders.length,
      reopenedOrders: reopenedCount,
      reopenRate: workOrders.length > 0 ? reopenedCount / workOrders.length : 0,
      slaMetOrders: slaMetCount,
      slaRate: workOrders.length > 0 ? slaMetCount / workOrders.length : 0,
      totalComplaints: complaints.length,
      openComplaints: complaints.filter((c) => c.status.toLowerCase().includes("open")).length,
      auditFlagCount: roadFlags.length,
      accidentCount: accidents.length,
      nearbyFacilitiesCount: facilities.length,
      heldInr,
      failedInr,
      flaggedInr,
    },
    methodBreakdown,
    contractorBreakdown,
    recommendedActions,
    evidenceEdges,
    provenance: {
      datasetSource: "Simulated Mumbai Civic Records (data/rupee/)",
      algorithmVersion: "2.0.0-evidence-engine",
      generatedAt: new Date().toISOString(),
      isSynthetic: true,
      contractualDisclaimer:
        "Amounts shown represent amounts billed in municipal work orders. Recorded completion does not constitute certified physical quality. DLP liability requires original contractual clauses not present in this dataset.",
    },
  };
}

function buildRecommendedActions(
  road: RoadPassportData["road"],
  workOrders: PassportWorkOrder[],
  complaints: PassportComplaint[],
  flags: ReturnType<typeof getRupee>["flags"],
  accidents: RoadPassportData["accidents"],
  floodHotspots: RoadPassportData["floodHotspots"],
): PassportRecommendedAction[] {
  const actions: PassportRecommendedAction[] = [];

  if (road.underDlp && workOrders.length > 0) {
    actions.push({
      kind: "dlp_verification",
      priority: "critical",
      headline: "Verify Defect Liability Period Guarantee",
      explanation: `Road marked as active DLP (resurfaced ${road.lastResurfaced}). Check whether recent work was billed to public budget instead of contractor warranty.`,
      targetEntityId: road.id,
      actionRequiredBy: "Executive Engineer (Roads)",
    });
  }

  const reopenRate = workOrders.length > 0 ? workOrders.filter((w) => w.reopened).length / workOrders.length : 0;
  if (reopenRate >= 0.25) {
    actions.push({
      kind: "repeated_failure_review",
      priority: "high",
      headline: "Investigate Chronic Premature Failure",
      explanation: `${Math.round(reopenRate * 100)}% of repairs on this road reopened within 30 days. Investigate sub-base water ingress or material batch quality.`,
      targetEntityId: road.id,
      actionRequiredBy: "Quality Control & Vigilance Cell",
    });
  }

  if (flags.length > 0) {
    actions.push({
      kind: "field_quality_audit",
      priority: "high",
      headline: `Audit Review Required (${flags.length} flag${flags.length > 1 ? "s" : ""})`,
      explanation: `Audit flags detected (cost anomaly, repeat repair, or phantom completion). Inspect supervisor measurement book (eMB).`,
      targetEntityId: road.id,
      actionRequiredBy: "Chief Accountant & Internal Audit",
    });
  }

  if (accidents.length >= 2) {
    actions.push({
      kind: "field_quality_audit",
      priority: "medium",
      headline: "Public Safety & Surface Skid Audit",
      explanation: `${accidents.length} accident(s) recorded along this corridor. Check road surface friction, pothole hazards, and traffic calming measures.`,
      targetEntityId: road.id,
      actionRequiredBy: "Traffic Police Liaison & Ward Road Engineer",
    });
  }

  if (floodHotspots.length > 0) {
    actions.push({
      kind: "flood_resilience_upgrade",
      priority: "medium",
      headline: "Drainage Cross-Section Assessment",
      explanation: `Ward ${road.ward} contains chronic flood hotspots. Verify road camber, side-drain inlets, and desilting coordination.`,
      targetEntityId: road.id,
      actionRequiredBy: "Storm Water Drains (SWD) Dept",
    });
  }

  if (actions.length === 0) {
    actions.push({
      kind: "routine_monitoring",
      priority: "low",
      headline: "Routine Scheduled Maintenance",
      explanation: "No critical audit flags or abnormal reopening rates detected. Maintain standard seasonal monitoring schedule.",
      targetEntityId: road.id,
      actionRequiredBy: "Junior Engineer (Maintenance)",
    });
  }

  return actions;
}
