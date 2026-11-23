import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTriageOverrides,
  generateTriageCsv,
  getTriageStorageKey,
  loadTriageOverrides,
  saveTriageOverrides,
  TRIAGE_STORAGE_PREFIX,
} from "@/lib/passport/triage";
import type { ActionQueueItem } from "@/lib/passport/types";

describe("Ward Engineer & Queue Triage Persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("constructs compliant storage keys for wards and citywide queues", () => {
    expect(getTriageStorageKey("A")).toBe(`${TRIAGE_STORAGE_PREFIX}:A`);
    expect(getTriageStorageKey("K/W")).toBe(`${TRIAGE_STORAGE_PREFIX}:K/W`);
    expect(getTriageStorageKey("all")).toBe(`${TRIAGE_STORAGE_PREFIX}:all`);
    expect(getTriageStorageKey("")).toBe(`${TRIAGE_STORAGE_PREFIX}:all`);
  });

  it("handles loading from empty or uninitialized localStorage gracefully", () => {
    expect(loadTriageOverrides("A")).toEqual({});
    expect(loadTriageOverrides("all")).toEqual({});
  });

  it("persists and reloads status overrides accurately", () => {
    const overrides: Record<string, ActionQueueItem["status"]> = {
      item_101: "under_review",
      item_102: "resolved",
    };

    saveTriageOverrides("F/S", overrides);
    const loaded = loadTriageOverrides("F/S");
    expect(loaded).toEqual(overrides);

    // Other scopes remain unaffected
    expect(loadTriageOverrides("K/E")).toEqual({});
  });

  it("clears stored triage overrides cleanly", () => {
    saveTriageOverrides("G/N", { task_1: "resolved" });
    expect(loadTriageOverrides("G/N")).toEqual({ task_1: "resolved" });

    clearTriageOverrides("G/N");
    expect(loadTriageOverrides("G/N")).toEqual({});
  });

  it("recovers from corrupted localStorage payload without throwing", () => {
    window.localStorage.setItem(getTriageStorageKey("M/W"), "{invalid-json-payload");
    expect(loadTriageOverrides("M/W")).toEqual({});
  });

  it("generates sanitized triage CSV escaping formula injection characters", () => {
    const sampleItems: ActionQueueItem[] = [
      {
        id: "item_01",
        priority: "critical",
        category: "potential_dlp_conflict",
        headline: "=SUM(A1:A10)", // Potential injection
        roadId: "RD001",
        roadName: "+Linking Road", // Potential injection
        ward: "H/W",
        relatedEntityId: "WO99",
        amountAtRiskInr: 500000,
        status: "under_review",
        recommendedAction: "@Review immediately", // Potential injection
        reason: "-Defect reopened", // Potential injection
        evidenceCount: 3,
      },
    ];

    const csv = generateTriageCsv(sampleItems);
    expect(csv).toContain('"Task ID"');
    expect(csv).toContain('"\'=SUM(A1:A10)"');
    expect(csv).toContain('"\' +Linking Road"'.replace(" ", ""));
    expect(csv).toContain('"\'@Review immediately"');
    expect(csv).toContain('"\' -Defect reopened"'.replace(" ", ""));
  });
});
