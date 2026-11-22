import type { Dataset } from "./load";
import type { Road, WorkOrder } from "./types";
import { formatInr } from "./format";
import { expectedCostInr } from "./audit";

export type CostAnomalyType = "rate_card_markup" | "unit_cost_outlier";

export type CostAnomalyItem = {
  workOrderId: string;
  roadId: string;
  roadName: string;
  ward: string;
  contractorId: string;
  contractorName: string;
  method: string;
  areaSqm: number;
  costInr: number;
  benchmarkInr: number;
  markupPct: number;
  amountAtRiskInr: number;
  anomalyType: CostAnomalyType;
  reason: string;
};

export type ContractorCostSkew = {
  contractorId: string;
  contractorName: string;
  ordersCount: number;
  medianCostRatio: number;
  shrunkenRatio: number; // Bayesian shrinkage toward 1.0 for small samples
  limitedData: boolean;
  totalExcessBilledInr: number;
  flaggedOrdersCount: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function detectCostAnomalies(
  ds: Dataset,
  thresholdMultiplier = 1.35,
): CostAnomalyItem[] {
  const roadById = new Map(ds.roads.map((r) => [r.id, r]));
  const anomalies: CostAnomalyItem[] = [];

  // Group unit costs by method for unit cost outlier analysis
  const unitCostsByMethod = new Map<string, number[]>();
  for (const o of ds.workOrders) {
    if (o.areaSqm > 0 && o.costInr > 0) {
      const list = unitCostsByMethod.get(o.method) ?? [];
      list.push(o.costInr / o.areaSqm);
      unitCostsByMethod.set(o.method, list);
    }
  }

  const medianUnitCostByMethod = new Map<string, number>();
  for (const [method, costs] of unitCostsByMethod.entries()) {
    medianUnitCostByMethod.set(method, median(costs));
  }

  for (const order of ds.workOrders) {
    const road = roadById.get(order.roadId);
    const roadName = road?.name ?? order.roadId;
    const benchmark = expectedCostInr(ds, order);

    if (benchmark != null && benchmark > 0 && order.costInr > benchmark * thresholdMultiplier) {
      const amountAtRisk = Math.round(order.costInr - benchmark);
      const markupPct = Math.round(((order.costInr - benchmark) / benchmark) * 100);

      anomalies.push({
        workOrderId: order.id,
        roadId: order.roadId,
        roadName,
        ward: order.ward,
        contractorId: order.contractorId,
        contractorName: order.contractorName,
        method: order.method,
        areaSqm: order.areaSqm,
        costInr: order.costInr,
        benchmarkInr: benchmark,
        markupPct,
        amountAtRiskInr: amountAtRisk,
        anomalyType: "rate_card_markup",
        reason: `Billed ${formatInr(order.costInr)} exceeds rate-card expectation (${formatInr(benchmark)}) by ${markupPct}% (+${formatInr(amountAtRisk)}).`,
      });
      continue;
    }

    // Secondary check: unit cost outlier if rate card is absent or job-based with anomalous per-sqm cost
    if (order.areaSqm > 0) {
      const unitCost = order.costInr / order.areaSqm;
      const medianRate = medianUnitCostByMethod.get(order.method);
      if (medianRate != null && medianRate > 0 && unitCost > medianRate * 2.0 && order.costInr > 10_000) {
        const expectedTotal = Math.round(medianRate * order.areaSqm);
        const amountAtRisk = Math.round(order.costInr - expectedTotal);
        const markupPct = Math.round(((unitCost - medianRate) / medianRate) * 100);

        anomalies.push({
          workOrderId: order.id,
          roadId: order.roadId,
          roadName,
          ward: order.ward,
          contractorId: order.contractorId,
          contractorName: order.contractorName,
          method: order.method,
          areaSqm: order.areaSqm,
          costInr: order.costInr,
          benchmarkInr: expectedTotal,
          markupPct,
          amountAtRiskInr: amountAtRisk,
          anomalyType: "unit_cost_outlier",
          reason: `Unit rate ${formatInr(Math.round(unitCost))}/sqm is ${markupPct}% higher than peer median (${formatInr(Math.round(medianRate))}/sqm) for ${order.method}.`,
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.amountAtRiskInr - a.amountAtRiskInr);
}

export function analyzeContractorCostSkew(ds: Dataset): ContractorCostSkew[] {
  const anomalies = detectCostAnomalies(ds);
  const excessByContractor = new Map<string, number>();
  const flaggedCountByContractor = new Map<string, number>();

  for (const a of anomalies) {
    excessByContractor.set(a.contractorId, (excessByContractor.get(a.contractorId) ?? 0) + a.amountAtRiskInr);
    flaggedCountByContractor.set(a.contractorId, (flaggedCountByContractor.get(a.contractorId) ?? 0) + 1);
  }

  const ratiosByContractor = new Map<string, number[]>();
  const nameByContractor = new Map<string, string>();

  for (const order of ds.workOrders) {
    nameByContractor.set(order.contractorId, order.contractorName);
    const benchmark = expectedCostInr(ds, order);
    if (benchmark != null && benchmark > 0) {
      const list = ratiosByContractor.get(order.contractorId) ?? [];
      list.push(order.costInr / benchmark);
      ratiosByContractor.set(order.contractorId, list);
    }
  }

  const profiles: ContractorCostSkew[] = [];

  for (const [cId, ratios] of ratiosByContractor.entries()) {
    const rawMedian = median(ratios);
    const n = ratios.length;
    const limitedData = n < 15;
    // Bayesian shrinkage toward 1.0 (baseline) when sample size is small
    const priorWeight = 10;
    const shrunken = (rawMedian * n + 1.0 * priorWeight) / (n + priorWeight);

    profiles.push({
      contractorId: cId,
      contractorName: nameByContractor.get(cId) ?? cId,
      ordersCount: n,
      medianCostRatio: Number(rawMedian.toFixed(2)),
      shrunkenRatio: Number(shrunken.toFixed(2)),
      limitedData,
      totalExcessBilledInr: excessByContractor.get(cId) ?? 0,
      flaggedOrdersCount: flaggedCountByContractor.get(cId) ?? 0,
    });
  }

  return profiles.sort((a, b) => b.totalExcessBilledInr - a.totalExcessBilledInr);
}
