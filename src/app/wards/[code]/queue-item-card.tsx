"use client";

import type { ActionQueueItem } from "@/lib/passport/types";
import { CATEGORY_LABELS } from "@/lib/passport/triage";
import { formatInr } from "@/lib/rupee/format";

export type QueueItemCardProps = {
  item: ActionQueueItem;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  onStatusChange: (id: string, nextStatus: ActionQueueItem["status"]) => void;
};

export function QueueItemCard({
  item,
  isSelected,
  onSelectToggle,
  onStatusChange,
}: QueueItemCardProps) {
  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <article
      data-priority={item.priority}
      className={`rb-action-item rounded-lg border p-4 transition-all ${
        item.priority === "critical"
          ? "border-[var(--failed-border)] bg-[var(--failed-bg)] shadow-[0_2px_8px_rgba(200,30,30,0.06)]"
          : item.priority === "high"
          ? "border-[var(--flagged-border)] bg-[var(--card)]"
          : "border-[var(--rule)] bg-[var(--card)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rb-chip ${
                item.priority === "critical"
                  ? "rb-chip-failed"
                  : item.priority === "high"
                  ? "rb-chip-flagged"
                  : "rb-chip-neutral"
              }`}
            >
              {item.priority.toUpperCase()}
            </span>
            {item.category === "potential_dlp_conflict" ? (
              <span className="rb-dlp-flag">DLP Warranty Conflict</span>
            ) : (
              <span className="rb-chip rb-chip-neutral">{categoryLabel}</span>
            )}
            <span
              className={`rb-chip ${
                item.status === "resolved"
                  ? "rb-chip-held"
                  : item.status === "under_review"
                  ? "rb-chip-flagged"
                  : "rb-chip-neutral"
              }`}
            >
              {item.status === "under_review"
                ? "Under Review"
                : item.status === "resolved"
                ? "Resolved"
                : "New"}
            </span>
          </div>
          <h3 className="ux4g-heading-xs-strong text-[var(--ink)] pt-1">
            {item.headline}
          </h3>
          <p className="ux4g-body-s-default text-[var(--mist)]">
            Road corridor: <strong>{item.roadName}</strong> · Entity: <code>{item.relatedEntityId}</code>
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-xs text-[var(--mist)] uppercase tracking-wider font-semibold">
            Billed at Risk
          </span>
          <span className="text-base font-bold text-[var(--ink)] rb-tabular-nums">
            {formatInr(item.amountAtRiskInr)}
          </span>
          <button
            type="button"
            onClick={() => onSelectToggle(item.id)}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary mt-2 text-xs touch-target"
            aria-expanded={isSelected}
          >
            {isSelected ? "Hide Details" : "Triage Details"}
          </button>
        </div>
      </div>

      {/* Expanded Triage Panel */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-[var(--rule)] space-y-3 bg-[var(--sheet)] -mx-4 -mb-4 p-4 rounded-b-lg">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Audit Screening Finding
            </h4>
            <p className="ux4g-body-s-default text-[var(--ink)]">{item.reason}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Recommended Engineer Protocol
            </h4>
            <p className="ux4g-body-s-default text-[var(--mist)] font-medium">
              {item.recommendedAction}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--rule)]">
            <span className="text-xs font-semibold text-[var(--mist)] mr-1">Triage Action:</span>
            {item.status !== "under_review" && (
              <button
                type="button"
                onClick={() => onStatusChange(item.id, "under_review")}
                className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary text-xs touch-target"
              >
                Mark Under Review
              </button>
            )}
            {item.status !== "resolved" && (
              <button
                type="button"
                onClick={() => onStatusChange(item.id, "resolved")}
                className="ux4g-btn ux4g-btn-s ux4g-btn-primary text-xs touch-target"
              >
                Mark Verified & Cleared
              </button>
            )}
            {item.status !== "new" && (
              <button
                type="button"
                onClick={() => onStatusChange(item.id, "new")}
                className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary text-xs touch-target"
              >
                Reset to New
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
