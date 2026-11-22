import { exportRoadPassportCsv, exportRoadPassportPdf } from "./road-passport";
import { exportContractorDossierCsv, exportContractorDossierPdf } from "./contractor-dossier";
import { exportWardDossierCsv, exportWardDossierPdf } from "./ward-dossier";
import type { EvidencePackType, ExportFormat, ExportResult } from "./types";
import { slugOf } from "@/lib/rupee/scorecard-pdf/text";

export * from "./types";
export * from "./road-passport";
export * from "./contractor-dossier";
export * from "./ward-dossier";

/**
 * Unified export dispatcher for civic evidence packs & accountability dossiers.
 */
export async function exportEvidencePack(
  type: EvidencePackType,
  id: string,
  format: ExportFormat = "csv",
): Promise<ExportResult | null> {
  const safeId = id.trim();
  const filePrefix = slugOf(safeId);

  switch (type) {
    case "road": {
      if (format === "pdf") {
        const data = await exportRoadPassportPdf(safeId);
        if (!data) return null;
        return {
          filename: `${filePrefix}-road-passport.pdf`,
          mimeType: "application/pdf",
          data,
        };
      }
      const data = exportRoadPassportCsv(safeId);
      if (!data) return null;
      return {
        filename: `${filePrefix}-road-passport.csv`,
        mimeType: "text/csv; charset=utf-8",
        data,
      };
    }

    case "contractor": {
      if (format === "pdf") {
        const data = await exportContractorDossierPdf(safeId);
        if (!data) return null;
        return {
          filename: `${filePrefix}-contractor-scorecard.pdf`,
          mimeType: "application/pdf",
          data,
        };
      }
      const data = exportContractorDossierCsv(safeId);
      if (!data) return null;
      return {
        filename: `${filePrefix}-contractor-dossier.csv`,
        mimeType: "text/csv; charset=utf-8",
        data,
      };
    }

    case "ward": {
      if (format === "pdf") {
        const data = await exportWardDossierPdf(safeId);
        if (!data) return null;
        return {
          filename: `ward-${filePrefix}-accountability.pdf`,
          mimeType: "application/pdf",
          data,
        };
      }
      const data = exportWardDossierCsv(safeId);
      if (!data) return null;
      return {
        filename: `ward-${filePrefix}-accountability.csv`,
        mimeType: "text/csv; charset=utf-8",
        data,
      };
    }

    default:
      return null;
  }
}
