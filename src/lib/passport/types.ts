import type { LatLng, Road, WorkOrder } from "../rupee/types";
import type { Accident, Complaint, Facility, FloodHotspot, Traffic } from "../rupee/load";

export type { LatLng, Road, WorkOrder, Accident, Complaint, Facility, FloodHotspot, Traffic };

export type EvidenceRelationshipType =
  | "explicit_source_link" | "verified_record" | "inferred_candidate"
  | "human_reviewed" | "citizen_observation" | "model_generated";

export type EvidenceEdge = {
  id: string;
  sourceType: "road" | "complaint" | "work_order" | "contractor" | "facility";
  sourceId: string;
  targetType: "road" | "complaint" | "work_order" | "contractor" | "facility";
  targetId: string;
  relationship: EvidenceRelationshipType;
  confidence: number;
  explanation: string;
};

export type PassportWorkOrder = WorkOrder & {
  expectedCostInr: number;
  varianceInr: number;
  variancePct: number;
  flags: string[];
  evidenceType: EvidenceRelationshipType;
};

export type PassportComplaint = Complaint & {
  evidenceType: EvidenceRelationshipType;
  distanceToRoadM: number | null;
};

export type RecommendedActionKind =
  | "dlp_verification" | "field_quality_audit" | "repeated_failure_review"
  | "sla_delay_inquiry" | "flood_resilience_upgrade" | "citizen_verification" | "routine_monitoring";

export type PassportRecommendedAction = {
  kind: RecommendedActionKind;
  priority: "critical" | "high" | "medium" | "low";
  headline: string;
  explanation: string;
  targetEntityId: string;
  actionRequiredBy: string;
};

export type RoadPassportData = {
  road: Road;
  workOrders: PassportWorkOrder[];
  complaints: PassportComplaint[];
  accidents: Accident[];
  facilities: Facility[];
  floodHotspots: FloodHotspot[];
  traffic: Traffic | null;
  summary: {
    totalBilledInr: number;
    expectedCostInr: number;
    varianceInr: number;
    totalOrders: number;
    reopenedOrders: number;
    reopenRate: number;
    slaMetOrders: number;
    slaRate: number;
    totalComplaints: number;
    openComplaints: number;
    auditFlagCount: number;
    accidentCount: number;
    nearbyFacilitiesCount: number;
    heldInr: number;
    failedInr: number;
    flaggedInr: number;
  };
  methodBreakdown: Array<{ method: string; billedInr: number; orders: number; reopenRate: number }>;
  contractorBreakdown: Array<{ contractorId: string; contractorName: string; billedInr: number; orders: number; reopenRate: number }>;
  recommendedActions: PassportRecommendedAction[];
  evidenceEdges: EvidenceEdge[];
  provenance: {
    datasetSource: string;
    algorithmVersion: string;
    generatedAt: string;
    isSynthetic: boolean;
    contractualDisclaimer: string;
  };
};

export type ActionQueueCategory =
  | "high_defect_recurrence" | "unlinked_complaint_backlog" | "sla_breach"
  | "reopened_repair" | "repeat_work_cluster" | "potential_dlp_conflict" | "cost_anomaly";

export type ActionQueueItem = {
  id: string;
  priority: "critical" | "high" | "medium";
  category: ActionQueueCategory;
  headline: string;
  roadId: string;
  roadName: string;
  ward: string;
  relatedEntityId: string;
  amountAtRiskInr: number;
  status: "new" | "under_review" | "action_required" | "resolved";
  recommendedAction: string;
  reason: string;
  evidenceCount: number;
};

export type ActionQueueSummary = {
  totalItems: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  totalAtRiskInr: number;
  auditFlagAtRiskInr: number;
  byCategory: Record<ActionQueueCategory, number>;
};

export type SpendVsNeedDimension = { name: string; weight: number; score: number; rationale: string };

export type RoadPriorityRank = {
  rank: number;
  roadId: string;
  roadName: string;
  ward: string;
  compositeScore: number;
  dimensions: {
    infrastructureVulnerability: SpendVsNeedDimension;
    publicSafety: SpendVsNeedDimension;
    serviceDeficit: SpendVsNeedDimension;
    maintenanceBurden: SpendVsNeedDimension;
    resourceEquity: SpendVsNeedDimension;
  };
  recommendedIntervention: string;
  estCostInr: number;
  underDlp: boolean;
};

