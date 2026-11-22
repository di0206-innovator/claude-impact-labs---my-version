import type { Dataset } from "./load";
import type { Road, WorkOrder } from "./types";
import { formatInr } from "./format";

/** Surface defect types covered under resurfacing Defect Liability Period warranties. */
export const DLP_COVERED_WORK_TYPES = new Set([
  "Pothole",
  "Broken paver blocks",
  "Road cave-in",
  "Uneven road surface",
]);

export type DlpConflictOrder = {
  workOrderId: string;
  roadId: string;
  roadName: string;
  ward: string;
  contractorId: string;
  contractorName: string;
  workType: string;
  method: string;
  costInr: number;
  completedAt: string;
  lastResurfaced: string;
  screeningNote: string;
  recommendedAction: string;
};

export type DlpWardSummary = {
  ward: string;
  roadsUnderDlpCount: number;
  totalOrdersOnDlpRoads: number;
  conflictingOrdersCount: number;
  totalAmountAtRiskInr: number;
  roadsAffected: string[];
};

export type DlpScreeningReport = {
  totalConflicts: number;
  totalAmountAtRiskInr: number;
  items: DlpConflictOrder[];
  byWard: Map<string, DlpWardSummary>;
  disclaimer: string;
};

export function isSurfaceWorkCoveredByDlp(workType: string): boolean {
  for (const covered of DLP_COVERED_WORK_TYPES) {
    if (workType.toLowerCase().includes(covered.toLowerCase()) || covered.toLowerCase().includes(workType.toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function screenDlpWorkOrders(ds: Dataset): DlpScreeningReport {
  const roadById = new Map<string, Road>(ds.roads.map((r) => [r.id, r]));
  const items: DlpConflictOrder[] = [];
  const wardSummaries = new Map<string, DlpWardSummary>();

  for (const road of ds.roads) {
    if (!wardSummaries.has(road.ward)) {
      wardSummaries.set(road.ward, {
        ward: road.ward,
        roadsUnderDlpCount: 0,
        totalOrdersOnDlpRoads: 0,
        conflictingOrdersCount: 0,
        totalAmountAtRiskInr: 0,
        roadsAffected: [],
      });
    }
    if (road.underDlp) {
      wardSummaries.get(road.ward)!.roadsUnderDlpCount++;
    }
  }

  for (const order of ds.workOrders) {
    const road = roadById.get(order.roadId);
    if (!road?.underDlp) continue;

    const wardSum = wardSummaries.get(order.ward);
    if (wardSum) wardSum.totalOrdersOnDlpRoads++;

    if (!isSurfaceWorkCoveredByDlp(order.workType)) continue;

    const conflict: DlpConflictOrder = {
      workOrderId: order.id,
      roadId: order.roadId,
      roadName: road.name,
      ward: order.ward,
      contractorId: order.contractorId,
      contractorName: order.contractorName,
      workType: order.workType,
      method: order.method,
      costInr: order.costInr,
      completedAt: order.completedAt,
      lastResurfaced: road.lastResurfaced,
      screeningNote: `Road "${road.name}" is under Defect Liability Period (resurfaced ${road.lastResurfaced}). Surface repair (${order.workType}) billed at ${formatInr(order.costInr)} should be covered under contractor warranty.`,
      recommendedAction: "Verify original DLP concession contract; issue demand notice to contractor if covered.",
    };

    items.push(conflict);

    if (wardSum) {
      wardSum.conflictingOrdersCount++;
      wardSum.totalAmountAtRiskInr += order.costInr;
      if (!wardSum.roadsAffected.includes(road.name)) {
        wardSum.roadsAffected.push(road.name);
      }
    }
  }

  const totalAmountAtRiskInr = items.reduce((sum, item) => sum + item.costInr, 0);

  return {
    totalConflicts: items.length,
    totalAmountAtRiskInr,
    items: items.sort((a, b) => b.costInr - a.costInr),
    byWard: wardSummaries,
    disclaimer: "Defect Liability screening indicates potential contractual warranty overlap. under_dlp is a screening hint, NEVER a confirmed contractual liability verdict.",
  };
}
