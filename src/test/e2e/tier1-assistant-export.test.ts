import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET as exportRoute } from "@/app/api/export/[type]/[id]/route";
import { queryClaudeAssistant } from "@/lib/assistant/claude";
import { ASSISTANT_TOOLS } from "@/lib/assistant/tools";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { loadDataset } from "@/lib/rupee/load";
import {
  createMockNextRequest,
  setupTestRepo,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 1 Assistant & Export Integrity (Features 4, 5)", () => {
  const dataset = loadDataset();
  const engine = createComplaintIntelligenceEngine(dataset);
  const toolCtx = { engine, dataset };

  beforeEach(() => {
    setupTestRepo();
    vi.stubEnv("MOCK_LLM", "true");
  });

  afterEach(() => {
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 4: Claude Assistant Timeout & Circuit Breaker", () => {
    it("executes successfully in mock LLM mode without Anthropic API key", async () => {
      const res = await queryClaudeAssistant("Which contractor has the worst record?", {
        toolCtx,
        useMock: true,
      });
      expect(res.answer).toBeDefined();
      expect(res.answer.length).toBeGreaterThan(20);
      expect(res.evidenceSources.length).toBeGreaterThan(0);
    });

    it("executes get_contractor_rankings tool call and returns synthesized answer", async () => {
      const res = await queryClaudeAssistant("Show me contractor rankings in Mumbai", {
        toolCtx,
        useMock: true,
      });
      expect(res.evidenceSources).toContain("tool:get_contractor_rankings");
      expect(res.answer).toMatch(/Contractor/i);
    });

    it("executes get_ward_summary tool call and returns localized evidence", async () => {
      const res = await queryClaudeAssistant("How is Ward K/W doing on pothole repairs?", {
        toolCtx,
        useMock: true,
      });
      expect(res.evidenceSources).toContain("tool:get_ward_summary");
      expect(res.answer).toMatch(/K\/W|Ward/i);
    });

    it("returns localized response in Hindi when requested", async () => {
      const res = await queryClaudeAssistant("ठेकेदारों की सूची दिखाएं", {
        toolCtx,
        useMock: true,
        language: "hi",
      });
      expect(res.answer).toBeDefined();
      expect(res.answer.length).toBeGreaterThan(10);
    });

    it("returns localized response in Marathi when requested", async () => {
      const res = await queryClaudeAssistant("रस्त्यांची स्थिती कशी आहे?", {
        toolCtx,
        useMock: true,
        language: "mr",
      });
      expect(res.answer).toBeDefined();
      expect(res.answer.length).toBeGreaterThan(10);
    });

    it("enforces read-only safety: all available tools are strictly non-mutating", () => {
      const mutatingVerbs = ["update", "delete", "create", "insert", "drop", "write", "post"];
      for (const tool of ASSISTANT_TOOLS) {
        const name = tool.name.toLowerCase();
        for (const verb of mutatingVerbs) {
          expect(name.startsWith(`${verb}_`)).toBe(false);
        }
      }
    });

    it("respects turn limit and completes within bounded iterations", async () => {
      const res = await queryClaudeAssistant("Audit work order details for BMC25-000005", {
        toolCtx,
        useMock: true,
        maxTurns: 3,
      });
      expect(res.evidenceSources.length).toBeLessThanOrEqual(3);
      expect(res.answer.length).toBeGreaterThan(0);
    });

    it("structures output with answer, evidenceSources, and limitations", async () => {
      const res = await queryClaudeAssistant("What audit flags were raised on S.V. Road?", {
        toolCtx,
        useMock: true,
      });
      expect(Array.isArray(res.evidenceSources)).toBe(true);
      expect(Array.isArray(res.limitations)).toBe(true);
      expect(typeof res.answer).toBe("string");
      expect(typeof res.nextAction).toBe("string");
    });
  });

  describe("Feature 5: Export Route Validation & CSV Formula Sanitization", () => {
    it("disarms '=' formula injection with single quote prefix", () => {
      const cell = sanitizeCsvCell("=SUM(A1:B10)");
      expect(cell).toBe("\"'=SUM(A1:B10)\"");
    });

    it("disarms '+', '-', '@', '\\t', '\\r' formula trigger prefixes", () => {
      expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
      expect(sanitizeCsvCell("-123+456")).toBe("\"'-123+456\"");
      expect(sanitizeCsvCell("@SUM(1,2)")).toBe("\"'@SUM(1,2)\"");
      expect(sanitizeCsvCell("\tmalicious")).toBe("\"'\tmalicious\"");
      expect(sanitizeCsvCell("\rpayload")).toBe("\"'\rpayload\"");
    });

    it("escapes embedded double quotes by doubling them", () => {
      expect(sanitizeCsvCell('Road "Linking" West')).toBe('"Road ""Linking"" West"');
      expect(sanitizeCsvCell('Said "Hello" to "World"')).toBe('"Said ""Hello"" to ""World"""');
    });

    it("leaves benign text strings and numbers unescaped", () => {
      expect(sanitizeCsvCell("Bandra West")).toBe('"Bandra West"');
      expect(sanitizeCsvCell("Ward H/W")).toBe('"Ward H/W"');
      expect(sanitizeCsvCell(450000)).toBe('"450000"');
    });

    it("returns empty quoted string for null and undefined", () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it("rejects invalid export type with 400", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/export/invalid_type/RD0065");
      const res = await exportRoute(req, {
        params: Promise.resolve({ type: "invalid_type", id: "RD0065" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid export type");
    });

    it("redirects with 308 to strip non-whitelisted cache-busting query params", async () => {
      const req = createMockNextRequest(
        "http://localhost:3000/api/export/road/RD0065?format=csv&_rnd=123456",
      );
      const res = await exportRoute(req, {
        params: Promise.resolve({ type: "road", id: "RD0065" }),
      });
      expect(res.status).toBe(308);
      const loc = res.headers.get("location");
      expect(loc).not.toContain("_rnd");
    });

    it("returns 200 with text/csv header for valid road evidence export", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/export/road/RD0065?format=csv");
      const res = await exportRoute(req, {
        params: Promise.resolve({ type: "road", id: "RD0065" }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      const csv = await res.text();
      expect(csv.length).toBeGreaterThan(50);
      expect(csv).toContain("RD0065");
    });
  });
});
