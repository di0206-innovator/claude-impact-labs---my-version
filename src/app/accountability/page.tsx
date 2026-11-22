import type { Metadata } from "next";
import Link from "next/link";

import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { getRupee } from "@/lib/rupee/index";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Procurement & Accountability Intelligence — Rastabaaz",
  description:
    "Systematic audit screening: cost variance against standard BMC rate cards, repeat repair clusters, and Defect Liability Period (DLP) flags.",
};

type PageProps = {
  searchParams: Promise<{ kind?: string }>;
};

export default async function AccountabilityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { flags, ds } = getRupee();

  const overRateFlags = flags.filter((f) => f.kind === "over_rate");
  const repeatFlags = flags.filter((f) => f.kind === "double_billed");
  const dlpFlags = flags.filter((f) => f.kind === "paid_under_dlp");
  const phantomFlags = flags.filter((f) => f.kind === "phantom_completion");

  const totalAtRisk = flags.reduce((sum, f) => sum + f.amountAtRiskInr, 0);

  const displayedFlags = params.kind
    ? flags.filter((f) => f.kind === params.kind)
    : flags;

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Audit Screening Engine
            </span>
            <span className="rb-chip-dark rb-chip-dark-flagged">{flags.length} Audit Candidates</span>
            <span className="rb-chip-dark">Monsoon 2025 Forensic Audit</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            Procurement &amp; Accountability Intelligence
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            Deterministic screening against the BMC Schedule of Rates, repeat repair patterns, and contractual Defect Liability Periods across Mumbai&apos;s road tenders.
          </p>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Total Flagged Orders</dt>
            <dd className="rb-kpi-val">{flags.length}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Total Amount at Risk</dt>
            <dd className="rb-kpi-val text-[#fde68a]">{formatInrShort(totalAtRisk)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Rate Card Overages</dt>
            <dd className="rb-kpi-val">{overRateFlags.length}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Repeat Repair Flags</dt>
            <dd className="rb-kpi-val">{repeatFlags.length}</dd>
          </div>
        </dl>
      </header>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-4 sm:p-5 shadow-[var(--card-shadow)] flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-[var(--mist)] mr-1">Audit Filter:</span>
        <Link
          href="/accountability"
          className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            !params.kind
              ? "rb-pill-vermilion"
              : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
          }`}
        >
          All Flags ({flags.length})
        </Link>
        <Link
          href="/accountability?kind=over_rate"
          className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            params.kind === "over_rate"
              ? "rb-pill-vermilion"
              : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
          }`}
        >
          Rate Card Variance ({overRateFlags.length})
        </Link>
        <Link
          href="/accountability?kind=double_billed"
          className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            params.kind === "double_billed"
              ? "rb-pill-vermilion"
              : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
          }`}
        >
          Repeat Repair ({repeatFlags.length})
        </Link>
        <Link
          href="/accountability?kind=paid_under_dlp"
          className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            params.kind === "paid_under_dlp"
              ? "rb-pill-vermilion"
              : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
          }`}
        >
          DLP Conflict ({dlpFlags.length})
        </Link>
        <Link
          href="/accountability?kind=phantom_completion"
          className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            params.kind === "phantom_completion"
              ? "rb-pill-vermilion"
              : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
          }`}
        >
          Completion Velocity ({phantomFlags.length})
        </Link>
      </section>

      <section aria-labelledby="audit-table-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="audit-table-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
              Screening Candidates
            </h2>
            <span className="rb-chip rb-chip-neutral text-xs">{displayedFlags.length} bills</span>
          </div>
        </div>

        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Work Order</th>
                <th scope="col">Road &amp; Ward</th>
                <th scope="col">Contractor</th>
                <th scope="col">Audit Reason</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">At Risk INR</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedFlags.map((flag) => (
                <tr key={`${flag.workOrderId}_${flag.kind}`} className="hover:bg-[rgba(6,78,75,0.02)] transition-colors">
                  <td>
                    <div className="font-mono text-xs font-bold text-[var(--ink)]">{flag.workOrderId}</div>
                    <div className="text-[0.6875rem] text-[var(--mist)] font-mono">{flag.completedAt}</div>
                  </td>
                  <td>
                    <div className="font-medium text-xs text-[var(--ink)]">{flag.roadName}</div>
                    <Link href={`/wards/${wardSlug(flag.ward)}`} className="text-[0.6875rem] text-[var(--enamel)] hover:underline font-medium">
                      Ward {flag.ward}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contractors/${flag.contractorId}`} className="text-xs text-[var(--enamel)] hover:underline">
                      {flag.contractorName}
                    </Link>
                  </td>
                  <td className="text-xs text-[var(--mist)] max-w-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {flag.kind === "paid_under_dlp" && <span className="rb-dlp-flag">DLP Conflict</span>}
                      <span>{flag.reason}</span>
                    </div>
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--ink)]">
                    {formatInr(flag.costInr)}
                  </td>
                  <td className="text-right font-mono text-xs font-bold text-[var(--failed-ink)]">
                    {formatInr(flag.amountAtRiskInr)}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/roads/${flag.roadId}`}
                      className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center"
                    >
                      Passport
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="p-5 bg-[var(--card)] rounded-xl border border-[var(--rule)] shadow-[var(--card-shadow)] space-y-2 text-xs text-[var(--mist)]">
        <h3 className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
          <span className="rb-status-dot rb-status-dot-held" aria-hidden="true" />
          Audit Integrity &amp; Legal Safeguard
        </h3>
        <p className="leading-relaxed">
          An audit flag identifies a statistical or procedural candidate for supervisory review. It does not constitute proof of illegality or contractual breach. Contractual liability requires inspection of approved BOQ tender clauses and physical core sample testing.
        </p>
      </section>
    </article>
  );
}
