import type { Metadata } from "next";

import { ReportForm } from "@/components/report/ReportForm";
import { parseIssueType } from "@/lib/issue-type-param";

export const metadata: Metadata = {
  title: "Report a Road Problem — Rastabaaz",
  description:
    "Photograph a pothole, waterlogging, or open manhole in Mumbai. Your report joins the ward's repair money trail.",
};

type ReportPageProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { type } = await searchParams;
  const initialIssueType = parseIssueType(type);

  return (
    <article className="shell rb-page py-6 sm:py-10 rb-motion-fade-in">
      <div className="rb-split-flow-grid">
        {/* Left Column: Sticky Editorial Intro */}
        <aside className="rb-split-sticky-col space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rb-chip rb-chip-neutral">Public Civic Intake</span>
              <span className="rb-chip rb-chip-held">Cryptographic Trail</span>
            </div>
            <h1 className="ux4g-display-xs-strong text-[var(--ink)] font-serif">
              Report a road problem
            </h1>
            <p className="ux4g-body-m-default text-[var(--mist)] leading-relaxed">
              Photograph a pothole, waterlogging, or open manhole in Mumbai.
              Your report immediately links to municipal work orders, contractor SLA accountability, and the public rupee ledger.
            </p>
          </div>

          {/* 4-Step Progressive Timeline */}
          <div className="p-5 rounded-lg border border-[var(--rule)] bg-[var(--canvas)] space-y-3">
            <div className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
              Verification Protocol
            </div>
            <div className="rb-step-chain">
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">01 Evidence Capture</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Upload photographic proof of surface defect
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">02 Geo-Lock Precision</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Coordinates snapped to 291 Mumbai road segments
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">03 Municipal Matching</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Deduplicated against BMC work orders & tenders
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">04 Rupee Accountability</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Track contractor billing, DLP warranty & SLA
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--mint-tint)] border border-[rgba(6,78,75,0.18)] text-xs text-[var(--teal-deep)] space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--teal-deep)]" />
              Evidence-First Integrity
            </div>
            <p className="text-[0.6875rem] leading-relaxed text-[var(--mist)]">
              All submissions are cryptographically hashed and publicly auditable. No citizen identities are ever published.
            </p>
          </div>
        </aside>

        {/* Right Column: Hairline Alabaster Form Card */}
        <section className="p-6 sm:p-8 rounded-xl border border-[var(--rule)] bg-[var(--card)] shadow-sm rb-glass-card">
          <ReportForm initialIssueType={initialIssueType} />
        </section>
      </div>
    </article>
  );
}
