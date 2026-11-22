import { getRoadPassport } from "./aggregate";
import {
  buildEvidencePack,
  exportEvidencePackCsv,
  exportEvidencePackJson,
} from "./evidence-pack";
import { getActionQueueSummary, listActionQueueItems } from "./queue";
import { getPotholeReceipt } from "./receipt";
import { getRoadExplorerStats, listRoadSummaries } from "./roads";
import { generateBudgetScenarios, rankRoadPriorities } from "./scenarios";
import type {
  ActionQueueItem,
  ActionQueueSummary,
  BudgetScenario,
  PassportService,
  RoadEvidencePack,
  RoadExplorerFilter,
  RoadExplorerStats,
  RoadListItem,
  RoadPassportData,
  RoadPriorityRank,
  RupeeReceiptData,
} from "./types";

/**
 * Default implementation of the Road Reliability Passport service.
 * Coordinates aggregation, evidence packing, queue triage, and scenario modeling.
 */
export class DefaultPassportService implements PassportService {
  getRoadPassport(roadId: string): RoadPassportData | null {
    if (!roadId || typeof roadId !== "string") return null;
    return getRoadPassport(roadId.trim());
  }

  getRoadPassportOrThrow(roadId: string): RoadPassportData {
    const passport = this.getRoadPassport(roadId);
    if (!passport) {
      throw new Error(`Road Passport not found for road ID: ${roadId}`);
    }
    return passport;
  }

  listRoadSummaries(filter?: RoadExplorerFilter): RoadListItem[] {
    return listRoadSummaries(filter);
  }

  getRoadExplorerStats(): RoadExplorerStats {
    return getRoadExplorerStats();
  }

  buildEvidencePack(roadId: string): RoadEvidencePack | null {
    if (!roadId || typeof roadId !== "string") return null;
    return buildEvidencePack(roadId.trim());
  }

  exportEvidencePackJson(roadId: string): string | null {
    if (!roadId || typeof roadId !== "string") return null;
    return exportEvidencePackJson(roadId.trim());
  }

  exportEvidencePackCsv(roadId: string): string | null {
    if (!roadId || typeof roadId !== "string") return null;
    return exportEvidencePackCsv(roadId.trim());
  }

  getPotholeReceipt(complaintId: string): RupeeReceiptData | null {
    if (!complaintId || typeof complaintId !== "string") return null;
    return getPotholeReceipt(complaintId.trim());
  }

  listActionQueueItems(wardFilter?: string): ActionQueueItem[] {
    return listActionQueueItems(wardFilter);
  }

  getActionQueueSummary(wardFilter?: string): ActionQueueSummary {
    return getActionQueueSummary(wardFilter);
  }

  rankRoadPriorities(): RoadPriorityRank[] {
    return rankRoadPriorities();
  }

  generateBudgetScenarios(envelopeInr?: number): BudgetScenario[] {
    return generateBudgetScenarios(envelopeInr);
  }
}

export const passportService: PassportService = new DefaultPassportService();

// Standalone function exports for direct import convenience
export {
  getRoadPassport,
  buildEvidencePack,
  exportEvidencePackJson,
  exportEvidencePackCsv,
  getPotholeReceipt,
  listRoadSummaries,
  getRoadExplorerStats,
  listActionQueueItems,
  getActionQueueSummary,
  rankRoadPriorities,
  generateBudgetScenarios,
};

export function getRoadPassportOrThrow(roadId: string): RoadPassportData {
  return passportService.getRoadPassportOrThrow(roadId);
}
