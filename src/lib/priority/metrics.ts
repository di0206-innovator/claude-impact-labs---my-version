import type { CityDisparityMetrics, WardSpendVsNeed } from "./types";

export function calculateDisparityMetrics(wards: WardSpendVsNeed[]): CityDisparityMetrics {
  const n = wards.length;
  const ratios = wards.map((w) => w.spendToNeedRatio);
  const sumRatio = Math.max(0.001, ratios.reduce((a, b) => a + b, 0));

  let diffSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      diffSum += Math.abs(ratios[i] - ratios[j]);
    }
  }
  const giniCoefficient = Number((diffSum / (2 * n * sumRatio)).toFixed(3));

  const sortedByDisparity = [...wards].sort((a, b) => a.disparityIndex - b.disparityIndex);
  const maxDeficit = sortedByDisparity[0] ?? {
    wardCode: "N/A",
    wardName: "N/A",
    disparityIndex: 0,
    unfundedNeedInr: 0,
    spentInr: 0,
    expectedSpendInr: 0,
  };
  const maxSurplus = sortedByDisparity[sortedByDisparity.length - 1] ?? {
    wardCode: "N/A",
    wardName: "N/A",
    disparityIndex: 0,
    unfundedNeedInr: 0,
    spentInr: 0,
    expectedSpendInr: 0,
  };

  const disparitySpread = Number(
    (maxSurplus.disparityIndex - maxDeficit.disparityIndex).toFixed(2),
  );

  return {
    totalNeedScore: wards.reduce((sum, w) => sum + w.needScore, 0),
    totalBudgetInr: wards.reduce((sum, w) => sum + w.budgetInr, 0),
    totalSpentInr: wards.reduce((sum, w) => sum + w.spentInr, 0),
    giniCoefficient,
    disparitySpread,
    criticalDeficitWardsCount: wards.filter((w) => w.status === "critical_deficit").length,
    moderateDeficitWardsCount: wards.filter((w) => w.status === "moderate_deficit").length,
    equitableWardsCount: wards.filter((w) => w.status === "equitable").length,
    surplusWardsCount: wards.filter((w) => w.status === "surplus").length,
    totalUnderfundedQuantumInr: wards.reduce((sum, w) => sum + w.unfundedNeedInr, 0),
    maxDeficitWard: {
      wardCode: maxDeficit.wardCode,
      wardName: maxDeficit.wardName,
      deficitPct: maxDeficit.disparityIndex,
      shortfallInr: maxDeficit.unfundedNeedInr,
    },
    maxSurplusWard: {
      wardCode: maxSurplus.wardCode,
      wardName: maxSurplus.wardName,
      surplusPct: maxSurplus.disparityIndex,
      excessInr: Math.max(0, maxSurplus.spentInr - maxSurplus.expectedSpendInr),
    },
  };
}
