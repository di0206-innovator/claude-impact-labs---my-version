import { getRoadPassport } from "./aggregate";
import type { EvidencePackMetadata, RoadEvidencePack, RoadPassportData } from "./types";

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
    `"AUDIT-READY EVIDENCE PACK","${pack.metadata.roadName}","${pack.metadata.roadId}"`,
    `"Generated At","${pack.metadata.generatedAt}"`,
    `"Ward","${pack.metadata.ward}"`,
    `"Total Billed INR","${pack.summary.totalBilledInr}"`,
    `"Total Orders","${pack.summary.totalOrders}"`,
    `"Reopened Orders","${pack.summary.reopenedOrders}"`,
    `"Audit Flags Count","${pack.summary.auditFlagCount}"`,
    "",
    `"WORK ORDERS TABLE"`,
    `"Work Order ID","Contractor","Repair Method","Area Sqm","Billed INR","Expected INR","SLA Met","Reopened 30d","Engineer Remark"`,
    ...pack.workOrders.map(
      (wo) =>
        `"${wo.id}","${wo.contractor}","${wo.method}","${wo.areaSqm}","${wo.costBilledInr}","${wo.expectedCostInr}","${wo.slaMet}","${wo.reopenedWithin30d}","${wo.engineerRemark.replace(/"/g, '""')}"`,
    ),
    "",
    `"LINKED CITIZEN COMPLAINTS"`,
    `"Complaint ID","Received At","Channel","Category","Status","Upvotes","Evidence Type"`,
    ...pack.complaints.map(
      (c) =>
        `"${c.id}","${c.receivedAt}","${c.channel}","${c.category}","${c.status}","${c.upvotes}","${c.evidenceType}"`,
    ),
  ];

  return rows.join("\n");
}
