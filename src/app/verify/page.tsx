import type { Metadata } from "next";
import Link from "next/link";
import { VerifyClientForm } from "./verify-client-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Citizen Repair Verification — Rastabaaz",
  description:
    "Verify road repair outcomes in your neighborhood: record whether a reported fix held, returned, or failed.",
};

const SAMPLE_IDS = [
  { id: "BMC25-000013", label: "BMC25-000013 (Completed)" },
  { id: "BMC25-000042", label: "BMC25-000042 (Reopened)" },
  { id: "BMC25-000005", label: "BMC25-000005 (Sample)" },
] as const;

type PageProps = {
  searchParams: Promise<{ submitted?: string; id?: string; complaintId?: string; observation?: string }>;
};

export default async function VerifyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialId = (params.complaintId || params.id || "").trim();

  return (
    <article className="shell rb-page py-6 sm:py-10 rb-motion-fade-in">
      <div className="rb-split-flow-grid">
        {/* Left Column: Sticky Editorial Intro */}
        <aside className="rb-split-sticky-col space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rb-chip rb-chip-neutral">Crowdsourced Accountability</span>
              <span className="rb-chip rb-chip-held">Citizen Observation</span>
            </div>
            <h1 className="ux4g-display-xs-strong text-[var(--ink)] font-serif">
              Citizen Repair Verification
            </h1>
            <p className="ux4g-body-m-default text-[var(--mist)] leading-relaxed">
              Official records show repairs marked as completed. Help verify if the physical road was truly fixed or if the pothole has returned.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-[var(--rule)] bg-[var(--canvas)] space-y-3">
            <div className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
              Verification Standards
            </div>
            <div className="rb-step-chain">
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">01 Independent Record</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Citizen field logs are segregated from contractor self-claims
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">02 DLP Liability Impact</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Reopened potholes during warranty trigger contractor rectification
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">03 Passport Ledger</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Feeds the 291 Mumbai road passports & contractor scorecards
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--mist)]">Quick Select Sample:</div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_IDS.map((s) => (
                <Link
                  key={s.id}
                  href={`/verify?id=${s.id}`}
                  className="rb-chip rb-chip-neutral hover:border-[var(--teal-deep)] hover:text-[var(--teal-deep)] transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Hairline Alabaster Card with Form or Confirmation */}
        <section className="space-y-6">
          <VerifyClientForm
            initialComplaintId={initialId}
            initialSubmitted={params.submitted === "1"}
            initialObservation={params.observation ?? ""}
          />
        </section>
      </div>
    </article>
  );
}
