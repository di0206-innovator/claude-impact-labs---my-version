import type { CostPart, DurabilityPart, ScoreBand, ScoredOrder, SpeedPart } from "./types";

export const WEIGHTS = { durability: 0.45, cost: 0.3, speed: 0.25 } as const;
/** Below this many jobs a contractor is "Limited data". Also the weight of the pull toward 50. */
export const PRIOR_JOBS = 20;
const PRIOR_SCORE = 50;

/** Piecewise linear transfer function: 0 is perfect (100), 1 is as expected (50), 2 is twice as bad (0). */
export function ratioScore(ratio: number): number {
  if (ratio <= 1.0) {
    return 100 - 50 * ratio;
  }
  return Math.max(0, 50 - 50 * (ratio - 1.0));
}

export function bandOf(overall: number, jobs: number): ScoreBand {
  if (jobs < PRIOR_JOBS) return "Limited data";
  if (overall >= 60) return "Strong";
  if (overall >= 40) return "As expected";
  return "Needs attention";
}

/** Pulls small contractors toward "as expected" so a handful of jobs cannot swing a score. */
export function adjustForSample(raw: number, jobs: number): number {
  return (jobs * raw + PRIOR_JOBS * PRIOR_SCORE) / (jobs + PRIOR_JOBS);
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const share = (orders: ScoredOrder[], pick: (o: ScoredOrder) => boolean) =>
  orders.length ? orders.filter(pick).length / orders.length : 0;
const safeRatio = (actual: number, expected: number) => (expected > 0 ? actual / expected : 0);

/** City-wide failure and SLA-miss rate for each repair method at each stress level. */
export type Buckets = { reopenRate: (o: ScoredOrder) => number; slaMissRate: (o: ScoredOrder) => number };

export function buildBuckets(orders: ScoredOrder[]): Buckets {
  const groups = new Map<string, ScoredOrder[]>();
  for (const o of orders) {
    const key = `${o.method}|${o.stress}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const reopen = new Map([...groups].map(([k, g]) => [k, share(g, (o) => o.reopened)]));
  const miss = new Map([...groups].map(([k, g]) => [k, share(g, (o) => !o.slaMet)]));
  return {
    reopenRate: (o) => reopen.get(`${o.method}|${o.stress}`) ?? 0,
    slaMissRate: (o) => miss.get(`${o.method}|${o.stress}`) ?? 0,
  };
}

export function durabilityPart(orders: ScoredOrder[], buckets: Buckets): DurabilityPart {
  const actualRate = share(orders, (o) => o.reopened);
  const expectedRate = mean(orders.map(buckets.reopenRate));
  const ratio = safeRatio(actualRate, expectedRate);
  return { score: ratioScore(ratio), ratio, actualRate, expectedRate, failures: orders.filter((o) => o.reopened).length };
}

export function speedPart(orders: ScoredOrder[], buckets: Buckets): SpeedPart {
  const actualRate = share(orders, (o) => !o.slaMet);
  const expectedRate = mean(orders.map(buckets.slaMissRate));
  const ratio = safeRatio(actualRate, expectedRate);
  return { score: ratioScore(ratio), ratio, actualRate, expectedRate, misses: orders.filter((o) => !o.slaMet).length };
}

/** 70% how far over the rate card they bill on average, 30% how often they bill far over it. */
export function costPart(orders: ScoredOrder[], cityOutlierShare: number): CostPart {
  const avgCostRatio = mean(orders.map((o) => o.costRatio));
  const costRatioScore = ratioScore(avgCostRatio);
  const outlierShare = share(orders, (o) => o.overBilled);
  const outlierRatio = safeRatio(outlierShare, cityOutlierShare);
  const outlierScore = ratioScore(outlierRatio);
  return {
    score: 0.7 * costRatioScore + 0.3 * outlierScore,
    ratio: avgCostRatio,
    avgCostRatio,
    costRatioScore,
    outlierShare,
    cityOutlierShare,
    outlierScore,
    outlierJobs: orders.filter((o) => o.overBilled).length,
  };
}

export function overallOf(
  durability: number,
  cost: number,
  speed: number,
  repeatShare: number = 0,
  auditFlagCount: number = 0,
): number {
  const base = WEIGHTS.durability * durability + WEIGHTS.cost * cost + WEIGHTS.speed * speed;
  const repeatPenalty = Math.min(15, repeatShare * 30);
  const flagPenalty = Math.min(15, auditFlagCount * 0.2);
  return Math.max(0, base - repeatPenalty - flagPenalty);
}
