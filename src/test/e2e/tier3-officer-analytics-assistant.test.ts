import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET as exportRoute } from "@/app/api/export/[type]/[id]/route";
import { queryClaudeAssistant } from "@/lib/assistant/claude";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";
import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";
import { getSpendVsNeedReport } from "@/lib/priority/score";
import { loadDataset } from "@/lib/rupee/load";
import { buildScorecards } from "@/lib/rupee/scorecard";
import { templateVoices, voicePacket, voicePreview, wardForPost } from "@/lib/rupee/voices";
import { createMockNextRequest, setupTestRepo, teardownTestRepo } from "./e2e-helpers";

describe("Tier 3 Cross-Feature: Officer Analytics & Assistant Pipeline (F4+F5+F12+F13+F14+F15)", () => {
  const ds = loadDataset();
  const engine = createComplaintIntelligenceEngine(ds);
  const toolCtx = { engine, dataset: ds };

  beforeEach(() => {
    setupTestRepo();
    vi.stubEnv("MOCK_LLM", "true");
  });

  afterEach(() => {
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  it("1. F12: Ward triage queue loads and filters actionable tasks by municipal ward code", () => {
    const allItems = listActionQueueItems();
    expect(allItems.length).toBeGreaterThan(10);

    const wardGItems = listActionQueueItems("G/N");
    expect(wardGItems.length).toBeGreaterThan(0);
    for (const item of wardGItems) {
      expect(item.ward).toBe("G/N");
      expect(item.headline).toBeTruthy();
      expect(typeof item.amountAtRiskInr).toBe("number");
    }
  });

  it("2. F12: Calculates aggregate queue summary with deduplicated amount at risk", () => {
    const summary = getActionQueueSummary();
    expect(summary.totalItems).toBe(summary.criticalCount + summary.highCount + summary.mediumCount);
    expect(summary.totalAtRiskInr).toBeGreaterThan(0);
    expect(summary.auditFlagAtRiskInr).toBeGreaterThanOrEqual(0);
  });

  it("3. F15: Correlates citizen complaints and social media signals for target ward", () => {
    const packet = voicePacket(ds, "H/W");
    expect(packet.ward).toBe("H/W");
    expect(packet.lines.length).toBeGreaterThan(0);
    const kinds = new Set(packet.lines.map((l) => l.kind));
    expect(kinds.has("complaint") || kinds.has("post")).toBe(true);
  });

  it("4. F15: Accurately maps freeform social post text to corresponding BMC ward", () => {
    const wardBandra = wardForPost("Huge crater on Linking Road Bandra West near KFC");
    expect(wardBandra).toBe("H/W");

    const wardDadar = wardForPost("Severe waterlogging at Dadar West circle after heavy rain");
    expect(wardDadar).toBe("G/N");
  });

  it("5. F15: Generates balanced voice preview with complaint and social post excerpts", () => {
    const packet = voicePacket(ds, "K/W");
    const preview = voicePreview(packet.lines);
    expect(preview.length).toBeLessThanOrEqual(5);

    const template = templateVoices(packet);
    expect(template.length).toBeGreaterThan(20);
    expect(template).toMatch(/complaint|post|record/i);
  });

  it("6. F12+F15: Cross-references triage queue road with citizen voice signals", () => {
    const queueItems = listActionQueueItems("H/W");
    expect(queueItems.length).toBeGreaterThan(0);
    const topItem = queueItems[0];

    const voices = voicePacket(ds, "H/W");
    expect(voices.lines.length).toBeGreaterThan(0);
    expect(topItem.roadName).toBeTruthy();
  });

  it("7. F4: Claude assistant queries contractor rankings tool and returns structured evidence", async () => {
    const res = await queryClaudeAssistant("Show contractor rankings across Mumbai", { toolCtx, useMock: true });
    expect(res.evidenceSources).toContain("tool:get_contractor_rankings");
    expect(res.answer).toMatch(/Contractor/i);
    expect(Array.isArray(res.limitations)).toBe(true);
  });

  it("8. F4: Claude assistant queries ward summary tool and returns localized findings", async () => {
    const res = await queryClaudeAssistant("What are the key repair issues in Ward G/N?", { toolCtx, useMock: true });
    expect(res.evidenceSources).toContain("tool:get_ward_summary");
    expect(res.answer).toMatch(/G\/N|Ward/i);
  });

  it("9. F4: Claude assistant supports localized civic queries in Hindi and Marathi", async () => {
    const hindiRes = await queryClaudeAssistant("ठेकेदार रैंकिंग", { toolCtx, useMock: true, language: "hi" });
    expect(hindiRes.answer.length).toBeGreaterThan(10);

    const marathiRes = await queryClaudeAssistant("प्रभागातील रस्ते", { toolCtx, useMock: true, language: "mr" });
    expect(marathiRes.answer.length).toBeGreaterThan(10);
  });

  it("10. F12+F4: Officer queries Claude assistant about triage flagged corridor contractor", async () => {
    const items = listActionQueueItems();
    const flagged = items.find((i) => i.amountAtRiskInr > 0) ?? items[0];
    const contractor = ds.contractors[0]?.name ?? "Generic Contractor";
    const res = await queryClaudeAssistant(`Audit work order track record for ${contractor} on ${flagged.roadName}`, {
      toolCtx,
      useMock: true,
    });
    expect(res.answer.length).toBeGreaterThan(20);
    expect(res.evidenceSources.length).toBeGreaterThan(0);
  });

  it("11. F13: Stage 1 (Diagnose): Computes 24-ward need scores and fiscal disparity index", () => {
    const report = getSpendVsNeedReport();
    expect(report.wards.length).toBe(24);
    for (const w of report.wards) {
      expect(w.needScore).toBeGreaterThanOrEqual(0);
      expect(w.spentInr).toBeGreaterThanOrEqual(0);
      expect(typeof w.disparityIndex).toBe("number");
    }
  });

  it("12. F13: Stage 2 (Allocate): Ranks corridors across 5 civic dimensions and funds budget envelope", () => {
    const ranked = rankRoadPriorities();
    expect(ranked.length).toBeGreaterThan(50);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].compositeScore).toBeGreaterThanOrEqual(ranked[1].compositeScore);

    const scenarios = generateBudgetScenarios(200_000_000);
    expect(scenarios.length).toBe(4);
    for (const s of scenarios) {
      expect(s.allocatedInr).toBeLessThanOrEqual(s.budgetEnvelopeInr);
      expect(s.roadsFundedCount).toBeGreaterThan(0);
    }
  });

  it("13. F14: Recalibrates contractor scorecards with Bayesian shrinkage and penalty bands", () => {
    const scorecards = buildScorecards(ds);
    expect(scorecards.cards.length).toBeGreaterThan(0);

    for (const card of scorecards.cards) {
      expect(card.overall).toBeGreaterThanOrEqual(0);
      expect(card.overall).toBeLessThanOrEqual(100);
      expect(["Strong", "As expected", "Needs attention", "Limited data"]).toContain(card.band);
      expect(card.durability.score).toBeGreaterThanOrEqual(0);
      expect(card.cost.score).toBeGreaterThanOrEqual(0);
      expect(card.speed.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("14. F5: Sanitizes CSV cells against formula injection triggers and escapes quotes", () => {
    expect(sanitizeCsvCell("=1+2")).toBe("\"'=1+2\"");
    expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
    expect(sanitizeCsvCell("-500")).toBe("\"'-500\"");
    expect(sanitizeCsvCell("@SUM(A1:A5)")).toBe("\"'@SUM(A1:A5)\"");
    expect(sanitizeCsvCell('Road "Linking" Road')).toBe('"Road ""Linking"" Road"');
    expect(sanitizeCsvCell("Normal Road")).toBe('"Normal Road"');
  });

  it("15. F12+F15+F4+F13+F14+F5: Full chain from triage selection to assistant inquiry, budget framing, and sanitized export", async () => {
    const triageItems = listActionQueueItems("K/W");
    expect(triageItems.length).toBeGreaterThan(0);
    const item = triageItems[0];

    const voice = voicePacket(ds, "K/W");
    expect(voice.lines.length).toBeGreaterThan(0);

    const aiRes = await queryClaudeAssistant(`Review status of ${item.roadName}`, { toolCtx, useMock: true });
    expect(aiRes.answer).toBeTruthy();

    const scenarios = generateBudgetScenarios(250_000_000);
    const balanced = scenarios.find((s) => s.id === "balanced");
    expect(balanced).toBeDefined();
    expect(balanced?.roadsFundedCount).toBeGreaterThan(0);

    const scorecards = buildScorecards(ds);
    const contractorCard = scorecards.cards[0];
    if (contractorCard) {
      expect(contractorCard.overall).toBeGreaterThanOrEqual(0);
    }

    const req = createMockNextRequest("http://localhost:3000/api/export/road/RD0065?format=csv");
    const res = await exportRoute(req, { params: Promise.resolve({ type: "road", id: "RD0065" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const csvContent = await res.text();
    expect(csvContent).toContain("RD0065");
  });
});
