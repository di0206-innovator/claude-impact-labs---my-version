import type { Metadata } from "next";
import Link from "next/link";

import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { getRupee } from "@/lib/rupee/index";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Procurement & Accountability Intelligence — Rasta Hisaab 2.0",
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
    <article className="shell rb-page py-6 sm:py-10 space-y-6 rb-motion-fade-in">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="rb-chip rb-chip-neutral">Audit Screening Engine</span>
          <span className="rb-chip rb-chip-flagged">{flags.length} Audit Candidates</span>
        </div>
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Procurement & Accountability Intelligence</h1>
        <p className="ux4g-body-l-default text-[var(--mist)] rb-measure">
          Deterministic screening against the BMC Schedule of Rates, repeat repair patterns, and contractual Defect Liability Periods.
        </p>
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rb-motion-stagger">
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Total Flagged Orders</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{flags.length}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Total Amount at Risk</dt>
          <dd className="rb-stat-val text-[var(--flagged-ink)] rb-tabular-nums">{formatInrShort(totalAtRisk)}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Rate Card Overages</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{overRateFlags.length}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Repeat Repair Candidates</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{repeatFlags.length}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-[var(--mist)] mr-1">Audit Filter:</span>
        <Link
          href="/accountability"
          className={`rb-chip touch-target ${!params.kind ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          All Flags ({flags.length})
        </Link>
        <Link
          href="/accountability?kind=over_rate"
          className={`rb-chip touch-target ${params.kind === "over_rate" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          Rate Card Variance ({overRateFlags.length})
        </Link>
        <Link
          href="/accountability?kind=double_billed"
          className={`rb-chip touch-target ${params.kind === "double_billed" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          Repeat Repair ({repeatFlags.length})
        </Link>
        <Link
          href="/accountability?kind=paid_under_dlp"
          className={`rb-chip touch-target ${params.kind === "paid_under_dlp" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          DLP Conflict ({dlpFlags.length})
        </Link>
        <Link
          href="/accountability?kind=phantom_completion"
          className={`rb-chip touch-target ${params.kind === "phantom_completion" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          Completion Velocity ({phantomFlags.length})
        </Link>
      </div>

      <section aria-labelledby="audit-table-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="audit-table-heading" className="text-sm font-semibold text-[var(--mist)]">
            Screening Candidates ({displayedFlags.length})
          </h2>
        </div>

        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Work Order</th>
                <th scope="col">Road & Ward</th>
                <th scope="col">Contractor</th>
                <th scope="col">Audit Reason</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">At Risk INR</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedFlags.map((flag) => (
                <tr key={`${flag.workOrderId}_${flag.kind}`} className="hover:bg-[var(--sheet)] transition-colors">
                  <td>
                    <div className="font-mono text-xs font-bold text-[var(--ink)]">{flag.workOrderId}</div>
                    <div className="text-[0.6875rem] text-[var(--mist)]">{flag.completedAt}</div>
                  </td>
                  <td>
                    <div className="font-medium text-xs text-[var(--ink)]">{flag.roadName}</div>
                    <Link href={`/wards/${wardSlug(flag.ward)}`} className="text-[0.6875rem] text-[var(--enamel)] hover:underline">
                      Ward {flag.ward}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contractors/${flag.contractorId}`} className="text-xs text-[var(--enamel)] hover:underline">
                      {flag.contractorName}
                    </Link>
                  </td>
                  <td className="text-xs text-[var(--mist)] max-w-sm">
                    {flag.reason}
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

      <section className="p-4 bg-[var(--sheet)] rounded border border-[var(--rule)] space-y-2 text-xs text-[var(--mist)]">
        <h3 className="font-semibold text-[var(--ink)]">Audit Integrity & Legal Safeguard</h3>
        <p className="leading-relaxed">
          An audit flag identifies a statistical or procedural candidate for supervisory review. It does not constitute proof of illegality or contractual breach. Contractual liability requires inspection of approved BOQ tender clauses and physical core sample testing.
        </p>
      </section>
    </article>
  );
}
