"use client";

import { GovProgress } from "@/components/gov/GovProgress";
import { ReportFormFooter } from "@/components/report/ReportFormFooter";
import { ReportPhotoField } from "@/components/report/ReportPhotoField";
import { ReportReview } from "@/components/report/ReportReview";
import type { SummarySection } from "@/components/report/ReportSummary";
import { SubmittedPanel } from "@/components/report/SubmittedPanel";
import { STEP, STEP_LABELS, TapAnswerSteps } from "@/components/report/TapAnswerSteps";
import { useReportDraftState } from "@/components/report/use-report-draft-state";
import type { IssueType } from "@/lib/types";

/**
 * Photo first: the evidence is already in their hand. Then one question per
 * screen, by tapping through the answers, then Check.
 */
const EDIT_STEP: Record<SummarySection, number> = {
  problem: STEP.issue,
  place: STEP.place,
  answers: STEP.noticed,
};

export function ReportDraft({
  initialIssueType,
  onAgain,
}: {
  initialIssueType?: IssueType;
  onAgain: () => void;
}) {
  const {
    step,
    issueType,
    issueInvalid,
    pin,
    submittedId,
    queuedOffline,
    queuedId,
    roadTrail,
    formError,
    photoState,
    locationError,
    locationConfirmed,
    noticedWindow,
    recurs,
    accident,
    description,
    detailsError,
    pending,
    busy,
    answers,
    ready,
    continueLabel,
    changePin,
    pickIssue,
    pickNoticedWindow,
    pickRecurs,
    pickAccident,
    setDescription,
    goTo,
    onContinue,
    onSubmit,
  } = useReportDraftState(initialIssueType);

  if (queuedOffline && answers) {
    return (
      <div className="p-6 sm:p-8 rounded-xl border border-[var(--gold-border)] bg-[var(--gold-bg)] space-y-4 shadow-sm rb-glass-card max-w-xl mx-auto my-8">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />
          <h2 className="ux4g-heading-s-strong text-[var(--gold-ink)]">Report Buffered Offline</h2>
        </div>
        <p className="text-xs text-[var(--ink)] leading-relaxed">
          Your report has been secured in browser storage ({queuedId}). When your connection is restored, it will automatically transmit to Rastabaaz.
        </p>
        <div className="p-3 rounded bg-[var(--sheet)] border border-[var(--rule)] text-xs font-mono text-[var(--mist)]">
          Queue ID: {queuedId} — Status: Waiting for network reconnection
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onAgain}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  if (submittedId && answers) {
    return <SubmittedPanel reportId={submittedId} answers={answers} roadTrail={roadTrail} lang="en" onAgain={onAgain} />;
  }

  return (
    <form className="rb-report" data-step={submittedId ? "done" : step} noValidate onSubmit={onSubmit}>
      <GovProgress current={step} labels={STEP_LABELS} />
      {step === STEP.photo ? (
        <div className="rb-step">
          <ReportPhotoField
            preview={photoState.preview}
            status={photoState.status}
            error={photoState.error}
            busy={photoState.busy}
            onPhoto={(file) => void photoState.onPhoto(file)}
          />
        </div>
      ) : null}
      <TapAnswerSteps
        step={step}
        issueType={issueType}
        issueInvalid={issueInvalid}
        noticedWindow={noticedWindow}
        recurs={recurs}
        accident={accident}
        description={description}
        detailsError={detailsError}
        pin={pin}
        locationError={locationError}
        onIssueType={pickIssue}
        onNoticedWindow={pickNoticedWindow}
        onRecurs={pickRecurs}
        onAccident={pickAccident}
        onDescription={setDescription}
        onPin={changePin}
      />
      {step === STEP.review && answers ? (
        <ReportReview
          answers={answers}
          accidentError={detailsError.accident}
          onAccident={pickAccident}
          onEdit={(section) => goTo(EDIT_STEP[section])}
          lang="en"
          locationConfirmed={locationConfirmed}
        />
      ) : null}
      <ReportFormFooter
        issueType={issueType}
        photo={photoState.photo}
        lat={pin?.lat ?? ""}
        lng={pin?.lng ?? ""}
        noticedWindow={noticedWindow}
        recurs={recurs}
        accident={accident}
        description={description}
        locationConfirmed={locationConfirmed ? "true" : "false"}
        formError={formError}
        showBack={step > 1}
        pending={pending}
        busy={busy}
        showRecord={step >= STEP.review}
        ready={ready}
        continueLabel={continueLabel}
        onBack={() => goTo(step - 1)}
        onContinue={onContinue}
      />
    </form>
  );
}
