import { getRupee } from "../rupee/index";
import type { BudgetScenario, RoadPriorityRank } from "./types";

export type PriorityWeights = {
  vulnerability: number; // default 25
  safety: number; // default 25
  deficit: number; // default 20
  burden: number; // default 15
  equity: number; // default 15
};

export const DEFAULT_WEIGHTS: PriorityWeights = {
  vulnerability: 25,
  safety: 25,
  deficit: 20,
  burden: 15,
  equity: 15,
};

export function rankRoadPriorities(
  customWeights?: Partial<PriorityWeights>,
  wardFilter?: string,
): RoadPriorityRank[] {
  const { ds, flags, ledgers } = getRupee();
  const weights: PriorityWeights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const ledgerByWard = new Map(ledgers.map((l) => [l.ward.code, l]));
  const ordersByRoad = new Map<string, typeof ds.workOrders>();
  for (const o of ds.workOrders) {
    const list = ordersByRoad.get(o.roadId) ?? [];
    list.push(o);
    ordersByRoad.set(o.roadId, list);
  }

  const accidentsByRoad = new Map<string, number>();
  for (const a of ds.accidents) {
    accidentsByRoad.set(a.roadId, (accidentsByRoad.get(a.roadId) ?? 0) + 1);
  }

  const facilitiesByRoad = new Map<string, number>();
  for (const f of ds.facilities) {
    if (f.ambulanceEntryRoad) {
      facilitiesByRoad.set(f.ambulanceEntryRoad, (facilitiesByRoad.get(f.ambulanceEntryRoad) ?? 0) + 1);
    }
  }

  const floodByWard = new Map<string, number>();
  for (const h of ds.floodHotspots) {
    floodByWard.set(h.ward, (floodByWard.get(h.ward) ?? 0) + 1);
  }

  const trafficByRoad = new Map(ds.traffic.map((t) => [t.roadId, t]));

  let roads = ds.roads;
  if (wardFilter) roads = roads.filter((r) => r.ward === wardFilter);

  const results: RoadPriorityRank[] = roads.map((road) => {
    const ledger = ledgerByWard.get(road.ward);
    const orders = ordersByRoad.get(road.id) ?? [];
    const accidentCount = accidentsByRoad.get(road.id) ?? 0;
    const facilityCount = facilitiesByRoad.get(road.id) ?? 0;
    const wardFloodCount = floodByWard.get(road.ward) ?? 0;
    const traffic = trafficByRoad.get(road.id);

    // 1. Vulnerability score (0-100)
    let vulnScore = (ledger?.ward.lowLyingIndex ?? 0.3) * 40;
    if (wardFloodCount > 0) vulnScore += Math.min(30, wardFloodCount * 10);
    if (road.surface.toLowerCase().includes("paver") || road.surface.toLowerCase().includes("asphalt")) vulnScore += 30;
    vulnScore = Math.min(100, Math.round(vulnScore));

    // 2. Safety score (0-100)
    let safetyScore = Math.min(60, accidentCount * 20);
    if (facilityCount > 0) safetyScore += Math.min(40, facilityCount * 25);
    if (road.busRoute) safetyScore += 15;
    safetyScore = Math.min(100, Math.round(safetyScore));

    // 3. Service deficit score (0-100)
    const openComplaintsCount = Math.min(70, (ledger?.complaints.stillOpen ?? 0) > 20 ? 60 : 30);
    const slaMissCount = orders.filter((o) => !o.slaMet).length;
    let deficitScore = openComplaintsCount + Math.min(30, slaMissCount * 15);
    deficitScore = Math.min(100, Math.round(deficitScore));

    // 4. Maintenance burden score (0-100)
    const reopenOrders = orders.filter((o) => o.reopened).length;
    let burdenScore = Math.min(70, reopenOrders * 25);
    if (orders.length >= 4) burdenScore += 30;
    burdenScore = Math.min(100, Math.round(burdenScore));

    // 5. Resource equity score (0-100)
    const spentShare = ledger ? ledger.spentInr / Math.max(1, ledger.budgetInr) : 0.5;
    let equityScore = Math.round((1 - Math.min(1, spentShare)) * 100);
    equityScore = Math.max(10, Math.min(100, equityScore));

    // Composite weighted score
    const totalWeight =
      weights.vulnerability + weights.safety + weights.deficit + weights.burden + weights.equity;
    const compositeScore = Math.round(
      (vulnScore * weights.vulnerability +
        safetyScore * weights.safety +
        deficitScore * weights.deficit +
        burdenScore * weights.burden +
        equityScore * weights.equity) /
        Math.max(1, totalWeight),
    );

    // Recommended intervention & estimated cost
    let intervention = "Mastic Asphalt Resurfacing";
    let estCostInr = Math.round(road.lengthM * 1800);
    if (road.surface.toLowerCase().includes("paver")) {
      intervention = "Paver block replacement with reinforced concrete";
      estCostInr = Math.round(road.lengthM * 2400);
    } else if (wardFloodCount > 0) {
      intervention = "High-camber waterproof mastic and roadside catch-pit overhaul";
      estCostInr = Math.round(road.lengthM * 2800);
    }

    return {
      rank: 0,
      roadId: road.id,
      roadName: road.name,
      ward: road.ward,
      compositeScore,
      dimensions: {
        infrastructureVulnerability: {
          name: "Infrastructure Vulnerability",
          weight: weights.vulnerability,
          score: vulnScore,
          rationale: `Ward low-lying factor ${(ledger?.ward.lowLyingIndex ?? 0).toFixed(2)}, surface ${road.surface}`,
        },
        publicSafety: {
          name: "Public Safety",
          weight: weights.safety,
          score: safetyScore,
          rationale: `${accidentCount} accidents recorded; ${facilityCount} critical ambulance routes`,
        },
        serviceDeficit: {
          name: "Service Deficit",
          weight: weights.deficit,
          score: deficitScore,
          rationale: `${ledger?.complaints.stillOpen ?? 0} open complaints in ward; ${slaMissCount} SLA misses`,
        },
        maintenanceBurden: {
          name: "Maintenance Burden",
          weight: weights.burden,
          score: burdenScore,
          rationale: `${reopenOrders} orders re-opened within 30 days of repair`,
        },
        resourceEquity: {
          name: "Resource Equity",
          weight: weights.equity,
          score: equityScore,
          rationale: `Budget consumption relative to municipal allocation`,
        },
      },
      recommendedIntervention: intervention,
      estCostInr,
      underDlp: road.underDlp,
    };
  });

  results.sort((a, b) => b.compositeScore - a.compositeScore);
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return results;
}

