"use client";

import { useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { GovProgress } from "@/components/gov/GovProgress";
import { ReportPhotoField } from "@/components/report/ReportPhotoField";
import { ReportReview } from "@/components/report/ReportReview";
import { SubmittedPanel } from "@/components/report/SubmittedPanel";
import { STEP, STEP_LABELS, TapAnswerSteps } from "@/components/report/TapAnswerSteps";
import type { ReportAnswers, SummarySection } from "@/components/report/ReportSummary";
import { ReportFormFooter } from "@/components/report/ReportFormFooter";
import { stepReady } from "@/components/report/step-ready";
import {
  FORM_ALERT_ID,
  REPORT_MSG,
  focusDetailsError,
  focusId,
  focusSelector,
  type DetailsErrors,
} from "@/components/report/report-form-helpers";
import { useReportPhoto } from "@/components/report/use-report-photo";
import { createReportAction } from "@/lib/actions";
import { enqueueReport } from "@/lib/offline/queue";
import { isInsideCity } from "@/lib/city";
import { ACCIDENT_SEEN, NOTICED_WINDOWS, type AccidentSeen, type IssueType, type NoticedWindow } from "@/lib/types";

/**
 * Photo first: the evidence is already in their hand. Then one question per
 * screen, by tapping through the answers, then Check.
 */
const EDIT_STEP: Record<SummarySection, number> = { problem: STEP.issue, place: STEP.place, answers: STEP.noticed };

export function ReportDraft({
  initialIssueType,
  onAgain,
}: {
  initialIssueType?: IssueType;
  onAgain: () => void;
}) {
  const [step, setStep] = useState(1);
  const [issueType, setIssueType] = useState<IssueType | "">(initialIssueType ?? "");
  const [issueInvalid, setIssueInvalid] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [queuedId, setQueuedId] = useState<string | null>(null);
  const [roadTrail, setRoadTrail] = useState<import("@/lib/rupee/road-trail").RoadTrailSummary | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const photoState = useReportPhoto(() => setFormError(null));
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [noticedWindow, setNoticedWindow] = useState<NoticedWindow | "">("");
  const [recurs, setRecurs] = useState<"" | "true" | "false">("");
  const [accident, setAccident] = useState<AccidentSeen | "">("");
  const [description, setDescription] = useState("");
  const [detailsError, setDetailsError] = useState<DetailsErrors>({});
  const [pending, startTransition] = useTransition();
  const skipHeadingFocus = useRef(true);
  const focusAlert = useRef(false);

  function changePin(next: { lat: number; lng: number } | null) {
    setPin(next);
    setLocationConfirmed(false);
    setLocationError(null);
  }
  function pickIssue(value: IssueType) { setIssueType(value); setIssueInvalid(false); }
  function pickNoticedWindow(value: NoticedWindow) {
    setNoticedWindow(value);
    setDetailsError((current) => ({ ...current, noticedWindow: undefined }));
  }
  function pickRecurs(value: "true" | "false") {
    setRecurs(value);
    setDetailsError((current) => ({ ...current, recurs: undefined }));
  }
  function pickAccident(value: AccidentSeen) {
    setAccident(value);
    setDetailsError((current) => ({ ...current, accident: undefined }));
  }
  function confirmPin() { setLocationConfirmed(true); setLocationError(null); setFormError(null); }
  function goTo(next: number) {
    if (pending) return;
    skipHeadingFocus.current = false; setFormError(null); setStep(next);
  }

  useLayoutEffect(() => {
    if (skipHeadingFocus.current) { skipHeadingFocus.current = false; return; }
    document.getElementById("report-step-heading")?.focus();
  }, [step]);
  useLayoutEffect(() => {
    if (!focusAlert.current || !formError) return;
    focusAlert.current = false;
    focusId(FORM_ALERT_ID);
  }, [formError]);

  /** Each field shows its own error; the form alert is only for errors with no field to sit under. */
  function onContinue() {
    if (pending) return;
    if (step === STEP.photo && !photoState.photo) {
      photoState.setError(REPORT_MSG.photo);
      focusId("photo-take");
      return;
    }
    if (step === STEP.issue && !issueType) {
      setIssueInvalid(true);
      focusSelector('input[name="issueType"][type="radio"]');
      return;
    }
    const missing: DetailsErrors =
      step === STEP.noticed && !(NOTICED_WINDOWS as readonly string[]).includes(noticedWindow)
        ? { noticedWindow: REPORT_MSG.noticedWindow }
        : step === STEP.recurs && recurs !== "true" && recurs !== "false"
          ? { recurs: REPORT_MSG.recurs }
          : step === STEP.accident && !(ACCIDENT_SEEN as readonly string[]).includes(accident)
            ? { accident: REPORT_MSG.accident }
            : {};
    if (Object.keys(missing).length) {
      setDetailsError(missing);
      focusDetailsError(missing);
      return;
    }
    if (step === STEP.place) {
      // The footer button here is "Confirm location": it confirms the pin and moves on.
      if (!pin || !isInsideCity(pin.lat, pin.lng)) {
        setLocationError(REPORT_MSG.location);
        focusId("place-search");
        return;
      }
      confirmPin();
    }
    goTo(step + 1);
  }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (step !== STEP.review) {
      onContinue();
      return;
    }
    setFormError(null);
    if (!accident) {
      setDetailsError((current) => ({ ...current, accident: REPORT_MSG.accident }));
      focusDetailsError({ accident: REPORT_MSG.accident });
      return;
    }
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        try {
          const item = await enqueueReport(data);
          setQueuedId(item.id);
          setQueuedOffline(true);
        } catch {
          setFormError("Could not save report offline. Please try again.");
        }
        return;
      }
      try {
        const result = await createReportAction(data);
        if (result?.ok) {
          setRoadTrail(result.roadTrail ?? null);
          setSubmittedId(result.reportId);
          return;
        }
        if (result) {
          focusAlert.current = true;
          setFormError(result.error);
        }
      } catch {
        try {
          const item = await enqueueReport(data);
          setQueuedId(item.id);
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setQueuedOffline(true);
          } else {
            focusAlert.current = true;
            setFormError("Could not send your report. Your answers are still here, so try again.");
          }
        } catch {
          focusAlert.current = true;
          setFormError("Could not send your report. Your answers are still here, so try again.");
        }
      }
    });
  }
  const busy = pending || photoState.busy;
  const answers: ReportAnswers | null =
    issueType && pin && noticedWindow && (recurs === "true" || recurs === "false")
      ? { issueType, preview: photoState.preview, lat: pin.lat, lng: pin.lng, noticedWindow, recurs, accident, description }
      : null;
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
  const ready = stepReady(step, {
    photo: Boolean(photoState.photo), issueType, noticedWindow, recurs, accident, pin: pin !== null,
  });
  const continueLabel =
    step === STEP.place ? "Confirm location" : step === STEP.note && !description.trim() ? "Skip" : "Continue";
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
