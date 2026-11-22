import type { Metadata } from "next";
import Link from "next/link";

import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { getRupee } from "@/lib/rupee/index";
import { pct, wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City Intelligence Overview — Rastabaaz",
  description:
    "Citywide civic pulse across Mumbai's 24 wards: total billed amounts, SLA compliance, 30-day durability rates, and audit screening.",
};

export default function OverviewPage() {
  const { overview, ds, flags } = getRupee();

  const totalComplaints = ds.complaints.length;
  const gpsComplaints = ds.complaints.filter((c) => c.lat !== null && c.lng !== null).length;
  const nonGpsComplaints = totalComplaints - gpsComplaints;
  const gpsPct = totalComplaints > 0 ? ((gpsComplaints / totalComplaints) * 100).toFixed(1) : "0.0";

  const totalOrders = ds.workOrders.length;
  const slaMetOrders = ds.workOrders.filter((w) => w.slaMet).length;
  const slaRate = totalOrders > 0 ? slaMetOrders / totalOrders : 0;

  const reopenedOrders = ds.workOrders.filter((w) => w.reopened).length;
  const reopenRate = totalOrders > 0 ? reopenedOrders / totalOrders : 0;

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Citywide Executive Dashboard
            </span>
            <span className="rb-chip-dark rb-chip-dark-held">Monsoon 2025</span>
            <span className="rb-chip-dark">24 Administrative Wards</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            Mumbai Road Intelligence Overview
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            Comprehensive civic pulse across Mumbai&apos;s 24 administrative wards: where money was billed, whether repairs held, and which wards require intervention.
          </p>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Total Amount Billed</dt>
            <dd className="rb-kpi-val">{formatInrShort(overview.spentInr)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Total Citizen Reports</dt>
            <dd className="rb-kpi-val">{totalComplaints.toLocaleString("en-IN")}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">City SLA Compliance</dt>
            <dd className={`rb-kpi-val ${slaRate < 0.75 ? "text-[#fca5a5]" : "text-[var(--mint-tint)]"}`}>
              {pct(slaRate)}
            </dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">30-Day Reopening Rate</dt>
            <dd className={`rb-kpi-val ${reopenRate > 0.2 ? "text-[#fca5a5]" : "text-[var(--mint-tint)]"}`}>
              {pct(reopenRate)}
            </dd>
          </div>
        </dl>
      </header>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="ux4g-heading-s-strong text-[var(--ink)]">Citywide Spend by Outcome</h2>
          <span className="text-xs text-[var(--mist)] font-mono">Budget: {formatInrShort(overview.budgetInr)}</span>
        </div>
        <OutcomeBar
          outcome={overview.outcome}
          spentInr={overview.spentInr}
          budgetInr={overview.budgetInr}
          label="All 24 wards combined spend"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3.5 rounded-lg bg-[var(--held-bg)] border border-[var(--held-border)] flex items-start gap-2.5">
            <span className="rb-status-dot rb-status-dot-held mt-1" aria-hidden="true" />
            <div>
              <strong className="text-[var(--held-ink)] block text-sm font-mono">{formatInrShort(overview.outcome.heldInr)} Held</strong>
              <span className="text-[var(--mist)]">Repairs that held for 30+ days without audit flags</span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-[var(--flagged-bg)] border border-[var(--flagged-border)] flex items-start gap-2.5">
            <span className="rb-status-dot rb-status-dot-flagged mt-1" aria-hidden="true" />
            <div>
              <strong className="text-[var(--flagged-ink)] block text-sm font-mono">{formatInrShort(overview.outcome.flaggedInr)} Flagged</strong>
              <span className="text-[var(--mist)]">Carries cost variance, repeat-repair, or DLP flag</span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-[var(--failed-bg)] border border-[var(--failed-border)] flex items-start gap-2.5">
            <span className="rb-status-dot rb-status-dot-failed mt-1" aria-hidden="true" />
            <div>
              <strong className="text-[var(--failed-ink)] block text-sm font-mono">{formatInrShort(overview.outcome.failedInr)} Failed</strong>
              <span className="text-[var(--mist)]">Potholes and road repairs reopened within 30 days</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4">
        <h2 className="ux4g-heading-s-strong text-[var(--ink)]">Data Completeness & Blindspot Index</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--mist)]">
          <div className="p-3.5 rounded-lg border border-[var(--rule)] bg-[var(--sheet)]">
            <div className="font-semibold text-sm text-[var(--ink)] font-mono">{gpsPct}% GPS Coverage</div>
            <p className="mt-1 leading-relaxed">
              {gpsComplaints.toLocaleString("en-IN")} reports carry precise GPS coords; {nonGpsComplaints.toLocaleString("en-IN")} Helpline 1916 and walk-in reports are resolved via locality gazetteer.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-[var(--rule)] bg-[var(--sheet)]">
            <div className="font-semibold text-sm text-[var(--ink)] font-mono">{flags.length} Audit Flags Screened</div>
            <p className="mt-1 leading-relaxed">
              All {totalOrders.toLocaleString("en-IN")} work orders match valid road IDs, wards, contractors, and rate card items.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-[var(--rule)] bg-[var(--sheet)]">
            <div className="font-semibold text-sm text-[var(--ink)]">Synthetic Provenance</div>
            <p className="mt-1 leading-relaxed">
              Municipal data is simulated for research and development. Never presented as official certified BMC records.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="ux4g-heading-s-strong text-[var(--ink)]">24 Ward Scoreboard</h2>
            <span className="rb-chip rb-chip-neutral text-xs">24 Ledgers</span>
          </div>
          <Link href="/wards" className="text-xs text-[var(--enamel)] hover:underline touch-target font-medium inline-flex items-center gap-1">
            View All Ward Ledgers →
          </Link>
        </div>

        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Ward</th>
                <th scope="col">Zone</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">Budget INR</th>
                <th scope="col" className="text-right">Reopen %</th>
                <th scope="col" className="text-right">Flags</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overview.wards.map((w) => (
                <tr key={w.code} className="hover:bg-[rgba(6,78,75,0.02)] transition-colors">
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`rb-status-dot ${w.reopenRate >= 0.25 ? "rb-status-dot-failed" : w.flagCount > 0 ? "rb-status-dot-flagged" : "rb-status-dot-held"}`} aria-hidden="true" />
                      <div>
                        <Link href={`/wards/${wardSlug(w.code)}`} className="font-bold text-[var(--enamel)] hover:underline">
                          Ward {w.code}
                        </Link>
                        <div className="text-xs text-[var(--mist)]">{w.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-[var(--mist)]">{ds.wards.find((d) => d.code === w.code)?.zone}</td>
                  <td className="text-right font-mono text-xs font-semibold text-[var(--ink)]">{formatInr(w.spentInr)}</td>
                  <td className="text-right font-mono text-xs text-[var(--mist)]">{formatInr(w.budgetInr)}</td>
                  <td className="text-right text-xs font-mono">
                    <span className={w.reopenRate >= 0.25 ? "text-[var(--failed-ink)] font-bold" : "text-[var(--ink)]"}>
                      {Math.round(w.reopenRate * 100)}%
                    </span>
                  </td>
                  <td className="text-right text-xs font-mono">
                    <span className={w.flagCount > 0 ? "text-[var(--flagged-ink)] font-semibold" : "text-[var(--mist)]"}>
                      {w.flagCount}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/wards/${wardSlug(w.code)}`}
                      className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center"
                    >
                      Ward Ledger
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
