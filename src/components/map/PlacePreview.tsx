"use client";

import { useEffect, useRef, type RefObject } from "react";
import Link from "next/link";
import { GovBadge } from "@/components/gov/GovBadge";
import { placeTitle } from "@/components/map/place-title";
import { CloseIcon } from "@/components/report/flow-icons";
import { noticedWhen } from "@/lib/noticed-label";
import { ISSUE_TYPE_LABELS, type PlaceSummary } from "@/lib/types";

export function PlacePreview({
  place,
  onClose,
  openerRef,
  yourReportId,
  inline = false,
}: {
  place: PlaceSummary;
  onClose: () => void;
  openerRef?: RefObject<HTMLElement | null>;
  /** Set when the preview was opened from `?report=`. */
  yourReportId?: string;
  /** Drawn inside the results panel instead of floating over the map. */
  inline?: boolean;
}) {
  const latest = place.latestReport;
  const issue = ISSUE_TYPE_LABELS[place.location.issueType];
  const onCloseRef = useRef(onClose);
  const openerBox = useRef(openerRef);
  onCloseRef.current = onClose;
  openerBox.current = openerRef;

  const restoreToOpener = () => {
    openerBox.current?.current?.focus();
    onCloseRef.current();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") restoreToOpener();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="place-preview-title"
      className={
        inline
          ? "ux4g-card ux4g-card-solid ux4g-card-vertical rb-sheet-preview"
          : "ux4g-card ux4g-card-solid ux4g-card-vertical rb-glass-floating rb-motion-fade-in pointer-events-auto absolute inset-x-3 bottom-3 z-10 max-w-sm sm:inset-x-auto sm:right-4 sm:bottom-12"
      }
    >
      <div className="rb-preview-head">
        <div className="min-w-0">
          <h3 id="place-preview-title" className="ux4g-heading-xs-strong">
            {placeTitle(place)}
          </h3>
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
            {place.location.ward} ward
          </p>
        </div>
        <button
          type="button"
          className="rb-icon-btn touch-target"
          aria-label="Close this place preview"
          onClick={restoreToOpener}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="ux4g-card-body">
        <p className="flex items-baseline gap-2">
          <span className="ux4g-heading-l-strong">{place.reportCount}</span>
          <span className="ux4g-text ux4g-text-neutral-secondary">
            {place.reportCount === 1 ? "report" : "reports"}
            {place.recurring ? ", and it keeps coming back" : ""}
          </span>
        </p>

        <p className="mt-3">
          <GovBadge tone="info">{issue}</GovBadge>
        </p>

        {latest ? (
          <p className="ux4g-text mt-3">{noticedWhen(latest)}</p>
        ) : null}

        <p className="rb-preview-actions">
          <Link
            href={
              yourReportId
                ? `/places/${place.location.slug}?report=${yourReportId}`
                : `/places/${place.location.slug}`
            }
            className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target"
            style={{ minHeight: 48 }}
          >
            Open this place
          </Link>
          {yourReportId || latest ? (
            <Link
              href={`/reports/${yourReportId ?? latest?.id}`}
              className="ux4g-text-link ux4g-text-link-m touch-target inline-flex items-center"
              style={{ minHeight: 48 }}
            >
              {yourReportId ? "Your report" : "Latest report"}
            </Link>
          ) : null}
        </p>
      </div>
    </aside>
  );
}
