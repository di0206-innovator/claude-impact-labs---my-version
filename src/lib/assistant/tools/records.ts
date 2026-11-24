import { maskPII } from "../security";
import type { ToolContext, ToolExecutionResult } from "./executor";
import { buildRoadDossier } from "./road-dossier";

export function executeRecordTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): ToolExecutionResult | null {
  const { engine, dataset } = ctx;

  switch (toolName) {
    case "get_complaint": {
      const id = String(args.complaint_id ?? "").trim();
      if (!id) return { success: false, error: "complaint_id is required." };

      const c = engine.getComplaint(id);
      if (!c) return { success: false, error: `Complaint "${id}" not found in municipal records.` };

      // Return public-safe record (no complainant PII)
      return {
        success: true,
        data: {
          id: c.id,
          receivedAt: c.receivedAt,
          channel: c.channelRaw,
          categoryReported: c.rawCategory,
          canonicalCategory: c.canonicalCategory,
          description: maskPII(c.cleanText),
          locality: c.resolution.locality ?? c.rawLocality,
          ward: c.resolution.ward,
          roadId: c.resolution.roadId,
          roadName: c.resolution.roadName,
          status: c.status,
          upvotes: c.upvotes,
        },
      };
    }

    case "get_canonical_issue": {
      const issueId = String(args.issue_id ?? "").trim();
      if (!issueId) return { success: false, error: "issue_id is required." };

      const issue = engine.getIssue(issueId);
      if (!issue) return { success: false, error: `Canonical issue "${issueId}" not found.` };

      const outcome = engine.getOutcomeForIssue(issueId);

      return {
        success: true,
        data: {
          id: issue.id,
          primaryRoadId: issue.primaryRoadId,
          ward: issue.ward,
          category: issue.category,
          firstReportedAt: issue.firstReportedAt,
          latestReportedAt: issue.latestReportedAt,
          complaintCount: issue.complaintCount,
          sources: issue.sources,
          complaintIds: issue.complaintIds,
          outcomeStatus: outcome?.outcomeStatus ?? "unknown",
          reopenedWithin30d: outcome?.reopenedWithin30d ?? false,
          explanation: outcome?.explanation ?? "",
        },
      };
    }

    case "get_road_details": {
      const roadId = String(args.road_id ?? "").trim();
      if (!roadId) return { success: false, error: "road_id is required." };

      const road = dataset.roads.find((r) => r.id === roadId);
      if (!road) return { success: false, error: `Road segment "${roadId}" not found.` };

      return {
        success: true,
        data: {
          id: road.id,
          name: road.name,
          segmentNo: road.segmentNo,
          ward: road.ward,
          roadType: road.roadType,
          surface: road.surface,
          lanes: road.lanes,
          lengthM: road.lengthM,
          lastResurfaced: road.lastResurfaced,
          underDlp: road.underDlp,
          busRoute: road.busRoute,
          socialCorroboration: buildRoadDossier(road.id)?.socialCorroboration ?? null,
        },
      };
    }

    case "get_work_orders": {
      const roadId = args.road_id ? String(args.road_id).trim() : null;
      const woId = args.work_order_id ? String(args.work_order_id).trim() : null;
      const issueId = args.issue_id ? String(args.issue_id).trim() : null;

      let matchedWos = dataset.workOrders;

      if (woId) {
        matchedWos = matchedWos.filter((w) => w.id === woId);
      } else if (issueId) {
        const links = engine.getLinksForIssue(issueId);
        const linkedIds = new Set(links.map((l) => l.workOrderId));
        matchedWos = matchedWos.filter((w) => linkedIds.has(w.id));
      } else if (roadId) {
        matchedWos = matchedWos.filter((w) => w.roadId === roadId);
      }

      return {
        success: true,
        data: matchedWos.map((w) => ({
          id: w.id,
          ward: w.ward,
          roadId: w.roadId,
          workType: w.workType,
          repairMethod: w.method,
          contractorId: w.contractorId,
          contractorName: w.contractorName,
          costInr: w.costInr,
          assignedAt: w.assignedAt,
          startedAt: w.startedAt,
          completedAt: w.completedAt,
          slaHours: w.slaHours,
          slaMet: w.slaMet,
          reopenedWithin30d: w.reopened,
          engineerRemark: w.remark,
          linkedComplaintIds: w.complaintIds,
        })),
      };
    }

    default:
      return null;
  }
}
