import type {
  Catalog,
  CreateReportInput,
  CreateReportResult,
  DeskNote,
  IssueType,
  LocationRecord,
  PublicReportRecord,
  ReportListItem,
  ReportRecord,
  SeedReport,
  UpdateReportInput,
} from "@/lib/types";

export type SeedItem =
  | { entity: "location"; record: LocationRecord }
  | { entity: "report"; record: SeedReport }
  | { entity: "retire_report"; record: SeedReport };

export type CitizenObservationType = "fixed" | "returned" | "persists" | "new_issue";

export type VerificationRecord = {
  id: string;
  complaintId: string;
  observation: CitizenObservationType;
  notes: string | null;
  recordedAt: string;
};

export type VerificationInput = {
  complaintId: string;
  observation: CitizenObservationType;
  notes?: string | null;
  recordedAt?: string;
};

export type RastabaazRepository = {
  getLocation(id: string): Promise<LocationRecord | null>;
  getLocationBySlug(slug: string): Promise<LocationRecord | null>;
  findNearbyLocation(
    lat: number,
    lng: number,
    issueType: IssueType,
  ): Promise<LocationRecord | null>;
  getReport(id: string): Promise<ReportRecord | null>;
  getReportPhoto(id: string): Promise<string | null>;
  listReportsForLocation(locationId: string): Promise<ReportListItem[]>;
  loadCatalog(): Promise<Catalog>;
  createReport(input: CreateReportInput): Promise<CreateReportResult>;
  updateReport(input: UpdateReportInput): Promise<ReportRecord | null>;
  addDeskNote(reportId: string, body: string): Promise<DeskNote>;
  addVerification(input: VerificationInput): Promise<VerificationRecord>;
  getVerificationsForComplaint(complaintId: string): Promise<VerificationRecord[]>;
  getSeedMarker(): Promise<string | null>;
  putSeedMarker(version: string): Promise<boolean>;
  putSeedItems(items: SeedItem[]): Promise<void>;
};

/**
 * Fields the desk can change on the report META item, plus the sample flag.
 * Photo is compared separately: it is stored on the PHOTO item, not META.
 * A retired seed report is deleted only while every one of them still reads
 * as the seed wrote it.
 */
export const SEED_EDITABLE_FIELDS = ["isSample", "issueType", "description", "recurs", "locationId"] as const;

export function seedReportUntouched(held: ReportRecord, seeded: ReportRecord): boolean {
  return SEED_EDITABLE_FIELDS.every((field) => held[field] === seeded[field]);
}

export function toListItem(report: ReportRecord): PublicReportRecord {
  return { ...report, photoIsIllustration: report.isSample };
}
