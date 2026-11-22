import type { Dataset } from "./load";
import type { ActionQueueCategory, ActionQueueItem } from "../passport/types";
import { formatInr } from "./format";
import { detectCostAnomalies, type CostAnomalyItem } from "./cost-anomaly";
import { detectDuplicateBillings, type RepeatBillingCluster } from "./deduplication";
import { screenDlpWorkOrders, type DlpConflictOrder } from "./dlp";

export type AccountabilityAuditSummary = {
  totalOrdersAudited: number;
  totalBilledInr: number;
  totalAmountAtRiskInr: number;
  costAnomalies: { count: number; amountAtRiskInr: number; items: CostAnomalyItem[] };
  repeatBillings: { count: number; amountAtRiskInr: number; clusters: RepeatBillingCluster[] };
  dlpConflicts: { count: number; amountAtRiskInr: number; items: DlpConflictOrder[] };
  wardSummaries: Map<string, {
    ward: string;
    flaggedOrdersCount: number;
    amountAtRiskInr: number;
  }>;
};

export function runAccountabilityAudit(ds: Dataset): AccountabilityAuditSummary {
  const roadById = new Map(ds.roads.map((r) => [r.id, r]));
  const totalOrders = ds.workOrders.length;
  const totalBilled = ds.workOrders.reduce((sum, o) => sum + o.costInr, 0);

  const costAnomalies = detectCostAnomalies(ds);
  const costAtRisk = costAnomalies.reduce((sum, a) => sum + a.amountAtRiskInr, 0);

  const repeatBillings = detectDuplicateBillings(ds.workOrders, roadById);
  const repeatAtRisk = repeatBillings.reduce((sum, c) => sum + c.excessBilledInr, 0);

  const dlpReport = screenDlpWorkOrders(ds);
  const dlpAtRisk = dlpReport.totalAmountAtRiskInr;

  const wardSummaries = new Map<string, { ward: string; flaggedOrdersCount: number; amountAtRiskInr: number }>();
  for (const w of ds.wards) {
    wardSummaries.set(w.code, { ward: w.code, flaggedOrdersCount: 0, amountAtRiskInr: 0 });
  }

  for (const item of costAnomalies) {
    const entry = wardSummaries.get(item.ward);
    if (entry) {
      entry.flaggedOrdersCount++;
      entry.amountAtRiskInr += item.amountAtRiskInr;
    }
  }

  for (const rep of repeatBillings) {
    const entry = wardSummaries.get(rep.ward);
    if (entry) {
      entry.flaggedOrdersCount += rep.repeatOrderIds.length;
      entry.amountAtRiskInr += rep.excessBilledInr;
    }
  }

  for (const dlp of dlpReport.items) {
    const entry = wardSummaries.get(dlp.ward);
    if (entry) {
      entry.flaggedOrdersCount++;
      entry.amountAtRiskInr += dlp.costInr;
    }
  }

  const totalAtRisk = costAtRisk + repeatAtRisk + dlpAtRisk;

  return {
    totalOrdersAudited: totalOrders,
    totalBilledInr: totalBilled,
    totalAmountAtRiskInr: totalAtRisk,
    costAnomalies: { count: costAnomalies.length, amountAtRiskInr: costAtRisk, items: costAnomalies },
    repeatBillings: { count: repeatBillings.length, amountAtRiskInr: repeatAtRisk, clusters: repeatBillings },
    dlpConflicts: { count: dlpReport.totalConflicts, amountAtRiskInr: dlpAtRisk, items: dlpReport.items },
    wardSummaries,
  };
}

