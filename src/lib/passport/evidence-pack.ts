import { getRoadPassport } from "./aggregate";
import type { EvidencePackMetadata, RoadEvidencePack, RoadPassportData } from "./types";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";

export type { EvidencePackMetadata, RoadEvidencePack };

export function buildEvidencePack(roadId: string): RoadEvidencePack | null {
  const passport = getRoadPassport(roadId);
  if (!passport) return null;

  const metadata: EvidencePackMetadata = {
    dossierTitle: `Audit-Ready Evidence Pack: ${passport.road.name} (${passport.road.id})`,
    roadId: passport.road.id,
    roadName: passport.road.name,
    ward: passport.road.ward,
    generatedAt: new Date().toISOString(),
    algorithmVersion: passport.provenance.algorithmVersion,
    dataClassification: "Public Civic Intelligence & Audit Record",
    privacyDisclaimer:
      "Personal citizen identifiers (names, phone numbers) are redacted pursuant to DPDP compliance guidelines. Figures represent billed amounts.",
  };

  const workOrdersSummary = passport.workOrders.map((wo) => ({
    id: wo.id,
    contractor: wo.contractorName,
    method: wo.method,
    assignedAt: wo.assignedAt,
    completedAt: wo.completedAt,
    areaSqm: wo.areaSqm,
    costBilledInr: wo.costInr,
    expectedCostInr: wo.expectedCostInr,
    varianceInr: wo.varianceInr,
    slaMet: wo.slaMet ? "Yes" : "No",
    reopenedWithin30d: wo.reopened ? "Yes" : "No",
    engineerRemark: wo.remark || "None recorded",
  }));

  const complaintsSummary = passport.complaints.map((c) => ({
    id: c.id,
    receivedAt: c.receivedAt,
    channel: c.channel,
    category: c.category,
    status: c.status,
    description: c.description,
    upvotes: c.upvotes,
    evidenceType: c.evidenceType,
  }));

  return {
    metadata,
    road: passport.road,
    summary: passport.summary,
    workOrders: workOrdersSummary,
    complaints: complaintsSummary,
    accidentsCount: passport.accidents.length,
    facilitiesCount: passport.facilities.length,
    floodExposureCount: passport.floodHotspots.length,
    socialPosts: passport.socialCorroboration,
    recommendedActions: passport.recommendedActions,
    auditDisclaimer: passport.provenance.contractualDisclaimer,
  };
}

export function exportEvidencePackJson(roadId: string): string | null {
  const pack = buildEvidencePack(roadId);
  if (!pack) return null;
  return JSON.stringify(pack, null, 2);
}

export function exportEvidencePackCsv(roadId: string): string | null {
  const pack = buildEvidencePack(roadId);
  if (!pack) return null;

  const rows: string[] = [
    [
      sanitizeCsvCell("AUDIT-READY EVIDENCE PACK"),
      sanitizeCsvCell(pack.metadata.roadName),
      sanitizeCsvCell(pack.metadata.roadId),
    ].join(","),
    [sanitizeCsvCell("Generated At"), sanitizeCsvCell(pack.metadata.generatedAt)].join(","),
    [sanitizeCsvCell("Ward"), sanitizeCsvCell(pack.metadata.ward)].join(","),
    [sanitizeCsvCell("Total Billed INR"), sanitizeCsvCell(pack.summary.totalBilledInr)].join(","),
    [sanitizeCsvCell("Total Orders"), sanitizeCsvCell(pack.summary.totalOrders)].join(","),
    [sanitizeCsvCell("Reopened Orders"), sanitizeCsvCell(pack.summary.reopenedOrders)].join(","),
    [sanitizeCsvCell("Audit Flags Count"), sanitizeCsvCell(pack.summary.auditFlagCount)].join(","),
    "",
    sanitizeCsvCell("WORK ORDERS TABLE"),
    [
      sanitizeCsvCell("Work Order ID"),
      sanitizeCsvCell("Contractor"),
      sanitizeCsvCell("Repair Method"),
      sanitizeCsvCell("Area Sqm"),
      sanitizeCsvCell("Billed INR"),
      sanitizeCsvCell("Expected INR"),
      sanitizeCsvCell("SLA Met"),
      sanitizeCsvCell("Reopened 30d"),
      sanitizeCsvCell("Engineer Remark"),
    ].join(","),
    ...pack.workOrders.map((wo) =>
      [
        sanitizeCsvCell(wo.id),
        sanitizeCsvCell(wo.contractor),
        sanitizeCsvCell(wo.method),
        sanitizeCsvCell(wo.areaSqm),
        sanitizeCsvCell(wo.costBilledInr),
        sanitizeCsvCell(wo.expectedCostInr),
        sanitizeCsvCell(wo.slaMet),
        sanitizeCsvCell(wo.reopenedWithin30d),
        sanitizeCsvCell(wo.engineerRemark),
      ].join(","),
    ),
    "",
    sanitizeCsvCell("LINKED CITIZEN COMPLAINTS"),
    [
      sanitizeCsvCell("Complaint ID"),
      sanitizeCsvCell("Received At"),
      sanitizeCsvCell("Channel"),
      sanitizeCsvCell("Category"),
      sanitizeCsvCell("Status"),
      sanitizeCsvCell("Upvotes"),
      sanitizeCsvCell("Evidence Type"),
    ].join(","),
    ...pack.complaints.map((c) =>
      [
        sanitizeCsvCell(c.id),
        sanitizeCsvCell(c.receivedAt),
        sanitizeCsvCell(c.channel),
        sanitizeCsvCell(c.category),
        sanitizeCsvCell(c.status),
        sanitizeCsvCell(c.upvotes),
        sanitizeCsvCell(c.evidenceType),
      ].join(","),
    ),
  ];

  return rows.join("\n");
}
