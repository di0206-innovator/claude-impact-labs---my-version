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
    <article className="shell-narrow rb-page py-6 sm:py-10 space-y-6 rb-motion-fade-in">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="rb-chip rb-chip-neutral">Crowdsourced Accountability</span>
          <span className="rb-chip rb-chip-held">Citizen Observation</span>
        </div>
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Citizen Repair Verification</h1>
        <p className="ux4g-body-m-default text-[var(--mist)]">
          Official records show repairs marked as completed. Help verify if the physical road was truly fixed or if the pothole has returned.
        </p>
      </header>

      {params.submitted === "1" ? (
        <div className="p-6 rounded border border-[var(--held-border)] bg-[var(--held-bg)] space-y-3">
          <h2 className="ux4g-heading-s-strong text-[var(--held-ink)]">Observation Recorded</h2>
          <p className="text-xs text-[var(--ink)]">
            {submittedId ? <>Complaint <strong>{submittedId}</strong></> : "Your report"}
            {obsLabel ? <> marked as <strong>{obsLabel}</strong>.</> : "."}
          </p>
          <p className="text-xs text-[var(--mist)] leading-relaxed">
            Your feedback is logged as an independent citizen observation, kept distinct from official engineer sign-offs to preserve evidentiary integrity.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
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
          className="p-6 rounded border border-[var(--rule)] bg-[var(--card)] space-y-5"
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
              className="ux4g-input w-full py-2 px-3 text-sm rounded border border-[var(--rule)] bg-[var(--card)] font-mono text-[var(--ink)]"
              required
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[var(--mist)]">Quick fill:</span>
              {SAMPLE_IDS.map((s) => (
                <Link key={s.id} href={`/verify?id=${s.id}`} className="rb-chip rb-chip-neutral hover:underline">
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2">
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
                <label key={val} className="flex items-start gap-2.5 p-3 rounded border border-[var(--rule)] bg-[var(--sheet)] cursor-pointer hover:bg-[var(--card)]">
                  <input type="radio" name="observation" value={val} defaultChecked={idx === 0} className="mt-0.5" />
                  <div>
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
              className="ux4g-input w-full py-2 px-3 text-xs rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
            />
          </div>

          <div className="p-3 rounded bg-[var(--sheet)] text-[0.6875rem] text-[var(--mist)]">
            <strong>Evidentiary Notice:</strong> Submissions are classified as citizen field observations and do not override municipal contractor completion certificates without physical re-inspection.
          </div>

          <button type="submit" className="ux4g-btn ux4g-btn-m ux4g-btn-primary w-full touch-target">
            Submit Citizen Verification
          </button>
        </form>
      )}
    </article>
  );
}
