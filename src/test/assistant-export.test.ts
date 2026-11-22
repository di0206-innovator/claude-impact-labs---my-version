import { describe, expect, it } from "vitest";
import {
  exportEvidencePack,
  exportRoadPassportCsv,
  exportRoadPassportPdf,
  exportContractorDossierCsv,
  exportContractorDossierPdf,
  exportWardDossierCsv,
  exportWardDossierPdf,
} from "@/lib/assistant/export";

describe("assistant evidence pack exports", () => {
  describe("road passport exports", () => {
    it("exports road passport CSV with valid headers and data", () => {
      const csv = exportRoadPassportCsv("RD0065");
      expect(csv).not.toBeNull();
      expect(csv).toContain("AUDIT-READY EVIDENCE PACK");
      expect(csv).toContain("RD0065");
      expect(csv).toContain("WORK ORDERS TABLE");
      expect(csv).toContain("LINKED CITIZEN COMPLAINTS");
    });

    it("exports road passport PDF as valid PDF byte array", async () => {
      const pdfBytes = await exportRoadPassportPdf("RD0065");
      expect(pdfBytes).not.toBeNull();
      expect(pdfBytes instanceof Uint8Array).toBe(true);
      expect(pdfBytes!.length).toBeGreaterThan(1000);
      // PDF magic number check (%PDF-)
      const header = Buffer.from(pdfBytes!.slice(0, 5)).toString("ascii");
      expect(header).toBe("%PDF-");
    });

    it("returns null for non-existent road ID", async () => {
      expect(exportRoadPassportCsv("NON_EXISTENT_ROAD")).toBeNull();
      expect(await exportRoadPassportPdf("NON_EXISTENT_ROAD")).toBeNull();
    });
  });

  describe("contractor dossier exports", () => {
    it("exports contractor dossier CSV with metrics and flagged bills", () => {
      const csv = exportContractorDossierCsv("CT01");
      expect(csv).not.toBeNull();
      expect(csv).toContain("CONTRACTOR PERFORMANCE & ACCOUNTABILITY DOSSIER");
      expect(csv).toContain("CT01");
      expect(csv).toContain("FLAGGED BILLS TABLE");
      expect(csv).toContain("RECORDED WORK ORDERS SAMPLE");
    });

    it("exports contractor dossier PDF as valid PDF byte array", async () => {
      const pdfBytes = await exportContractorDossierPdf("CT01");
      expect(pdfBytes).not.toBeNull();
      expect(pdfBytes instanceof Uint8Array).toBe(true);
      expect(pdfBytes!.length).toBeGreaterThan(1000);
      const header = Buffer.from(pdfBytes!.slice(0, 5)).toString("ascii");
      expect(header).toBe("%PDF-");
    });

    it("returns null for non-existent contractor ID", async () => {
      expect(exportContractorDossierCsv("CT_INVALID")).toBeNull();
      expect(await exportContractorDossierPdf("CT_INVALID")).toBeNull();
    });
  });

  describe("ward dossier exports", () => {
    it("exports ward accountability dossier CSV with budget, flags, and next-rupee plan", () => {
      const csv = exportWardDossierCsv("F/S");
      expect(csv).not.toBeNull();
      expect(csv).toContain("BMC WARD ACCOUNTABILITY DOSSIER");
      expect(csv).toContain("Ward F/S");
      expect(csv).toContain("OUTCOME BREAKDOWN");
      expect(csv).toContain("TOP CONTRACTORS IN WARD");
      expect(csv).toContain("NEXT RUPEE PRIORITY ROADS");
    });

    it("exports ward accountability dossier PDF as valid PDF byte array", async () => {
      const pdfBytes = await exportWardDossierPdf("F/S");
      expect(pdfBytes).not.toBeNull();
      expect(pdfBytes instanceof Uint8Array).toBe(true);
      expect(pdfBytes!.length).toBeGreaterThan(1000);
      const header = Buffer.from(pdfBytes!.slice(0, 5)).toString("ascii");
      expect(header).toBe("%PDF-");
    });

    it("handles hyphenated ward codes gracefully (e.g. F-S -> F/S)", async () => {
      const csv = exportWardDossierCsv("F-S");
      expect(csv).not.toBeNull();
      expect(csv).toContain("Ward F/S");

      const pdf = await exportWardDossierPdf("F-S");
      expect(pdf).not.toBeNull();
    });

    it("returns null for non-existent ward code", async () => {
      expect(exportWardDossierCsv("INVALID_WARD")).toBeNull();
      expect(await exportWardDossierPdf("INVALID_WARD")).toBeNull();
    });
  });

  describe("unified exportEvidencePack dispatcher", () => {
    it("dispatches road CSV and PDF exports", async () => {
      const csvRes = await exportEvidencePack("road", "RD0065", "csv");
      expect(csvRes).not.toBeNull();
      expect(csvRes?.mimeType).toContain("text/csv");
      expect(csvRes?.filename).toContain("road-passport.csv");

      const pdfRes = await exportEvidencePack("road", "RD0065", "pdf");
      expect(pdfRes).not.toBeNull();
      expect(pdfRes?.mimeType).toBe("application/pdf");
      expect(pdfRes?.filename).toContain("road-passport.pdf");
    });

    it("dispatches contractor CSV and PDF exports", async () => {
      const csvRes = await exportEvidencePack("contractor", "CT05", "csv");
      expect(csvRes).not.toBeNull();
      expect(csvRes?.mimeType).toContain("text/csv");
      expect(csvRes?.filename).toContain("contractor-dossier.csv");

      const pdfRes = await exportEvidencePack("contractor", "CT05", "pdf");
      expect(pdfRes).not.toBeNull();
      expect(pdfRes?.mimeType).toBe("application/pdf");
      expect(pdfRes?.filename).toContain("contractor-scorecard.pdf");
    });

    it("dispatches ward CSV and PDF exports", async () => {
      const csvRes = await exportEvidencePack("ward", "F/S", "csv");
      expect(csvRes).not.toBeNull();
      expect(csvRes?.mimeType).toContain("text/csv");
      expect(csvRes?.filename).toContain("ward-f-s-accountability.csv");

      const pdfRes = await exportEvidencePack("ward", "F/S", "pdf");
      expect(pdfRes).not.toBeNull();
      expect(pdfRes?.mimeType).toBe("application/pdf");
      expect(pdfRes?.filename).toContain("ward-f-s-accountability.pdf");
    });
  });
});
