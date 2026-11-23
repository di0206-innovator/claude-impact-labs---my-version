/**
 * Formula-based contractor scorecards.
 *
 *   Overall = 45% Durability + 30% Cost + 25% Speed
 *   every part: score = 100 / (1 + actual / expected)
 *   small-sample protection: (jobs x raw + 20 x 50) / (jobs + 20)
 *
 * Volume is shown, never scored.
 */

import type { Dataset } from "../load";
import { loadDataset } from "../load";
import { auditWorkOrders } from "../audit";
import type { AuditFlag } from "../types";
import { repeatsOf, methodSlices, volumeOf, wardSlices } from "./detail";
import { buildScoredOrders } from "./orders";
import { adjustForSample, bandOf, buildBuckets, costPart, durabilityPart, overallOf, speedPart } from "./score";
import type { ContractorScorecard, ScorecardSet } from "./types";

export * from "./types";
export { OUTLIER_FACTOR, REPEAT_WINDOW_DAYS } from "./orders";
export { PRIOR_JOBS, WEIGHTS, ratioScore } from "./score";

export function buildScorecards(ds: Dataset, customFlags?: AuditFlag[]): ScorecardSet {
  const all = buildScoredOrders(ds);
  const buckets = buildBuckets(all);
  const cityOutlierShare = all.filter((o) => o.overBilled).length / Math.max(all.length, 1);
  const flags = customFlags ?? auditWorkOrders(ds);

  const cards = ds.contractors
    .map((contractor) => {
      const orders = all.filter((o) => o.contractorId === contractor.id);
      if (orders.length === 0) return null;
      const durability = durabilityPart(orders, buckets);
      const cost = costPart(orders, cityOutlierShare);
      const speed = speedPart(orders, buckets);
      const repeats = repeatsOf(contractor.id, orders);
      const repeatShare = repeats.byThisContractor / Math.max(orders.length, 1);
      const auditFlagCount = flags.filter(
        (f) => f.contractorId === contractor.id && f.kind !== "paid_under_dlp",
      ).length;
      const rawOverall = overallOf(durability.score, cost.score, speed.score, repeatShare, auditFlagCount);
      const overall = adjustForSample(rawOverall, orders.length);
      return {
        id: contractor.id,
        name: contractor.name.replace(" (synthetic)", ""),
        empanelledSince: contractor.empanelledSince,
        rank: 0,
        band: bandOf(overall, orders.length),
        overall,
        rawOverall,
        durability,
        cost,
        speed,
        volume: volumeOf(orders),
        repeats,
        byWard: wardSlices(ds, orders, buckets),
        byMethod: methodSlices(orders, buckets),
        orders: [...orders].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
      } satisfies ContractorScorecard;
    })
    .filter((card): card is ContractorScorecard => card !== null)
    .sort((a, b) => b.overall - a.overall);
  cards.forEach((card, i) => (card.rank = i + 1));

  return {
    cards,
    city: {
      jobs: all.length,
      reopenRate: all.filter((o) => o.reopened).length / Math.max(all.length, 1),
      slaMissRate: all.filter((o) => !o.slaMet).length / Math.max(all.length, 1),
      outlierShare: cityOutlierShare,
    },
  };
}

let cached: ScorecardSet | null = null;

/** Computed once per process, like `getRupee()`. */
export function getScorecards(): ScorecardSet {
  if (!cached) cached = buildScorecards(loadDataset());
  return cached;
}
