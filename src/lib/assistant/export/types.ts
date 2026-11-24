/**
 * Types for Civic Evidence Pack & Accountability Dossier Exports.
 */

export type ExportFormat = "csv" | "pdf" | "json";

export type EvidencePackType = "road" | "contractor" | "ward";

export type ExportResult = {
  filename: string;
  mimeType: string;
  data: Uint8Array | string;
};
