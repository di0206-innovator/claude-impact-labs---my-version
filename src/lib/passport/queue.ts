import { getRupee } from "../rupee/index";
import type { ActionQueueCategory, ActionQueueItem, ActionQueueSummary } from "./types";

export type { ActionQueueCategory, ActionQueueItem, ActionQueueSummary };

export function listActionQueueItems(wardFilter?: string): ActionQueueItem[] {
  const { ds, flags } = getRupee();
  const queue: ActionQueueItem[] = [];

  const roadById = new Map(ds.roads.map((r) => [r.id, r]));

  // 1. Audit Flags -> Action items
  for (const f of flags) {
    if (wardFilter && f.ward !== wardFilter) continue;
    const road = roadById.get(f.roadId);
    let category: ActionQueueItem["category"] = "cost_anomaly";
    let priority: ActionQueueItem["priority"] = "high";

    if (f.kind === "paid_under_dlp") {
      category = "potential_dlp_conflict";
      priority = "critical";
    } else if (f.kind === "double_billed") {
      category = "repeat_work_cluster";
      priority = "critical";
    } else if (f.kind === "phantom_completion") {
      category = "sla_breach";
      priority = "high";
    }

    queue.push({
      id: `queue_flag_${f.workOrderId}_${f.kind}`,
      priority,
      category,
      headline: f.reason,
      roadId: f.roadId,
      roadName: road?.name ?? f.roadId,
      ward: f.ward,
      relatedEntityId: f.workOrderId,
      amountAtRiskInr: f.amountAtRiskInr,
      status: "new",
      recommendedAction:
        f.kind === "paid_under_dlp"
          ? "Verify original DLP concession contract; issue demand notice to contractor if covered."
          : f.kind === "double_billed"
            ? "Inspect previous work order and physical road segment for overlap."
            : "Review junior engineer measurement book (eMB) entry.",
      reason: f.reason,
      evidenceCount: f.evidence.length + 1,
    });
  }

  // 2. SLA Misses on high-traffic or arterial roads
  for (const wo of ds.workOrders) {
    if (wo.slaMet) continue;
    if (wardFilter && wo.ward !== wardFilter) continue;
    const road = roadById.get(wo.roadId);
    if (!road || (road.roadType !== "Major Arterial" && road.roadType !== "Arterial")) continue;

    queue.push({
      id: `queue_sla_${wo.id}`,
      priority: "high",
      category: "sla_breach",
      headline: `SLA delay on ${road.name}: target ${wo.slaHours}h exceeded`,
      roadId: wo.roadId,
      roadName: road.name,
      ward: wo.ward,
      relatedEntityId: wo.id,
      amountAtRiskInr: wo.costInr,
      status: "under_review",
      recommendedAction: "Call for contractor delay explanation and impose liquid damages if unjustified.",
      reason: `Work order ${wo.id} missed turnaround SLA on key arterial corridor.`,
      evidenceCount: 1,
    });
  }

  // 3. Chronic Reopenings
  const ordersByRoad = new Map<string, typeof ds.workOrders>();
  for (const o of ds.workOrders) {
    const list = ordersByRoad.get(o.roadId) ?? [];
    list.push(o);
    ordersByRoad.set(o.roadId, list);
  }

  for (const [rId, orders] of ordersByRoad) {
    const reopened = orders.filter((o) => o.reopened);
    if (reopened.length < 2) continue;
    const road = roadById.get(rId);
    if (!road) continue;
    if (wardFilter && road.ward !== wardFilter) continue;

    queue.push({
      id: `queue_chronic_${rId}`,
      priority: reopened.length >= 3 ? "critical" : "high",
      category: "reopened_repair",
      headline: `Chronic road failure on ${road.name} (${reopened.length} reopenings within 30 days)`,
      roadId: rId,
      roadName: road.name,
      ward: road.ward,
      relatedEntityId: reopened[0]?.id ?? rId,
      amountAtRiskInr: reopened.reduce((sum, o) => sum + o.costInr, 0),
      status: "action_required",
      recommendedAction: "Initiate joint inspection with Vigilance Dept and test core sample pavement quality.",
      reason: `Multiple work orders re-opened within 30 days of recorded completion.`,
      evidenceCount: reopened.length,
    });
  }

  // 4. Open Complaints with No Linked Work Order
  const linkedCmpIds = new Set<string>();
  for (const o of ds.workOrders) {
    for (const cid of o.complaintIds) linkedCmpIds.add(cid);
  }

  const unlinkedOpenByWard = new Map<string, typeof ds.complaints>();
  for (const c of ds.complaints) {
    if (c.status.toLowerCase().includes("open") && !linkedCmpIds.has(c.id) && c.ward) {
      const list = unlinkedOpenByWard.get(c.ward) ?? [];
      list.push(c);
      unlinkedOpenByWard.set(c.ward, list);
    }
  }

  for (const [wCode, cmps] of unlinkedOpenByWard) {
    if (wardFilter && wCode !== wardFilter) continue;
    if (cmps.length < 5) continue;

    const sample = cmps[0];
    queue.push({
      id: `queue_unlinked_${wCode}`,
      priority: cmps.length >= 15 ? "high" : "medium",
      category: "unlinked_complaint_backlog",
      headline: `${cmps.length} open complaints unassigned in ward ${wCode}`,
      roadId: sample.locality,
      roadName: `${wCode} Ward Open Backlog`,
      ward: wCode,
      relatedEntityId: sample.id,
      amountAtRiskInr: 0,
      status: "new",
      recommendedAction: "Dispatch ward junior engineers for immediate on-site verification and work-order assignment.",
      reason: `Citizen complaints remain open without linked work order records.`,
      evidenceCount: cmps.length,
    });
  }

  // 5. Escalate priority for road segments with high social distress
  // (likes > 200 or keyword "accident"/"gaddha")
  const socialDistressRoadIds = new Set<string>();
  for (const road of ds.roads) {
    if (road.name.length < 4) continue;
    const nameLower = road.name.toLowerCase();
    const hasDistress = ds.socialPosts.some((p) => {
      if (!p.text.toLowerCase().includes(nameLower)) return false;
      return p.likes > 200 || /accident|gaddha|gadha|khadda|dhas|collapse|waterlog|paani/i.test(p.text);
    });
    if (hasDistress) {
      socialDistressRoadIds.add(road.id);
      socialDistressRoadIds.add(road.name);
    }
  }

  for (const item of queue) {
    if (socialDistressRoadIds.has(item.roadId) || socialDistressRoadIds.has(item.roadName)) {
      if (item.priority === "medium") {
        item.priority = "high";
        item.headline = `[Social Signal Escalation] ${item.headline}`;
        item.reason = `${item.reason} Escalated due to high viral citizen distress reports on social channels.`;
      } else if (item.priority === "high") {
        item.priority = "critical";
        item.headline = `[Social Signal Escalation] ${item.headline}`;
        item.reason = `${item.reason} Escalated to critical priority due to viral citizen distress and hazard reports.`;
      }
    }
  }

  // Sort queue by priority: critical -> high -> medium, then by amount at risk
  const priorityRank = { critical: 0, high: 1, medium: 2 };
  queue.sort((a, b) => {
    const diff = priorityRank[a.priority] - priorityRank[b.priority];
    if (diff !== 0) return diff;
    return b.amountAtRiskInr - a.amountAtRiskInr;
  });

  return queue;
}

