import Link from "next/link";
import type { RoadPassportData } from "@/lib/passport/types";
import { formatInr } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

export function PassportHeader({ data }: { data: RoadPassportData }) {
  const { road, summary } = data;

  return (
    <header className="rb-passport-header ux4g-card ux4g-card-solid rb-glass-card rb-parallax-hero p-6 border border-[var(--rule)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              href={`/wards/${wardSlug(road.ward)}`}
              className="rb-chip rb-chip-neutral touch-target"
            >
              Ward {road.ward}
            </Link>
            <span className="rb-chip rb-chip-neutral">{road.roadType}</span>
            <span className="rb-chip rb-chip-neutral">{road.surface}</span>
            {road.underDlp ? (
              <span className="rb-chip rb-chip-flagged" title="Defect Liability Period active">
                Under DLP
              </span>
            ) : (
              <span className="rb-chip rb-chip-held">Regular Maintenance</span>
            )}
            {road.busRoute && (
              <span className="rb-chip rb-chip-neutral">Bus Route</span>
            )}
          </div>
          <h1 className="ux4g-display-xs-strong text-[var(--ink)]">{road.name}</h1>
          <p className="ux4g-body-m-default text-[var(--mist)] mt-1">
            Segment {road.segmentNo} — {road.lengthM.toLocaleString("en-IN")} m — {road.lanes} lane{road.lanes > 1 ? "s" : ""} — Resurfaced {road.lastResurfaced}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/roads/${road.id}/evidence`}
            className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target inline-flex items-center gap-1.5"
          >
            <span>Evidence Pack</span>
          </Link>
          <Link
            href={`/assistant?roadId=${road.id}`}
            className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target inline-flex items-center gap-1.5"
          >
            <span>Ask Rastabaaz</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[var(--rule)] rb-motion-stagger">
        <div className="rb-stat-card rb-interactive-card">
          <div className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{formatInr(summary.totalBilledInr)}</div>
          <div className="rb-stat-label">Total Amount Billed</div>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <div className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{summary.totalOrders}</div>
          <div className="rb-stat-label">Work Orders Executed</div>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <div className={`rb-stat-val rb-tabular-nums ${summary.reopenRate >= 0.25 ? "text-[var(--failed-ink)]" : "text-[var(--ink)]"}`}>
            {Math.round(summary.reopenRate * 100)}%
          </div>
          <div className="rb-stat-label">30-Day Reopening Rate</div>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <div className={`rb-stat-val rb-tabular-nums ${summary.auditFlagCount > 0 ? "text-[var(--flagged-ink)]" : "text-[var(--held-ink)]"}`}>
            {summary.auditFlagCount}
          </div>
          <div className="rb-stat-label">Audit Flags Detected</div>
        </div>
      </div>
    </header>
  );
}