export type BudgetScenario = {
  id: string;
  title: string;
  description: string;
  budgetEnvelopeInr: number;
  allocatedInr: number;
  roadsFundedCount: number;
  fundedRoads: Array<{
    roadId: string;
    roadName: string;
    ward: string;
    costInr: number;
    method: string;
    priorityRank: number;
    compositeScore: number;
  }>;
};

export type RoadListItem = {
  id: string;
  name: string;
  ward: string;
  roadType: string;
  surface: string;
  lanes: number;
  lengthM: number;
  underDlp: boolean;
  lastResurfaced: string;
  busRoute: boolean;
  totalBilledInr: number;
  orderCount: number;
  reopenCount: number;
  reopenRate: number;
  flagCount: number;
  openComplaintCount: number;
  status: "held" | "under_review" | "flagged" | "high_risk";
};

export type RoadExplorerFilter = {
  ward?: string;
  surface?: string;
  underDlp?: boolean;
  hasFlags?: boolean;
  query?: string;
  sortBy?: "billed_desc" | "orders_desc" | "reopen_desc" | "name_asc";
};

export type RoadExplorerStats = {
  totalRoads: number;
  totalBilledInr: number;
  flaggedRoadsCount: number;
  dlpRoadsCount: number;
  averageReopenRate: number;
};

export type EvidencePackMetadata = {
  dossierTitle: string;
  roadId: string;
  roadName: string;
  ward: string;
  generatedAt: string;
  algorithmVersion: string;
  dataClassification: string;
  privacyDisclaimer: string;
};

export type EvidencePackWorkOrder = {
  id: string; contractor: string; method: string; assignedAt: string; completedAt: string;
  areaSqm: number; costBilledInr: number; expectedCostInr: number; varianceInr: number;
  slaMet: string; reopenedWithin30d: string; engineerRemark: string;
};

export type EvidencePackComplaint = {
  id: string; receivedAt: string; channel: string; category: string; status: string;
  description: string; upvotes: number; evidenceType: EvidenceRelationshipType;
};

export type RoadEvidencePack = {
  metadata: EvidencePackMetadata;
  road: Road;
  summary: RoadPassportData["summary"];
  workOrders: EvidencePackWorkOrder[];
  complaints: EvidencePackComplaint[];
  accidentsCount: number;
  facilitiesCount: number;
  floodExposureCount: number;
  recommendedActions: PassportRecommendedAction[];
  auditDisclaimer: string;
};

export type RupeeReceiptData = {
  complaintId: string;
  receivedAt: string;
  channel: string;
  category: string;
  description: string;
  locality: string;
  ward: string;
  road: { id: string; name: string; surface: string; underDlp: boolean } | null;
  workOrder: {
    id: string; assignedAt: string; startedAt: string; completedAt: string;
    slaHours: number; slaMet: boolean; reopened: boolean; areaSqm: number;
    amountBilledInr: number; expectedCostInr: number; contractorName: string;
    method: string; engineerRemark: string;
  } | null;
  auditStatus: { hasFlag: boolean; flags: string[] };
  missingRecords: string[];
  citizenObservation: { verifiedByCitizen: boolean; verificationStatus: string };
  provenance: { algorithmVersion: string; dataIntegrityNotice: string };
};

export type PotholeReceiptData = RupeeReceiptData;

export interface PassportService {
  getRoadPassport(roadId: string): RoadPassportData | null;
  getRoadPassportOrThrow(roadId: string): RoadPassportData;
  listRoadSummaries(filter?: RoadExplorerFilter): RoadListItem[];
  getRoadExplorerStats(): RoadExplorerStats;
  buildEvidencePack(roadId: string): RoadEvidencePack | null;
  exportEvidencePackJson(roadId: string): string | null;
  exportEvidencePackCsv(roadId: string): string | null;
  getPotholeReceipt(complaintId: string): RupeeReceiptData | null;
  listActionQueueItems(wardFilter?: string): ActionQueueItem[];
  getActionQueueSummary(wardFilter?: string): ActionQueueSummary;
  rankRoadPriorities(): RoadPriorityRank[];
  generateBudgetScenarios(envelopeInr?: number): BudgetScenario[];
}
