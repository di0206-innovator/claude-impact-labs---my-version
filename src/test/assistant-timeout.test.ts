import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { queryClaudeAssistant } from "@/lib/assistant/claude";
import type { EvidenceBundle } from "@/lib/assistant/types";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { loadDataset } from "@/lib/rupee/load";

const mockEvidence: EvidenceBundle = {
  complaintId: "CMP-TEST-001",
  channel: "Mobile App",
  publicSafeDescription: "Deep crater near station entrance",
  reportedLanguage: "en",
  resolvedRoadId: "RD0065",
  resolvedRoadName: "S V Road",
  resolvedWard: "K-W",
  canonicalIssueId: "ISSUE-01",
  issueCategory: "Pothole",
  issueStatus: "Open",
  workOrders: [
    {
      id: "WO-999",
      contractorId: "CT01",
      contractorName: "Eagle Infra India Ltd",
      costInr: 250000,
      assignedAt: "2024-07-01",
      startedAt: "2024-07-02",
      completedAt: "2024-07-05",
      slaHours: 48,
      slaMet: true,
      reopened: false,
      isOfficialLink: true,
      remark: "Fixed properly",
    },
  ],
  timeline: [],
  sourceRecordIds: ["SRC-01"],
  limitations: [],
  auditFlags: [],
};

describe("Claude Assistant Timeout & Circuit Breaker", () => {
  const dataset = loadDataset();
  const engine = createComplaintIntelligenceEngine(dataset);
  const toolCtx = { engine, dataset };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to clean factual template when credentials are unavailable", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    vi.stubEnv("MOCK_LLM", "false");

    const res = await queryClaudeAssistant("What is the status of my road?", {
      evidence: mockEvidence,
      toolCtx,
      language: "en",
      useMock: false,
    });

    expect(res.answer).toContain("WO-999");
    expect(res.answer).toContain("Eagle Infra India Ltd");
    expect(res.answer).toContain("2,50,000");
    expect(res.responseLanguage).toBe("en");
    expect(res.complaintStatus).toBe("Open");
  });

  it("provides factual fallback in Hindi when requested", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.stubEnv("MOCK_LLM", "false");

    const res = await queryClaudeAssistant("सड़क की स्थिति क्या है?", {
      evidence: mockEvidence,
      toolCtx,
      language: "hi",
      useMock: false,
    });

    expect(res.responseLanguage).toBe("hi");
    expect(res.answer).toContain("आपकी शिकायत");
    expect(res.answer).toContain("Eagle Infra India Ltd");
  });

  it("returns fallback without error when evidence is null", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.stubEnv("MOCK_LLM", "false");

    const res = await queryClaudeAssistant("General inquiry", {
      evidence: null,
      toolCtx,
      language: "en",
      useMock: false,
    });

    expect(res.answer).toBe("No records found matching your query.");
  });
});
