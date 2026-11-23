import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { RoadTrailCard } from "@/components/report/RoadTrailCard";
import { getRepository } from "@/lib/repo/context";
import { getRupee } from "@/lib/rupee";
import { getRoadTrail } from "@/lib/rupee/road-trail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ask about a road repair",
  description: "Ask Claude what happened to your Mumbai road repair complaint using official BMC records.",
};

type PageProps = {
  searchParams: Promise<{ complaintId?: string; reportId?: string; roadId?: string }>;
};

async function resolveLiveContext(reportId?: string, roadId?: string) {
  let resolvedRoadId = roadId;
  if (reportId?.startsWith("rpt_")) {
    try {
      const repo = getRepository();
      const report = await repo.getReport(reportId);
      if (report) {
        const loc = await repo.getLocation(report.locationId);
        if (loc?.roadId) resolvedRoadId = loc.roadId;
      }
    } catch {
      // Fall through cleanly if repo is unavailable.
    }
  }
  const trail = getRoadTrail(resolvedRoadId);
  let matchedComplaintId = "";
  if (trail) {
    const { ds } = getRupee();
    const wo = ds.workOrders.find(
      (o) => o.roadId === trail.roadId && o.complaintIds.length > 0,
    );
    if (wo) matchedComplaintId = wo.complaintIds[0];
  }
  return { trail, matchedComplaintId };
}

export default async function AssistantPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { trail, matchedComplaintId } = await resolveLiveContext(
    params.reportId,
    params.roadId,
  );
  const initialId =
    params.complaintId ||
    matchedComplaintId ||
    (params.reportId && !params.reportId.startsWith("rpt_") ? params.reportId : "");

  return (
    <section className="shell rb-chat-page min-w-0" aria-label="Auditor Assistant Interface">
      <AssistantChat
        initialComplaintId={initialId}
        context={trail ? <RoadTrailCard trail={trail} /> : undefined}
      />
    </section>
  );
}
