import { maskPII } from "../security";
import type { ToolContext, ToolExecutionResult } from "./executor";

export function executeAggregateTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): ToolExecutionResult | null {
  const { engine, dataset } = ctx;

  switch (toolName) {
    case "get_contractor_details": {
      const cId = String(args.contractor_id ?? "").trim();
      if (!cId) return { success: false, error: "contractor_id is required." };

      const contractor = dataset.contractors.find((c) => c.id === cId);
      if (!contractor) return { success: false, error: `Contractor "${cId}" not found.` };

      const wos = dataset.workOrders.filter((w) => w.contractorId === cId);
      const completedWos = wos.filter((w) => w.completedAt);
      const slaMetCount = completedWos.filter((w) => w.slaMet).length;
      const reopenedCount = completedWos.filter((w) => w.reopened).length;

      return {
        success: true,
        data: {
          id: contractor.id,
          name: contractor.name,
          empanelledSince: contractor.empanelledSince,
          totalWorkOrders: wos.length,
          completedWorkOrders: completedWos.length,
          slaMetRate: completedWos.length > 0 ? Number((slaMetCount / completedWos.length).toFixed(2)) : null,
          reopenRate: completedWos.length > 0 ? Number((reopenedCount / completedWos.length).toFixed(2)) : null,
          activeWards: contractor.activeWards,
        },
      };
    }

    case "get_issue_timeline": {
      const issueId = String(args.issue_id ?? "").trim();
      if (!issueId) return { success: false, error: "issue_id is required." };

      const issue = engine.getIssue(issueId);
      if (!issue) return { success: false, error: `Issue "${issueId}" not found.` };

      const links = engine.getLinksForIssue(issueId);
      const timeline: Array<{ timestamp: string; event: string; actor: string }> = [];

      timeline.push({
        timestamp: issue.firstReportedAt,
        event: `Initial complaint logged via citizen report. Total reports merged: ${issue.complaintCount}.`,
        actor: "Citizens",
      });

      for (const link of links) {
        const wo = dataset.workOrders.find((w) => w.id === link.workOrderId);
        if (wo) {
          if (wo.assignedAt) {
            timeline.push({
              timestamp: wo.assignedAt,
              event: `Work order "${wo.id}" assigned to ${wo.contractorName} for ${wo.method}.`,
              actor: "BMC Ward Engineer",
            });
          }
          if (wo.startedAt) {
            timeline.push({
              timestamp: wo.startedAt,
              event: `Contractor commenced repair work on site.`,
              actor: wo.contractorName,
            });
          }
          if (wo.completedAt) {
            timeline.push({
              timestamp: wo.completedAt,
              event: `Work order marked completed (Billed: ₹${wo.costInr.toLocaleString("en-IN")}, SLA: ${wo.slaMet ? "Met" : "Missed"}).`,
              actor: wo.contractorName,
            });
          }
          if (wo.reopened) {
            timeline.push({
              timestamp: wo.completedAt,
              event: `Repair failed within 30 days and was reopened for rectification.`,
              actor: "System Audit / Citizen",
            });
          }
        }
      }

      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return { success: true, data: timeline };
    }

    case "get_source_evidence": {
      const cId = args.complaint_id ? String(args.complaint_id).trim() : null;
      const issueId = args.issue_id ? String(args.issue_id).trim() : null;

      const evidence: Array<{ type: string; recordId: string; description: string }> = [];

      if (cId) {
        const c = engine.getComplaint(cId);
        if (c) {
          evidence.push({
            type: "citizen_report",
            recordId: c.id,
            description: `Logged via ${c.channelRaw} on ${c.receivedAt}. Description: "${maskPII(c.cleanText)}".`,
          });
        }
      }

      if (issueId) {
        const links = engine.getLinksForIssue(issueId);
        for (const l of links) {
          evidence.push({
            type: l.linkType,
            recordId: l.workOrderId,
            description: maskPII(l.explanation),
          });
        }
      }

      return { success: true, data: evidence };
    }

    case "get_next_steps": {
      const status = String(args.issue_status ?? "").toLowerCase();
      const isReopened = Boolean(args.is_reopened);

      const steps: string[] = [];
      if (status === "unlinked" || status === "open") {
        steps.push(
          "1. Quote your complaint ID to the Ward Assistant Commissioner or Ward Control Room.",
          "2. If unassigned after 48 hours during monsoon, register an escalation under the BMC Pothole Challenge guidelines.",
        );
      } else if (isReopened || status === "reopened_within_30d") {
        steps.push(
          "1. The repair has failed within 30 days; demand contractor re-excavation and patching at zero cost under Defect Liability.",
          "2. Submit follow-up photo evidence with timestamp to the Ward Executive Engineer.",
        );
      } else if (status === "work_order_completed") {
        steps.push(
          "1. Inspect the repaired spot. If the road surface is uneven or water logs again, file a recurrence report immediately.",
          "2. Confirm closure on the MyBMC app if the repair is satisfactory.",
        );
      } else {
        steps.push("Follow up with your local Ward Engineering crew for inspection updates.");
      }

      return { success: true, data: steps };
    }

    default:
      return null;
  }
}
