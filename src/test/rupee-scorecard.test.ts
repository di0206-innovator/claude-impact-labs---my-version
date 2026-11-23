import { describe, expect, it } from "vitest";
import { loadDataset } from "../lib/rupee/load";
import { buildScorecards, WEIGHTS } from "../lib/rupee/scorecard";
import { adjustForSample, bandOf, ratioScore } from "../lib/rupee/scorecard/score";
import { percentileRanks, quantile } from "../lib/rupee/scorecard/stress";

const ds = loadDataset();
const set = buildScorecards(ds);

describe("score rule", () => {
  it("maps ratio to score via piecewise linear function with 2.0 mapping to 0", () => {
    expect(ratioScore(0)).toBe(100);
    expect(ratioScore(0.5)).toBe(75);
    expect(ratioScore(1)).toBe(50);
    expect(ratioScore(1.5)).toBe(25);
    expect(ratioScore(2)).toBe(0);
    expect(ratioScore(5)).toBe(0);
  });

  it("pulls small samples toward 50 and withholds a band under 20 jobs", () => {
    expect(adjustForSample(90, 20)).toBe(70);
    expect(adjustForSample(90, 0)).toBe(50);
    expect(bandOf(80, 19)).toBe("Limited data");
    expect(bandOf(60, 20)).toBe("Strong");
    expect(bandOf(59.9, 20)).toBe("As expected");
    expect(bandOf(40, 20)).toBe("As expected");
    expect(bandOf(39.9, 20)).toBe("Needs attention");
  });

  it("weights durability, cost and speed 45/30/25", () => {
    expect(WEIGHTS.durability + WEIGHTS.cost + WEIGHTS.speed).toBeCloseTo(1);
  });
});

describe("stress helpers", () => {
  it("ranks ties by their average, like pandas rank(pct=True)", () => {
    expect(percentileRanks([10, 20, 20, 30])).toEqual([0.25, 0.625, 0.625, 1]);
  });

  it("interpolates quantiles linearly", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 1 / 3)).toBe(2);
  });
});

describe("contractor scorecards", () => {
  it("scores every contractor and ranks them by overall score", () => {
    expect(set.cards).toHaveLength(ds.contractors.length);
    set.cards.forEach((card, i) => expect(card.rank).toBe(i + 1));
    for (let i = 1; i < set.cards.length; i++) {
      expect(set.cards[i - 1].overall).toBeGreaterThanOrEqual(set.cards[i].overall);
    }
  });

  it("covers every work order exactly once", () => {
    expect(set.cards.reduce((n, c) => n + c.volume.jobs, 0)).toBe(ds.workOrders.length);
  });

  it("keeps every score between 0 and 100 and applies repeat and audit flag deductions", () => {
    for (const c of set.cards) {
      for (const part of [c.durability, c.cost, c.speed]) {
        expect(part.score).toBeGreaterThanOrEqual(0);
        expect(part.score).toBeLessThanOrEqual(100);
      }
      expect(c.rawOverall).toBeGreaterThanOrEqual(0);
      expect(c.rawOverall).toBeLessThanOrEqual(100);
      expect(c.overall).toBeCloseTo((c.volume.jobs * c.rawOverall + 20 * 50) / (c.volume.jobs + 20), 8);
    }
  });

  it("builds the cost score from 70% cost ratio and 30% outliers", () => {
    for (const c of set.cards) {
      expect(c.cost.score).toBeCloseTo(0.7 * c.cost.costRatioScore + 0.3 * c.cost.outlierScore, 8);
    }
  });

  it("averages to exactly as expected: city-wide durability and speed ratios sit near 1", () => {
    const jobs = set.cards.reduce((n, c) => n + c.volume.jobs, 0);
    const weighted = (pick: (c: (typeof set.cards)[number]) => number) =>
      set.cards.reduce((n, c) => n + pick(c) * c.volume.jobs, 0) / jobs;
    expect(weighted((c) => c.durability.actualRate)).toBeCloseTo(weighted((c) => c.durability.expectedRate), 6);
    expect(weighted((c) => c.speed.actualRate)).toBeCloseTo(weighted((c) => c.speed.expectedRate), 6);
  });

  it("does not use volume in the score: jobs and billed amount only appear as context", () => {
    const a = set.cards[0];
    expect(a.volume.billedInr).toBeGreaterThan(0);
    expect(Object.keys(a.durability)).not.toContain("jobs");
  });

  it("only names repeats that follow an earlier job on the same road within 45 days", () => {
    const byId = new Map(ds.workOrders.map((o) => [o.id, o]));
    for (const c of set.cards) {
      for (const ex of c.repeats.examples) {
        expect(ex.days).toBeGreaterThanOrEqual(0);
        expect(ex.days).toBeLessThanOrEqual(45);
        expect(byId.get(ex.earlierWorkOrderId)?.roadId).toBe(ex.roadId);
        expect(byId.get(ex.workOrderId)?.roadId).toBe(ex.roadId);
      }
      expect(c.repeats.repeatJobs).toBe(c.orders.filter((o) => o.repeatOf).length);
    }
  });

  it("buckets stress into three levels, none empty", () => {
    const all = set.cards.flatMap((c) => c.orders);
    for (const level of ["Low", "Medium", "High"] as const) {
      expect(all.filter((o) => o.stress === level).length).toBeGreaterThan(200);
    }
  });
});
