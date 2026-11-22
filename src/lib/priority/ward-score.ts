import type { Dataset } from "../rupee/load";
import type { WardLedger } from "../rupee/types";
import type { DisparityStatus, RoadSpendVsNeed, WardSpendVsNeed } from "./types";

export function calculateWardSpendVsNeed(
  ds: Dataset,
  roads: RoadSpendVsNeed[],
  ledgers: WardLedger[],
): WardSpendVsNeed[] {
  const ledgerMap = new Map(ledgers.map((l) => [l.ward.code, l]));
  const roadsByWard = new Map<string, RoadSpendVsNeed[]>();
  for (const r of roads) {
    const list = roadsByWard.get(r.ward) ?? [];
    list.push(r);
    roadsByWard.set(r.ward, list);
  }

  const floodByWard = new Map<string, number>();
  for (const h of ds.floodHotspots) {
    floodByWard.set(h.ward, (floodByWard.get(h.ward) ?? 0) + 1);
  }

  const rawWards = ds.wards.map((w) => {
    const ledger = ledgerMap.get(w.code);
    const wardRoads = roadsByWard.get(w.code) ?? [];
    const avgRoadNeed = wardRoads.length
      ? wardRoads.reduce((sum, r) => sum + r.needScore, 0) / wardRoads.length
      : 20;

    const floodCount = floodByWard.get(w.code) ?? 0;
    const floodScore = Math.min(100, floodCount * 18 + Math.round(w.lowLyingIndex * 40));
    const openComplaints = wardRoads.reduce((sum, r) => sum + r.openComplaintsCount, 0);
    const complaintsScore = Math.min(100, openComplaints * 5);
    const failScore = Math.round((ledger?.reopenRate ?? 0) * 100);

    const needScore = Math.min(
      100,
      Math.max(10, Math.round(0.45 * avgRoadNeed + 0.25 * complaintsScore + 0.15 * floodScore + 0.15 * failScore)),
    );

    const spentInr = ledger?.spentInr ?? 0;
    const budgetInr = ledger?.budgetInr ?? w.budgetInr;

    return {
      wardCode: w.code,
      wardName: w.name,
      zone: w.zone,
      needScore,
      budgetInr,
      spentInr,
      roadsCount: wardRoads.length,
      openComplaints,
      floodHotspots: floodCount,
      accidents: wardRoads.reduce((sum, r) => sum + (r.dimensions.accidentsScore > 0 ? 1 : 0), 0),
      slaRate: ledger?.slaRate ?? 1,
      reopenRate: ledger?.reopenRate ?? 0,
    };
  });

  const totalNeed = Math.max(1, rawWards.reduce((sum, w) => sum + w.needScore, 0));
  const totalSpent = Math.max(1, rawWards.reduce((sum, w) => sum + w.spentInr, 0));
  const totalBudget = Math.max(1, rawWards.reduce((sum, w) => sum + w.budgetInr, 0));

  const items: WardSpendVsNeed[] = rawWards.map((w) => {
    const needSharePct = Number(((w.needScore / totalNeed) * 100).toFixed(2));
    const spendSharePct = Number(((w.spentInr / totalSpent) * 100).toFixed(2));
    const budgetSharePct = Number(((w.budgetInr / totalBudget) * 100).toFixed(2));
    const disparityIndex = Number((spendSharePct - needSharePct).toFixed(2));
    const spendToNeedRatio = Number((spendSharePct / Math.max(0.01, needSharePct)).toFixed(2));
    const expectedSpendInr = Math.round(totalSpent * (needSharePct / 100));
    const unfundedNeedInr = Math.max(0, expectedSpendInr - w.spentInr);

    let status: DisparityStatus = "equitable";
    if (spendToNeedRatio < 0.75) status = "critical_deficit";
    else if (spendToNeedRatio < 0.92) status = "moderate_deficit";
    else if (spendToNeedRatio > 1.25) status = "surplus";

    return {
      ...w,
      needRank: 0,
      spendRank: 0,
      disparityRank: 0,
      needSharePct,
      spendSharePct,
      budgetSharePct,
      disparityIndex,
      spendToNeedRatio,
      expectedSpendInr,
      unfundedNeedInr,
      status,
    };
  });

  // Assign Ranks
  const byNeed = [...items].sort((a, b) => b.needScore - a.needScore);
  byNeed.forEach((w, i) => (w.needRank = i + 1));

  const bySpend = [...items].sort((a, b) => b.spentInr - a.spentInr);
  bySpend.forEach((w, i) => (w.spendRank = i + 1));

  const byDisparity = [...items].sort((a, b) => a.disparityIndex - b.disparityIndex);
  byDisparity.forEach((w, i) => (w.disparityRank = i + 1));

  return items;
}
