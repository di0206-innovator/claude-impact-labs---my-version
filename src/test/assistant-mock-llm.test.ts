import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { queryClaudeAssistant } from "@/lib/assistant/claude";
import { isMockLLMEnabled, simulateMockLLMMessage } from "@/lib/assistant/mock-llm";
import { ASSISTANT_TOOLS } from "@/lib/assistant/tools/definitions";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { loadDataset } from "@/lib/rupee/load";

describe("assistant mock LLM integration", () => {
  const dataset = loadDataset();
  const engine = createComplaintIntelligenceEngine(dataset);
  const toolCtx = { engine, dataset };

  it("identifies mock status via environment helper", () => {
    expect(typeof isMockLLMEnabled()).toBe("boolean");
  });

  describe("simulateMockLLMMessage unit turns", () => {
    it("turn 1: selects get_contractor_rankings for contractor comparison", () => {
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: "Which contractor is the best in Mumbai?" }],
        ASSISTANT_TOOLS,
        "en",
      );
      expect(msg.stop_reason).toBe("tool_use");
      expect(msg.content[0].type).toBe("tool_use");
      if (msg.content[0].type === "tool_use") {
        expect(msg.content[0].name).toBe("get_contractor_rankings");
      }
    });

    it("turn 1: selects get_next_rupee_plan for next rupee question", () => {
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: "Where should the next rupee go in F/S ward?" }],
        ASSISTANT_TOOLS,
        "en",
      );
      expect(msg.stop_reason).toBe("tool_use");
      if (msg.content[0].type === "tool_use") {
        expect(msg.content[0].name).toBe("get_next_rupee_plan");
        expect(msg.content[0].input.ward_code).toBe("F/S");
      }
    });

    it("turn 1: selects get_ward_summary for ward spend question", () => {
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: "Explain spend in ward K/W" }],
        ASSISTANT_TOOLS,
        "en",
      );
      expect(msg.stop_reason).toBe("tool_use");
      if (msg.content[0].type === "tool_use") {
        expect(msg.content[0].name).toBe("get_ward_summary");
        expect(msg.content[0].input.ward_code).toBe("K/W");
      }
    });

    it("turn 1: selects get_audit_flags for audit question", () => {
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: "Show me flagged audit bills and double billing" }],
        ASSISTANT_TOOLS,
        "en",
      );
      expect(msg.stop_reason).toBe("tool_use");
      if (msg.content[0].type === "tool_use") {
        expect(msg.content[0].name).toBe("get_audit_flags");
      }
    });

    it("turn 1: selects get_complaint when complaint ID is present", () => {
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: "Status of BMC25-000013" }],
        ASSISTANT_TOOLS,
        "en",
      );
      expect(msg.stop_reason).toBe("tool_use");
      if (msg.content[0].type === "tool_use") {
        expect(msg.content[0].name).toBe("get_complaint");
        expect(msg.content[0].input.complaint_id).toBe("BMC25-000013");
      }
    });

    it("turn 2: synthesizes final contractor answer from tool result", () => {
      const toolResult = {
        type: "tool_result",
        tool_use_id: "mock_1",
        content: JSON.stringify({
          contractors: [
            {
              rank: 1,
              name: "Sahyadri Infra Works",
              overallScore: 78.4,
              jobs: 320,
              actualReopenRatePct: 11,
            },
          ],
        }),
      };
      const msg = simulateMockLLMMessage(
        [
          { role: "user", content: "Which contractor is best?" },
          { role: "assistant", content: [{ type: "tool_use", id: "mock_1", name: "get_contractor_rankings", input: {} }] },
          { role: "user", content: [toolResult] },
        ],
        ASSISTANT_TOOLS,
        "en",
      );
      expect(msg.stop_reason).toBe("end_turn");
      if (msg.content[0].type === "text") {
        expect(msg.content[0].text).toContain("Sahyadri Infra Works");
        expect(msg.content[0].text).toContain("78.4/100");
      }
    });

    it("turn 2: supports Hindi response synthesis", () => {
      const toolResult = {
        type: "tool_result",
        tool_use_id: "mock_2",
        content: JSON.stringify({
          contractors: [{ rank: 1, name: "Sahyadri Infra Works", overallScore: 78.4, jobs: 320, actualReopenRatePct: 11 }],
        }),
      };
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: [toolResult] }],
        ASSISTANT_TOOLS,
        "hi",
      );
      if (msg.content[0].type === "text") {
        expect(msg.content[0].text).toContain("शीर्ष रैंक वाले ठेकेदार");
      }
    });

    it("turn 2: supports Marathi response synthesis", () => {
      const toolResult = {
        type: "tool_result",
        tool_use_id: "mock_3",
        content: JSON.stringify({
          contractors: [{ rank: 1, name: "Sahyadri Infra Works", overallScore: 78.4, jobs: 320, actualReopenRatePct: 11 }],
        }),
      };
      const msg = simulateMockLLMMessage(
        [{ role: "user", content: [toolResult] }],
        ASSISTANT_TOOLS,
        "mr",
      );
      if (msg.content[0].type === "text") {
        expect(msg.content[0].text).toContain("सर्वोत्तम कंत्राटदार");
      }
    });
  });

  describe("queryClaudeAssistant with mock LLM loop", () => {
    it("runs complete 2-turn contractor ranking flow with mock LLM", async () => {
      const res = await queryClaudeAssistant("Which contractor is the best?", {
        evidence: null,
        toolCtx,
        language: "en",
        useMock: true,
      });

      expect(res.answer).toContain("top-ranked contractor");
      expect(res.complaintStatus).toBe("Dataset Analysis");
      expect(res.isOfficialLink).toBe(true);
      expect(res.evidenceSources).toContain("tool:get_contractor_rankings");
    });

    it("runs complete 2-turn next-rupee plan flow with mock LLM", async () => {
      const res = await queryClaudeAssistant("Where should the next rupee go in F/S ward?", {
        evidence: null,
        toolCtx,
        language: "en",
        useMock: true,
      });

      expect(res.answer).toContain("Ward **F/S**");
      expect(res.evidenceSources).toContain("tool:get_next_rupee_plan");
    });

    it("runs complete 2-turn ward summary flow with mock LLM", async () => {
      const res = await queryClaudeAssistant("Explain road spend in ward F/S", {
        evidence: null,
        toolCtx,
        language: "en",
        useMock: true,
      });

      expect(res.answer).toContain("Ward **F/S**");
      expect(res.evidenceSources).toContain("tool:get_ward_summary");
    });
  });
});
