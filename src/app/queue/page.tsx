import type { Metadata } from "next";
import Link from "next/link";

import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";
import { formatInr } from "@/lib/rupee/format";
import { getRupee } from "@/lib/rupee/index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ward Engineer Daily Action Queue — Rastabaaz",
  description:
    "Operational action queue for ward junior and executive engineers: triage high-defect recurrence, SLA breaches, DLP violations, and cost anomalies.",
};

type PageProps = {
  searchParams: Promise<{ ward?: string; priority?: string; category?: string }>;
};

export default async function ActionQueuePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { ds } = getRupee();
  const summary = getActionQueueSummary(params.ward);
  let items = listActionQueueItems(params.ward);

  if (params.priority) {
    items = items.filter((i) => i.priority === params.priority);
  }
  if (params.category) {
    items = items.filter((i) => i.category === params.category);
  }

  const allWards = Array.from(new Set(ds.roads.map((r) => r.ward))).sort();

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-6 rb-motion-fade-in">
      <header className="space-y-2 rb-parallax-hero">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="rb-chip rb-chip-neutral">Operational Command Queue</span>
          <span className="rb-chip rb-chip-flagged">{summary.criticalCount} Critical Actions</span>
        </div>
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Ward Engineer Action Queue</h1>
        <p className="ux4g-body-l-default text-[var(--mist)] rb-measure">
          Transforming civic intelligence into prioritized operational tasks: investigate SLA misses, verify DLP warranties, and review recurring failures.
        </p>
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rb-motion-stagger">
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Total Action Items</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{summary.totalItems}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Critical Priority</dt>
          <dd className="rb-stat-val text-[var(--failed-ink)] rb-tabular-nums">{summary.criticalCount}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">High Priority</dt>
          <dd className="rb-stat-val text-[var(--flagged-ink)] rb-tabular-nums">{summary.highCount}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Audit Amount at Risk</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{formatInr(summary.auditFlagAtRiskInr)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded border border-[var(--rule)] bg-[var(--card)]">
        <form method="get" action="/queue" className="flex flex-wrap items-center gap-2 text-xs">
          {params.priority ? <input type="hidden" name="priority" value={params.priority} /> : null}
          <label htmlFor="queue-ward-select" className="font-semibold text-[var(--mist)]">
            Ward ({allWards.length}):
          </label>
          <select
            id="queue-ward-select"
            name="ward"
            defaultValue={params.ward ?? ""}
            className="ux4g-input py-1.5 px-2.5 text-xs rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
          >
            <option value="">All 24 Wards</option>
            {allWards.map((w) => (
              <option key={w} value={w}>
                Ward {w}
              </option>
            ))}
          </select>
          <button type="submit" className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs">
            Filter
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-[var(--mist)] mr-1">Priority:</span>
          <Link
            href={`/queue?priority=critical${params.ward ? `&ward=${params.ward}` : ""}`}
            className={`rb-chip touch-target ${params.priority === "critical" ? "rb-chip-failed" : "rb-chip-neutral"}`}
          >
            Critical
          </Link>
          <Link
            href={`/queue?priority=high${params.ward ? `&ward=${params.ward}` : ""}`}
            className={`rb-chip touch-target ${params.priority === "high" ? "rb-chip-flagged" : "rb-chip-neutral"}`}
          >
            High
          </Link>
          {(params.priority || params.category) && (
            <Link href={params.ward ? `/queue?ward=${params.ward}` : "/queue"} className="text-xs text-[var(--enamel)] hover:underline ml-2">
              Clear Filter
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="queue-items-heading" className="space-y-4">
        <h2 id="queue-items-heading" className="text-sm font-semibold text-[var(--mist)]">
          Queue Tasks ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="ux4g-card ux4g-card-solid p-8 text-center text-[var(--mist)]">
            No action items matching the selected filters.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rb-action-item"
                data-priority={item.priority}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rb-chip ${item.priority === "critical" ? "rb-chip-failed" : item.priority === "high" ? "rb-chip-flagged" : "rb-chip-neutral"}`}>
                      {item.priority}
                    </span>
                    <span className="rb-chip rb-chip-neutral">Ward {item.ward}</span>
                    <span className="text-xs text-[var(--mist)] font-mono">{item.relatedEntityId}</span>
                  </div>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--sheet)] text-[var(--ink)]">
                    Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 mt-1">
                  <div>
                    <h3 className="ux4g-body-m-strong text-[var(--ink)]">{item.headline}</h3>
                    <div className="text-xs text-[var(--mist)] mt-0.5">
                      Road: <strong>{item.roadName}</strong>
                    </div>
                  </div>

                  {item.amountAtRiskInr > 0 && (
                    <div className="text-right">
                      <div className="text-xs font-bold text-[var(--ink)] font-mono">
                        {formatInr(item.amountAtRiskInr)}
                      </div>
                      <div className="text-[0.625rem] text-[var(--mist)]">Amount at risk</div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[var(--mist)] bg-[var(--sheet)] p-2.5 rounded mt-2">
                  <strong>Recommended Protocol:</strong> {item.recommendedAction}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--rule)] text-xs">
                  <span className="text-[var(--mist)]">{item.evidenceCount} supporting evidence records</span>
                  {item.roadId.startsWith("RD") && (
                    <Link
                      href={`/roads/${item.roadId}`}
                      className="text-[var(--enamel)] font-medium hover:underline touch-target"
                    >
                      Open Road Passport
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
