import Link from "next/link";
import type { RoadPassportData } from "@/lib/passport/types";
import { formatInr } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

export function PassportHeader({ data }: { data: RoadPassportData }) {
  const { road, summary } = data;

  return (
    <header className="rb-passport-header rounded-2xl bg-[var(--teal-deep)] text-white p-6 sm:p-8 border border-[var(--teal-abyss)] shadow-lg space-y-6 rb-parallax-hero">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/wards/${wardSlug(road.ward)}`}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 transition-colors touch-target"
            >
              Ward {road.ward}
            </Link>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
              {road.roadType}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
              {road.surface}
            </span>
            {road.underDlp ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E85D4A]/25 text-[#ffaba0] border border-[#E85D4A]/50"
                title="Defect Liability Period active"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--vermilion)]" />
                Under DLP Warranty
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
                Regular Maintenance
              </span>
            )}
            {road.busRoute && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
                Bus Route
              </span>
            )}
          </div>

          <h1 className="ux4g-display-xs-strong text-white font-serif tracking-tight">
            {road.name}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
            Segment {road.segmentNo} — {road.lengthM.toLocaleString("en-IN")} m — {road.lanes} lane{road.lanes > 1 ? "s" : ""} — Resurfaced {road.lastResurfaced}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/roads/${road.id}/evidence`}
            className="ux4g-btn ux4g-btn-m border border-white/30 text-white hover:bg-white/10 touch-target inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <span>Evidence Pack</span>
          </Link>
          <Link
            href={`/assistant?roadId=${road.id}`}
            className="ux4g-btn ux4g-btn-m bg-[var(--vermilion)] hover:bg-[#d04b39] text-white touch-target inline-flex items-center gap-1.5 font-semibold border-0 shadow-sm transition-colors"
          >
            <span>Ask Rastabaaz</span>
          </Link>
        </div>
      </div>

      {/* Frosted KPI Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15 rb-motion-stagger">
        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
          <div className="text-lg sm:text-xl font-bold font-mono text-white rb-tabular-nums">
            {formatInr(summary.totalBilledInr)}
          </div>
          <div className="text-xs text-white/70 font-medium">Total Amount Billed</div>
        </div>

        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
          <div className="text-lg sm:text-xl font-bold font-mono text-white rb-tabular-nums">
            {summary.totalOrders}
          </div>
          <div className="text-xs text-white/70 font-medium">Work Orders Executed</div>
        </div>

        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
          <div className={`text-lg sm:text-xl font-bold font-mono rb-tabular-nums ${
            summary.reopenRate >= 0.25 ? "text-[#ff9d91]" : "text-[var(--mint-tint)]"
          }`}>
            {Math.round(summary.reopenRate * 100)}%
          </div>
          <div className="text-xs text-white/70 font-medium">30-Day Reopening Rate</div>
        </div>

        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
          <div className={`text-lg sm:text-xl font-bold font-mono rb-tabular-nums ${
            summary.auditFlagCount > 0 ? "text-[#ff9d91]" : "text-[var(--mint-tint)]"
          }`}>
            {summary.auditFlagCount}
          </div>
          <div className="text-xs text-white/70 font-medium">Audit Flags Detected</div>
        </div>
      </div>
    </header>
  );
}