export function generateWardActionQueue(ds: Dataset, wardFilter?: string): ActionQueueItem[] {
  const roadById = new Map(ds.roads.map((r) => [r.id, r]));
  const queue: ActionQueueItem[] = [];

  // 1. DLP Warranty Conflicts -> Critical Priority
  const dlpReport = screenDlpWorkOrders(ds);
  for (const dlp of dlpReport.items) {
    if (wardFilter && dlp.ward !== wardFilter) continue;
    queue.push({
      id: `queue_dlp_${dlp.workOrderId}`,
      priority: "critical",
      category: "potential_dlp_conflict",
      headline: `DLP Warranty conflict on ${dlp.roadName}: ${dlp.workType} billed during defect period`,
      roadId: dlp.roadId,
      roadName: dlp.roadName,
      ward: dlp.ward,
      relatedEntityId: dlp.workOrderId,
      amountAtRiskInr: dlp.costInr,
      status: "new",
      recommendedAction: dlp.recommendedAction,
      reason: dlp.screeningNote,
      evidenceCount: 1,
    });
  }

  // 2. Repeat Work / Duplicate Billing Clusters -> Critical/High Priority
  const repeatClusters = detectDuplicateBillings(ds.workOrders, roadById);
  for (const rep of repeatClusters) {
    if (wardFilter && rep.ward !== wardFilter) continue;
    queue.push({
      id: `queue_repeat_${rep.clusterId}`,
      priority: rep.excessBilledInr >= 100_000 ? "critical" : "high",
      category: "repeat_work_cluster",
      headline: `Repeat repair cluster on ${rep.roadName} (${rep.repeatOrderIds.length + 1} orders within ${rep.daysApart}d)`,
      roadId: rep.roadId,
      roadName: rep.roadName,
      ward: rep.ward,
      relatedEntityId: rep.primaryOrderId,
      amountAtRiskInr: rep.excessBilledInr,
      status: "new",
      recommendedAction: "Inspect previous work order and physical road segment for overlap before clearing bill.",
      reason: rep.explanation,
      evidenceCount: rep.repeatOrderIds.length + 1,
    });
  }

  // 3. Cost Rate Card Anomalies -> High Priority
  const costAnomalies = detectCostAnomalies(ds);
  for (const cost of costAnomalies) {
    if (wardFilter && cost.ward !== wardFilter) continue;
    queue.push({
      id: `queue_cost_${cost.workOrderId}`,
      priority: cost.amountAtRiskInr >= 50_000 ? "high" : "medium",
      category: "cost_anomaly",
      headline: `Rate card variance on ${cost.roadName}: ${formatInr(cost.costInr)} (+${cost.markupPct}%)`,
      roadId: cost.roadId,
      roadName: cost.roadName,
      ward: cost.ward,
      relatedEntityId: cost.workOrderId,
      amountAtRiskInr: cost.amountAtRiskInr,
      status: "new",
      recommendedAction: "Review junior engineer measurement book (eMB) entry and rate-card breakdown.",
      reason: cost.reason,
      evidenceCount: 1,
    });
  }

  // 4. SLA Delays on high-priority arterial roads
  for (const wo of ds.workOrders) {
    if (wo.slaMet) continue;
    if (wardFilter && wo.ward !== wardFilter) continue;
    const road = roadById.get(wo.roadId);
    if (!road || (road.roadType !== "Major Arterial" && road.roadType !== "Arterial")) continue;
    queue.push({
      id: `queue_sla_${wo.id}`,
      priority: "high",
      category: "sla_breach",
      headline: `Turnaround SLA breach on ${road.name} (${wo.slaHours}h target exceeded)`,
      roadId: wo.roadId,
      roadName: road.name,
      ward: wo.ward,
      relatedEntityId: wo.id,
      amountAtRiskInr: wo.costInr,
      status: "under_review",
      recommendedAction: "Request contractor delay affidavit; evaluate liquidated damages clause.",
      reason: `Work order ${wo.id} missed turnaround SLA on key arterial corridor.`,
      evidenceCount: 1,
    });
  }

  const priorityRank = { critical: 0, high: 1, medium: 2 };
  queue.sort((a, b) => {
    const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.amountAtRiskInr - a.amountAtRiskInr;
  });

  return queue;
}
