import { useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react";
import type { ReportAnswers } from "@/components/report/ReportSummary";
import { STEP } from "@/components/report/TapAnswerSteps";
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
import { isInsideCity } from "@/lib/city";
import { enqueueReport } from "@/lib/offline/queue";
import {
  ACCIDENT_SEEN,
  NOTICED_WINDOWS,
  type AccidentSeen,
  type IssueType,
  type NoticedWindow,
} from "@/lib/types";

export function useReportDraftState(initialIssueType?: IssueType) {
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
  function pickIssue(value: IssueType) {
    setIssueType(value);
    setIssueInvalid(false);
  }
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
  function confirmPin() {
    setLocationConfirmed(true);
    setLocationError(null);
    setFormError(null);
  }
  function goTo(next: number) {
    if (pending) return;
    skipHeadingFocus.current = false;
    setFormError(null);
    setStep(next);
  }

  useLayoutEffect(() => {
    if (skipHeadingFocus.current) {
      skipHeadingFocus.current = false;
      return;
    }
    document.getElementById("report-step-heading")?.focus();
  }, [step]);

  useLayoutEffect(() => {
    if (!focusAlert.current || !formError) return;
    focusAlert.current = false;
    focusId(FORM_ALERT_ID);
  }, [formError]);

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

  const ready = stepReady(step, {
    photo: Boolean(photoState.photo),
    issueType,
    noticedWindow,
    recurs,
    accident,
    pin: pin !== null,
  });

  const continueLabel =
    step === STEP.place ? "Confirm location" : step === STEP.note && !description.trim() ? "Skip" : "Continue";

  return {
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
  };
}
