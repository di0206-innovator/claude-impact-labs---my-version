import { describe, expect, it } from "vitest";

import {
  DefaultPassportService,
  buildEvidencePack,
  exportEvidencePackCsv,
  exportEvidencePackJson,
  getActionQueueSummary,
  getPotholeReceipt,
  getRoadExplorerStats,
  getRoadPassport,
  getRoadPassportOrThrow,
  listActionQueueItems,
  listRoadSummaries,
  passportService,
  rankRoadPriorities,
  generateBudgetScenarios,
} from "../service";

describe("PassportService - Unit Tests", () => {
  describe("getRoadPassport & getRoadPassportOrThrow", () => {
    it("returns complete passport data for a valid road segment (RD0001)", () => {
      const data = passportService.getRoadPassport("RD0001");
      expect(data).not.toBeNull();
      if (!data) return;

      expect(data.road.id).toBe("RD0001");
      expect(data.road.name).toBe("Shahid Bhagat Singh Marg");
      expect(data.road.ward).toBe("A");
      expect(data.road.surface).toBe("Asphalt");

      expect(data.summary.totalBilledInr).toBe(44640);
      expect(data.summary.totalOrders).toBe(3);
      expect(data.summary.heldInr + data.summary.failedInr + data.summary.flaggedInr).toBe(
        data.summary.totalBilledInr,
      );

      expect(data.workOrders.length).toBe(3);
      expect(data.methodBreakdown.length).toBeGreaterThan(0);
      expect(data.contractorBreakdown.length).toBeGreaterThan(0);
      expect(data.recommendedActions.length).toBeGreaterThanOrEqual(1);
      expect(data.evidenceEdges.length).toBeGreaterThan(0);
      expect(data.provenance.isSynthetic).toBe(true);
    });

    it("returns null for non-existent or blank road ID", () => {
      expect(passportService.getRoadPassport("NON_EXISTENT_ROAD")).toBeNull();
      expect(passportService.getRoadPassport("")).toBeNull();
    });

    it("getRoadPassportOrThrow throws descriptive error for missing road", () => {
      expect(() => passportService.getRoadPassportOrThrow("UNKNOWN_ROAD_1234")).toThrow(
        /Road Passport not found for road ID: UNKNOWN_ROAD_1234/,
      );
    });

    it("getRoadPassportOrThrow succeeds for existing road", () => {
      const data = passportService.getRoadPassportOrThrow("RD0001");
      expect(data.road.id).toBe("RD0001");
    });
  });

  describe("listRoadSummaries & getRoadExplorerStats", () => {
    it("lists road summaries with accurate counts and calculations", () => {
      const allRoads = passportService.listRoadSummaries();
      expect(allRoads.length).toBeGreaterThan(10);

      const first = allRoads[0];
      expect(first.id).toBeDefined();
      expect(first.totalBilledInr).toBeGreaterThanOrEqual(0);
      expect(typeof first.reopenRate).toBe("number");
    });

    it("filters roads by ward, surface, and search query", () => {
      const wardA = passportService.listRoadSummaries({ ward: "A" });
      for (const r of wardA) expect(r.ward).toBe("A");

      const asphaltRoads = passportService.listRoadSummaries({ surface: "Asphalt" });
      for (const r of asphaltRoads) expect(r.surface.toLowerCase()).toBe("asphalt");

      const queryMatches = passportService.listRoadSummaries({ query: "Bhagat" });
      expect(queryMatches.some((r) => r.name.includes("Bhagat"))).toBe(true);
    });

    it("sorts roads by billed_desc, orders_desc, reopen_desc, and name_asc", () => {
      const byBilled = passportService.listRoadSummaries({ sortBy: "billed_desc" });
      for (let i = 1; i < byBilled.length; i++) {
        expect(byBilled[i - 1].totalBilledInr).toBeGreaterThanOrEqual(byBilled[i].totalBilledInr);
      }

      const byName = passportService.listRoadSummaries({ sortBy: "name_asc" });
      for (let i = 1; i < byName.length; i++) {
        expect(byName[i - 1].name.localeCompare(byName[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it("computes accurate citywide road stats in getRoadExplorerStats", () => {
      const stats = passportService.getRoadExplorerStats();
      expect(stats.totalRoads).toBeGreaterThan(10);
      expect(stats.totalBilledInr).toBeGreaterThan(0);
      expect(stats.flaggedRoadsCount).toBeGreaterThanOrEqual(0);
      expect(stats.dlpRoadsCount).toBeGreaterThanOrEqual(0);
      expect(stats.averageReopenRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("buildEvidencePack & Exports", () => {
    it("builds an audit-ready evidence pack for a valid road", () => {
      const pack = passportService.buildEvidencePack("RD0001");
      expect(pack).not.toBeNull();
      if (!pack) return;

      expect(pack.metadata.roadId).toBe("RD0001");
      expect(pack.metadata.dossierTitle).toContain("Shahid Bhagat Singh Marg");
      expect(pack.workOrders.length).toBe(3);
      expect(pack.summary.totalBilledInr).toBe(44640);
    });

    it("returns null for non-existent road", () => {
      expect(passportService.buildEvidencePack("DOES_NOT_EXIST")).toBeNull();
      expect(passportService.exportEvidencePackJson("DOES_NOT_EXIST")).toBeNull();
      expect(passportService.exportEvidencePackCsv("DOES_NOT_EXIST")).toBeNull();
    });

    it("exports valid JSON dossier", () => {
      const json = passportService.exportEvidencePackJson("RD0001");
      expect(json).not.toBeNull();
      if (!json) return;

      const parsed = JSON.parse(json);
      expect(parsed.metadata.roadId).toBe("RD0001");
      expect(parsed.workOrders.length).toBe(3);
    });

    it("exports valid CSV dossier with expected columns", () => {
      const csv = passportService.exportEvidencePackCsv("RD0001");
      expect(csv).not.toBeNull();
      if (!csv) return;

      expect(csv).toContain("AUDIT-READY EVIDENCE PACK");
      expect(csv).toContain("WORK ORDERS TABLE");
      expect(csv).toContain("LINKED CITIZEN COMPLAINTS");
    });
  });

  describe("getPotholeReceipt", () => {
    it("retrieves receipt with rate-card cost calculation", () => {
      const receipt = passportService.getPotholeReceipt("BMC25-000005");
      expect(receipt).not.toBeNull();
      if (!receipt) return;

      expect(receipt.complaintId.toUpperCase()).toBe("BMC25-000005");
      expect(receipt.road).toBeDefined();
      expect(receipt.workOrder?.expectedCostInr).toBeGreaterThan(0);
    });

    it("returns null for non-existent complaint", () => {
      expect(passportService.getPotholeReceipt("INVALID_COMPLAINT_999")).toBeNull();
    });
  });

  describe("listActionQueueItems & getActionQueueSummary", () => {
    it("lists action queue items prioritized by risk and critical status", () => {
      const items = passportService.listActionQueueItems();
      expect(items.length).toBeGreaterThan(0);

      const first = items[0];
      expect(["critical", "high", "medium"]).toContain(first.priority);
      expect(["new", "under_review", "action_required", "resolved"]).toContain(first.status);
    });

    it("filters action queue items by ward", () => {
      const wardA = passportService.listActionQueueItems("A");
      for (const item of wardA) expect(item.ward).toBe("A");
    });

    it("computes action queue summary metrics", () => {
      const summary = passportService.getActionQueueSummary();
      expect(summary.totalItems).toBeGreaterThan(0);
      expect(summary.totalAtRiskInr).toBeGreaterThan(0);
      expect(summary.criticalCount + summary.highCount + summary.mediumCount).toBe(summary.totalItems);
    });
  });

  describe("rankRoadPriorities & generateBudgetScenarios", () => {
    it("ranks roads with 5 composite dimensions", () => {
      const ranked = passportService.rankRoadPriorities();
      expect(ranked.length).toBeGreaterThan(0);

      const top = ranked[0];
      expect(top.rank).toBe(1);
      expect(top.compositeScore).toBeGreaterThanOrEqual(0);
      expect(top.dimensions.infrastructureVulnerability).toBeDefined();
      expect(top.dimensions.publicSafety).toBeDefined();
      expect(top.dimensions.serviceDeficit).toBeDefined();
      expect(top.dimensions.maintenanceBurden).toBeDefined();
      expect(top.dimensions.resourceEquity).toBeDefined();
    });

    it("generates deterministic budget scenarios", () => {
      const scenarios = passportService.generateBudgetScenarios(50_000_000);
      expect(scenarios.length).toBe(4);
      for (const sc of scenarios) {
        expect(sc.budgetEnvelopeInr).toBeGreaterThan(0);
        expect(sc.allocatedInr).toBeLessThanOrEqual(sc.budgetEnvelopeInr);
      }
    });
  });

  describe("Direct function exports", () => {
    it("exports standalone functions matching service instance behavior", () => {
      expect(getRoadPassport("RD0001")?.road.id).toBe("RD0001");
      expect(getRoadPassportOrThrow("RD0001").road.id).toBe("RD0001");
      expect(buildEvidencePack("RD0001")?.metadata.roadId).toBe("RD0001");
      expect(exportEvidencePackJson("RD0001")).toContain("RD0001");
      expect(exportEvidencePackCsv("RD0001")).toContain("RD0001");
      expect(getPotholeReceipt("BMC25-000005")?.complaintId.toUpperCase()).toBe("BMC25-000005");
      expect(listRoadSummaries().length).toBeGreaterThan(0);
      expect(getRoadExplorerStats().totalRoads).toBeGreaterThan(0);
      expect(listActionQueueItems().length).toBeGreaterThan(0);
      expect(getActionQueueSummary().totalItems).toBeGreaterThan(0);
      expect(rankRoadPriorities().length).toBeGreaterThan(0);
      expect(generateBudgetScenarios().length).toBe(4);
      expect(new DefaultPassportService() instanceof DefaultPassportService).toBe(true);
    });
  });
});
