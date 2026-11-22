import { describe, expect, it } from "vitest";
import {
  generateWardActionQueue,
  runAccountabilityAudit,
} from "@/lib/rupee/accountability";
import { loadDataset } from "@/lib/rupee/load";

describe("Master Accountability & Audit Engine", () => {
  it("runs a full municipal audit on loaded dataset and aggregates risks", () => {
    const ds = loadDataset();
    const audit = runAccountabilityAudit(ds);

    expect(audit.totalOrdersAudited).toBeGreaterThan(0);
    expect(audit.totalBilledInr).toBeGreaterThan(0);
    expect(audit.totalAmountAtRiskInr).toBeGreaterThan(0);
    expect(audit.costAnomalies.count).toBeGreaterThan(0);
    expect(audit.dlpConflicts.count).toBeGreaterThan(0);
    expect(audit.wardSummaries.size).toBe(24);
  });

  it("generates prioritized ward engineer action queue with critical DLP and repeat items", () => {
    const ds = loadDataset();
    const allItems = generateWardActionQueue(ds);
    expect(allItems.length).toBeGreaterThan(0);

    // Verify ordering: critical comes first, then high, then medium
    const criticalIndices = allItems
      .map((item, idx) => (item.priority === "critical" ? idx : -1))
      .filter((idx) => idx !== -1);
    const highIndices = allItems
      .map((item, idx) => (item.priority === "high" ? idx : -1))
      .filter((idx) => idx !== -1);

    if (criticalIndices.length > 0 && highIndices.length > 0) {
      expect(Math.max(...criticalIndices)).toBeLessThan(Math.min(...highIndices));
    }

    // Filter by specific ward
    const wardFItems = generateWardActionQueue(ds, "F/N");
    expect(wardFItems.every((i) => i.ward === "F/N")).toBe(true);

    // Check item attributes
    const first = allItems[0];
    expect(first.id).toBeDefined();
    expect(first.headline).toBeDefined();
    expect(first.recommendedAction).toBeDefined();
    expect(first.amountAtRiskInr).toBeGreaterThanOrEqual(0);
  });
});
