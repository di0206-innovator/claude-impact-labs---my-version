/**
 * Domain types for Claude Citizen Accountability Assistant.
 */

export type AssistantLanguage = "en" | "hi" | "mr";

export type AssistantSessionContext = {
  sessionId: string;
  complaintId?: string | null;
  issueId?: string | null;
  preferredLanguage?: AssistantLanguage;
  clientIp?: string;
};

export type AssistantQueryRequest = {
  query: string;
  complaintId?: string | null;
  issueId?: string | null;
  preferredLanguage?: AssistantLanguage;
  sessionId?: string;
  clientIp?: string;
};

export type TimelineEventRecord = {
  timestamp: string;
  event: string;
  actor: string;
  stage: "reported" | "clustered" | "assigned" | "started" | "completed" | "reopened" | "escalated";
};

export type EvidenceBundle = {
  complaintId: string;
  channel: string;
  publicSafeDescription: string;
  reportedLanguage: string;
  resolvedRoadId: string | null;
  resolvedRoadName: string | null;
  resolvedWard: string | null;
  canonicalIssueId: string | null;
  issueCategory: string;
  issueStatus: string;
  workOrders: Array<{
    id: string;
    contractorId: string;
    contractorName: string;
    costInr: number;
    assignedAt: string;
    startedAt: string;
    completedAt: string;
    slaHours: number;
    slaMet: boolean;
    reopened: boolean;
    isOfficialLink: boolean;
    remark?: string;
  }>;
  timeline: TimelineEventRecord[];
  sourceRecordIds: string[];
  limitations: string[];
  auditFlags: string[];
};

export type AssistantStructuredResponse = {
  answer: string;
  text?: string;
  responseLanguage: AssistantLanguage;
  complaintStatus: string;
  linkedIssueReference: string | null;
  workOrderReferences: string[];
  relevantTimelineEvents: TimelineEventRecord[];
  evidenceSources: string[];
  toolsUsed?: string[];
  citations?: string[];
  nextAction: string;
  limitations: string[];
  isOfficialLink: boolean;
  contractorName: string | null;
  costInr: number | null;
};
