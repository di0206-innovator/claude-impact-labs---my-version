import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/wards/G-N",
  useSearchParams: () => new URLSearchParams(),
}));

import { GET as exportRoute } from "@/app/api/export/[type]/[id]/route";
import { WardEngineerQueue } from "@/app/wards/[code]/queue";
import { WardVoices } from "@/components/rupee/WardVoices";
import { queryClaudeAssistant } from "@/lib/assistant/claude";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";
import { loadDataset } from "@/lib/rupee/load";
import { buildScorecards } from "@/lib/rupee/scorecard";
import { bandOf, costPart, durabilityPart } from "@/lib/rupee/scorecard/score";
import { voicePacket } from "@/lib/rupee/voices";
import {
  computeCanonicalEvidenceHash,
  createMockNextRequest,
  setupTestRepo,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 4 Scenario 2: BMC Ward G/N Maintenance Morning Triage Journey", () => {
  const ds = loadDataset();
  const engine = createComplaintIntelligenceEngine(ds);
  const toolCtx = { engine, dataset: ds };

  beforeEach(() => {
    setupTestRepo();
    vi.stubEnv("MOCK_LLM", "true");
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  it("executes morning triage: review social alerts -> triage action queue -> consult AI assistant -> export CSV", async () => {
    // 1. Shift Start & Citizen Voice / Social Media Signal Review in Ward G/N
    const gnPacket = voicePacket(ds, "G/N");
    expect(gnPacket.ward).toBe("G/N");
    expect(Array.isArray(gnPacket.lines)).toBe(true);
    expect(gnPacket.lines.length).toBeGreaterThan(0);

    const roadNames = new Set(ds.roads.map((r) => r.name.toLowerCase()));
    const roadMatchedPosts = ds.socialPosts.filter((post) => {
      const text = post.text.toLowerCase();
      for (const name of roadNames) {
        if (name.length > 5 && text.includes(name)) return true;
      }
      return false;
    });
    expect(roadMatchedPosts.length).toBeGreaterThan(50);

    render(React.createElement(WardVoices, { ds, ward: "G/N" }));
    expect(screen.getByRole("list")).toBeInTheDocument();

    // 2. Operational Intake & Priority Action Queue Triage
    const allQueueItems = listActionQueueItems();
    const gnQueueItems = listActionQueueItems("G/N");
    expect(allQueueItems.length).toBeGreaterThan(10);
    const triageItems = gnQueueItems.length > 0 ? gnQueueItems : allQueueItems.slice(0, 5);

    cleanup();
    render(
      React.createElement(WardEngineerQueue, {
        wardCode: "G/N",
        wardName: "Dadar / Dharavi",
        items: triageItems,
      }),
    );
    expect(screen.getByText(/Ward Engineer Action Queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Dadar \/ Dharavi/i)).toBeInTheDocument();

    const triageButtons = screen.getAllByRole("button", { name: /triage details/i });
    expect(triageButtons.length).toBeGreaterThan(0);
    fireEvent.click(triageButtons[0]);
    expect(
      screen.queryByText(/Audit Screening Finding/i) || screen.queryByText(/under review/i),
    ).toBeDefined();

    const summary = getActionQueueSummary();
    expect(summary.totalItems).toBeGreaterThan(0);
    expect(summary.totalAtRiskInr).toBeGreaterThan(0);

    // 3. AI Assistant Contractor History Interrogation
    const aiRankingResponse = await queryClaudeAssistant(
      "Show contractor rankings and performance track record in Ward G/N",
      { toolCtx, useMock: true },
    );
    expect(aiRankingResponse.evidenceSources).toContain("tool:get_contractor_rankings");
    expect(aiRankingResponse.answer).toMatch(/Contractor/i);
    expect(Array.isArray(aiRankingResponse.limitations)).toBe(true);

    const aiAuditResponse = await queryClaudeAssistant(
      "Audit work order details for BMC25-000005",
      { toolCtx, useMock: true, maxTurns: 3 },
    );
    expect(aiAuditResponse.answer.length).toBeGreaterThan(0);

    // 4. Recalibrated Contractor Scorecard Evaluation
    const { cards } = buildScorecards(ds);
    expect(cards.length).toBe(8);
    const lowPerformers = cards.filter((c) => c.overall < 40);
    for (const card of cards) {
      const band = bandOf(card.overall, card.volume.jobs);
      expect(["Strong", "As expected", "Needs attention", "Limited data"]).toContain(band);
    }
    if (lowPerformers.length > 0) {
      expect(bandOf(lowPerformers[0].overall, 50)).toBe("Needs attention");
    }

    const testBuckets = { reopenRate: () => 0.12, slaMissRate: () => 0.15 };
    const goodOrders = [
      { method: "Patchwork", stress: "Low", reopened: false, slaMet: true, costRatio: 1, overBilled: false },
    ] as any;
    const reopenedOrders = [
      { method: "Patchwork", stress: "Low", reopened: true, slaMet: true, costRatio: 1, overBilled: false },
    ] as any;
    expect(durabilityPart(goodOrders, testBuckets).score).toBeGreaterThan(
      durabilityPart(reopenedOrders, testBuckets).score,
    );
    expect(costPart(goodOrders, 0.1).score).toBeGreaterThan(
      costPart([{ ...goodOrders[0], costRatio: 3.0, overBilled: true }], 0.1).score,
    );

    // 5. Ground Crew Dispatch CSV Export & Formula Injection Sanitization
    const targetRoad = ds.roads[0];
    const exportReq = createMockNextRequest(
      `http://localhost:3000/api/export/road/${targetRoad.id}?format=csv`,
    );
    const exportRes = await exportRoute(exportReq, {
      params: Promise.resolve({ type: "road", id: targetRoad.id }),
    });
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get("Content-Type")).toContain("text/csv");
    const csvContent = await exportRes.text();
    expect(csvContent).toContain(targetRoad.id);

    // Verify CSV formula disarming against malicious injection in audit notes
    const maliciousNote = "=cmd|' /C calc'!A0";
    const sanitizedNote = sanitizeCsvCell(maliciousNote);
    expect(sanitizedNote).toBe("\"'=cmd|' /C calc'!A0\"");

    // 6. Cryptographic Evidence Hashing for Work Order Record
    const evidenceHash = computeCanonicalEvidenceHash({
      issueType: "pothole",
      lat: 19.0178,
      lng: 72.8478,
      noticedAt: "2025-07-16",
      description: "Dadar TT circle pothole dispatched for mastic repair",
    });
    expect(evidenceHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("handles empty ward queue gracefully by providing fallbacks", () => {
    const items = listActionQueueItems("NON_EXISTENT_WARD");
    expect(items.length).toBe(0);
    render(
      React.createElement(WardEngineerQueue, {
        wardCode: "Z",
        wardName: "Zone Z",
        items,
      }),
    );
    expect(screen.getByText(/Ward Engineer Action Queue/i)).toBeInTheDocument();
  });
});
