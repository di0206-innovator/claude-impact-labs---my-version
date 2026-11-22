import type { Metadata } from "next";
import Link from "next/link";

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

const OBS_LABELS: Record<string, string> = {
  fixed: "Fix is holding well",
  returned: "Defect has returned / reopened",
  persists: "Never repaired / defect persists",
  new_issue: "New hazard observed",
};

type PageProps = {
  searchParams: Promise<{ submitted?: string; id?: string; complaintId?: string; observation?: string }>;
};

export default async function VerifyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const submittedId = (params.complaintId || params.id || "").trim();
  const obsLabel = params.observation ? (OBS_LABELS[params.observation] ?? params.observation) : null;

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
          {params.submitted === "1" ? (
            <div className="p-6 sm:p-8 rounded-xl border border-[var(--held-border)] bg-[var(--held-bg)] space-y-4 shadow-sm rb-glass-card">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--held)]" />
                <h2 className="ux4g-heading-s-strong text-[var(--held-ink)]">Observation Recorded</h2>
              </div>
              <p className="text-xs text-[var(--ink)]">
                {submittedId ? <>Complaint <strong>{submittedId}</strong></> : "Your report"}
                {obsLabel ? <> marked as <strong>{obsLabel}</strong>.</> : "."}
              </p>
              <p className="text-xs text-[var(--mist)] leading-relaxed">
                Your feedback is logged as an independent citizen observation, kept distinct from official engineer sign-offs to preserve evidentiary integrity.
              </p>
              <div className="flex flex-wrap gap-3 pt-3">
                {submittedId ? (
                  <Link href={`/receipt/${encodeURIComponent(submittedId)}`} className="ux4g-btn ux4g-btn-s ux4g-btn-primary touch-target">
                    View Rupee Receipt
                  </Link>
                ) : null}
                <Link href="/roads" className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target">
                  Explore Mumbai Roads
                </Link>
              </div>
            </div>
          ) : (
            <form
              action="/verify"
              method="get"
              className="p-6 sm:p-8 rounded-xl border border-[var(--rule)] bg-[var(--card)] shadow-sm rb-glass-card space-y-6"
            >
              <input type="hidden" name="submitted" value="1" />

              <div className="space-y-2">
                <label htmlFor="complaint-id" className="block text-xs font-semibold text-[var(--ink)]">
                  Complaint Reference ID
                </label>
                <input
                  id="complaint-id"
                  name="complaintId"
                  type="text"
                  defaultValue={params.id ?? ""}
                  placeholder="e.g. BMC25-000013"
                  className="ux4g-input w-full py-2.5 px-3.5 text-sm rounded-lg border border-[var(--rule)] bg-[var(--canvas)] font-mono text-[var(--ink)] focus:border-[var(--teal-deep)] focus:bg-[var(--card)] transition-colors"
                  required
                />
              </div>

              <fieldset className="space-y-2.5">
                <legend className="text-xs font-semibold text-[var(--ink)]">
                  Observed Field Status of Road Repair
                </legend>
                <div className="space-y-2 text-xs">
                  {(
                    [
                      ["fixed", "Fix is Holding Well", "Smooth surface, no visible depression or crater."],
                      ["returned", "Defect Has Returned / Reopened", "Pothole reopened, paver block displaced, or patch eroded."],
                      ["persists", "Never Repaired / Defect Persists", "No evidence of physical work ever taking place."],
                      ["new_issue", "New Hazard Observed", "Waterlogging, open manhole, or cave-in near repair site."],
                    ] as const
                  ).map(([val, title, desc], idx) => (
                    <label
                      key={val}
                      className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--rule)] bg-[var(--canvas)] cursor-pointer hover:bg-[var(--sheet)] hover:border-[var(--rule-firm)] transition-colors"
                    >
                      <input
                        type="radio"
                        name="observation"
                        value={val}
                        defaultChecked={idx === 0}
                        className="mt-0.5 accent-[var(--vermilion)]"
                      />
                      <div className="space-y-0.5">
                        <strong className="block text-[var(--ink)]">{title}</strong>
                        <span className="text-[var(--mist)]">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="notes" className="block text-xs font-semibold text-[var(--ink)]">
                  Additional Citizen Remarks (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Describe current road condition, landmark, or lane location..."
                  className="ux4g-input w-full py-2.5 px-3 text-xs rounded-lg border border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink)] focus:border-[var(--teal-deep)] focus:bg-[var(--card)] transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-[var(--sheet)] border border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] leading-relaxed">
                <strong className="text-[var(--ink)]">Evidentiary Notice:</strong> Submissions are classified as citizen field observations and do not override municipal contractor completion certificates without physical re-inspection.
              </div>

              {/* Single Signal Vermilion CTA */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[var(--vermilion)] hover:bg-[#d04b39] text-white text-sm font-semibold tracking-wide shadow-sm transition-all transform active:scale-[0.99] touch-target flex items-center justify-center gap-2"
              >
                Submit Citizen Verification
              </button>
            </form>
          )}
        </section>
      </div>
    </article>
  );
}
