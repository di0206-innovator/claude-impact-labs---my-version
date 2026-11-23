import type { Metadata } from "next";
import Link from "next/link";

import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";
import { formatInr } from "@/lib/rupee/format";
import { getRupee } from "@/lib/rupee/index";
import { ActionQueueClientList } from "./queue-client";

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
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Operational Command Queue
            </span>
            <span className="rb-chip-dark rb-chip-dark-failed">{summary.criticalCount} Critical Actions</span>
            <span className="rb-chip-dark">Daily Engineer Triage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            Ward Engineer Action Queue
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            Transforming civic intelligence into prioritized operational tasks: investigate SLA misses, verify DLP warranties, and review recurring failures across Mumbai&apos;s road network.
          </p>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Total Action Items</dt>
            <dd className="rb-kpi-val">{summary.totalItems}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Critical Priority</dt>
            <dd className="rb-kpi-val text-[#fca5a5]">{summary.criticalCount}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">High Priority</dt>
            <dd className="rb-kpi-val text-[#fde68a]">{summary.highCount}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Audit Amount at Risk</dt>
            <dd className="rb-kpi-val">{formatInr(summary.auditFlagAtRiskInr)}</dd>
          </div>
        </dl>
      </header>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-4 sm:p-5 shadow-[var(--card-shadow)] flex flex-wrap items-center justify-between gap-4">
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
            className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              params.priority === "critical"
                ? "rb-pill-vermilion"
                : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
            }`}
          >
            Critical
          </Link>
          <Link
            href={`/queue?priority=high${params.ward ? `&ward=${params.ward}` : ""}`}
            className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              params.priority === "high"
                ? "rb-pill-vermilion"
                : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
            }`}
          >
            High
          </Link>
          {(params.priority || params.category) && (
            <Link href={params.ward ? `/queue?ward=${params.ward}` : "/queue"} className="text-xs text-[var(--enamel)] hover:underline ml-2 font-medium">
              Clear Filter
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="queue-items-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="queue-items-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Queue Tasks ({items.length})
          </h2>
        </div>

        <ActionQueueClientList initialItems={items} scope={params.ward || "all"} />
      </section>
    </article>
  );
}