export function generateBudgetScenarios(envelopeInr?: number): BudgetScenario[] {
  const allRanked = rankRoadPriorities();

  const runScenario = (
    id: string,
    title: string,
    description: string,
    envelopeInr: number,
    rankedList: RoadPriorityRank[],
  ): BudgetScenario => {
    let allocated = 0;
    const funded: BudgetScenario["fundedRoads"] = [];

    for (const r of rankedList) {
      if (allocated + r.estCostInr <= envelopeInr) {
        allocated += r.estCostInr;
        funded.push({
          roadId: r.roadId,
          roadName: r.roadName,
          ward: r.ward,
          costInr: r.estCostInr,
          method: r.recommendedIntervention,
          priorityRank: r.rank,
          compositeScore: r.compositeScore,
        });
      }
    }

    return {
      id,
      title,
      description,
      budgetEnvelopeInr: envelopeInr,
      allocatedInr: allocated,
      roadsFundedCount: funded.length,
      fundedRoads: funded,
    };
  };

  return [
    runScenario(
      "pre_monsoon",
      "Pre-Monsoon Prevention",
      "Prioritises vulnerable surfaces and chronic flood hotspots before heavy monsoon showers begin.",
      envelopeInr ? Math.round(envelopeInr * 0.6) : 150000000, // ₹15 Cr
      rankRoadPriorities({ vulnerability: 40, safety: 20, deficit: 15, burden: 15, equity: 10 }),
    ),
    runScenario(
      "balanced",
      "Balanced Ward Allocation",
      "Equitably balances service deficit, safety, and infrastructure vulnerability across all 24 wards.",
      envelopeInr ?? 250000000, // ₹25 Cr
      allRanked,
    ),
    runScenario(
      "critical_safety",
      "High-Risk Public Safety First",
      "Targeted at corridors with recurring road accidents, hospital ambulance routes, and school transit zones.",
      envelopeInr ? Math.round(envelopeInr * 0.8) : 200000000, // ₹20 Cr
      rankRoadPriorities({ safety: 45, vulnerability: 20, deficit: 15, burden: 10, equity: 10 }),
    ),
    runScenario(
      "monsoon_emergency",
      "Monsoon Emergency Response",
      "Rapid deployment focus for open citizen complaints, recurring failures, and inundated roadways.",
      envelopeInr ? Math.round(envelopeInr * 1.4) : 350000000, // ₹35 Cr
      rankRoadPriorities({ deficit: 35, burden: 25, vulnerability: 25, safety: 10, equity: 5 }),
    ),
  ];
}