export function getActionQueueSummary(wardFilter?: string): ActionQueueSummary {
  const items = listActionQueueItems(wardFilter);
  const { flags } = getRupee();
  const scopedFlags = wardFilter ? flags.filter((f) => f.ward === wardFilter) : flags;
  const auditFlagAtRiskInr = scopedFlags.reduce((sum, f) => sum + f.amountAtRiskInr, 0);

  // Deduplicate operational amount at risk per entity so a single work order
  // flagged for both audit variance and SLA breach is not double-counted.
  const maxRiskByEntity = new Map<string, number>();
  for (const item of items) {
    if (item.amountAtRiskInr <= 0) continue;
    const prev = maxRiskByEntity.get(item.relatedEntityId) ?? 0;
    if (item.amountAtRiskInr > prev) maxRiskByEntity.set(item.relatedEntityId, item.amountAtRiskInr);
  }
  const totalAtRiskInr = Array.from(maxRiskByEntity.values()).reduce((sum, v) => sum + v, 0);

  return {
    totalItems: items.length,
    criticalCount: items.filter((i) => i.priority === "critical").length,
    highCount: items.filter((i) => i.priority === "high").length,
    mediumCount: items.filter((i) => i.priority === "medium").length,
    totalAtRiskInr,
    auditFlagAtRiskInr,
    byCategory: {
      high_defect_recurrence: items.filter((i) => i.category === "high_defect_recurrence").length,
      potential_dlp_conflict: items.filter((i) => i.category === "potential_dlp_conflict").length,
      repeat_work_cluster: items.filter((i) => i.category === "repeat_work_cluster").length,
      sla_breach: items.filter((i) => i.category === "sla_breach").length,
      reopened_repair: items.filter((i) => i.category === "reopened_repair").length,
      cost_anomaly: items.filter((i) => i.category === "cost_anomaly").length,
      unlinked_complaint_backlog: items.filter((i) => i.category === "unlinked_complaint_backlog").length,
    },
  };
}
