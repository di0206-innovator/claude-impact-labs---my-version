"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitVerificationAction } from "@/lib/actions/verify";
import type { CitizenObservationType } from "@/lib/repo/port";

const OBS_LABELS: Record<string, string> = {
  fixed: "Fix is holding well",
  returned: "Defect has returned / reopened",
  persists: "Never repaired / defect persists",
  new_issue: "New hazard observed",
};

const OBS_OPTIONS = [
  ["fixed", "Fix is Holding Well", "Smooth surface, no visible depression or crater."],
  ["returned", "Defect Has Returned / Reopened", "Pothole reopened, paver block displaced, or patch eroded."],
  ["persists", "Never Repaired / Defect Persists", "No evidence of physical work ever taking place."],
  ["new_issue", "New Hazard Observed", "Waterlogging, open manhole, or cave-in near repair site."],
] as const;

type Props = {
  initialComplaintId?: string;
  initialSubmitted?: boolean;
  initialObservation?: string;
};

export function VerifyClientForm({
  initialComplaintId = "",
  initialSubmitted = false,
  initialObservation = "",
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [submittedId, setSubmittedId] = useState(initialComplaintId);
  const [submittedObs, setSubmittedObs] = useState<CitizenObservationType>(
    (initialObservation as CitizenObservationType) || "fixed",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await submitVerificationAction(formData);
      if (result.ok) {
        setSubmittedId(result.complaintId);
        setSubmittedObs(result.observation);
        setSubmitted(true);
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  if (submitted) {
    const obsLabel = OBS_LABELS[submittedObs] ?? submittedObs;
    return (
      <div className="p-6 sm:p-8 rounded-xl border border-[var(--held-border)] bg-[var(--held-bg)] space-y-4 shadow-sm rb-glass-card">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--held)]" />
          <h2 className="ux4g-heading-s-strong text-[var(--held-ink)]">Observation Recorded</h2>
        </div>
        <p className="text-xs text-[var(--ink)]">
          {submittedId ? (
            <>
              Complaint <strong>{submittedId}</strong>
            </>
          ) : (
            "Your observation"
          )}{" "}
          marked as <strong>{obsLabel}</strong>.
        </p>
        <p className="text-xs text-[var(--mist)] leading-relaxed">
          Your feedback is logged as an independent citizen observation, kept distinct from official
          engineer sign-offs to preserve evidentiary integrity.
        </p>
        <div className="flex flex-wrap gap-3 pt-3">
          {submittedId ? (
            <Link
              href={`/receipt/${encodeURIComponent(submittedId)}`}
              className="ux4g-btn ux4g-btn-s ux4g-btn-primary touch-target"
            >
              View Rupee Receipt
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
          >
            Record Another Observation
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 sm:p-8 rounded-xl border border-[var(--rule)] bg-[var(--card)] shadow-sm rb-glass-card space-y-6"
    >
      {errorMessage ? (
        <div className="p-3.5 rounded-lg bg-[var(--failed-bg)] border border-[var(--failed-border)] text-xs text-[var(--failed-ink)] font-semibold">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="complaint-id" className="block text-xs font-semibold text-[var(--ink)]">
          Complaint Reference ID
        </label>
        <input
          id="complaint-id"
          name="complaintId"
          type="text"
          defaultValue={initialComplaintId}
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
          {OBS_OPTIONS.map(([val, title, desc], idx) => (
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
        <strong className="text-[var(--ink)]">Evidentiary Notice:</strong> Submissions are
        classified as citizen field observations and do not override municipal contractor completion
        certificates without physical re-inspection.
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 rounded-lg bg-[var(--vermilion)] hover:bg-[#d04b39] text-white text-sm font-semibold tracking-wide shadow-sm transition-all transform active:scale-[0.99] touch-target flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting Observation..." : "Submit Citizen Verification"}
      </button>
    </form>
  );
}
