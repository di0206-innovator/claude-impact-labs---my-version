"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ActionQueueItem } from "@/lib/passport/types";
import { formatInr } from "@/lib/rupee/format";
import {
  CATEGORY_LABELS,
  clearTriageOverrides,
  exportTriageCsv,
  loadTriageOverrides,
  saveTriageOverrides,
} from "@/lib/passport/triage";

export type ActionQueueClientListProps = {
  initialItems: ActionQueueItem[];
  scope?: string;
};

export function ActionQueueClientList({ initialItems, scope = "all" }: ActionQueueClientListProps) {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ActionQueueItem["status"]>>({});

  useEffect(() => {
    setStatusOverrides(loadTriageOverrides(scope));
  }, [scope]);

  const decoratedItems = useMemo(() => {
    return initialItems.map((item) => ({
      ...item,
      status: statusOverrides[item.id] ?? item.status,
    }));
  }, [initialItems, statusOverrides]);

  const toggleStatus = (id: string, nextStatus: ActionQueueItem["status"]) => {
    setStatusOverrides((prev) => {
      const updated = { ...prev, [id]: nextStatus };
      saveTriageOverrides(scope, updated);
      return updated;
    });
  };

  const handleReset = () => {
    clearTriageOverrides(scope);
    setStatusOverrides({});
  };

  const handleExport = () => {
    exportTriageCsv(decoratedItems, `action-queue-triage-${scope}.csv`);
  };

  if (decoratedItems.length === 0) {
    return (
      <div className="bg-[var(--card)] rounded-xl border border-dashed border-[var(--rule)] p-8 text-center text-[var(--mist)]">
        No action items matching the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[var(--card)] p-3 rounded-lg border border-[var(--rule)]">
        <span className="text-[var(--mist)]">
          <strong>Interactive Triage Active</strong> (Citywide scope saved to localStorage)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs"
          >
            Export Triage CSV
          </button>
          {Object.keys(statusOverrides).length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="ux4g-btn ux4g-btn-xs text-xs text-[var(--vermilion)] hover:underline"
            >
              Reset Triage
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {decoratedItems.map((item) => {
          const isResolved = item.status === "resolved";
          const isUnderReview = item.status === "under_review";
          const catLabel = CATEGORY_LABELS[item.category] ?? item.category;

          return (
            <div
              key={item.id}
              className={`rb-action-item rounded-xl border p-5 shadow-[var(--card-shadow)] transition-all ${
                item.priority === "critical"
                  ? "border-[var(--failed-border)] bg-[var(--failed-bg)]"
                  : item.priority === "high"
                  ? "border-[var(--flagged-border)] bg-[var(--card)]"
                  : "border-[var(--rule)] bg-[var(--card)]"
              }`}
              data-priority={item.priority}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
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
                  <span className="rb-chip rb-chip-neutral">Ward {item.ward}</span>
                  <span className="rb-chip rb-chip-neutral">{catLabel}</span>
                  <span className="text-xs text-[var(--mist)] font-mono">{item.relatedEntityId}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      isResolved
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : isUnderReview
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-[var(--sheet)] text-[var(--ink)] border-[var(--rule)]"
                    }`}
                  >
                    Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
                <div>
                  <h3 className="ux4g-body-m-strong text-[var(--ink)] text-base">{item.headline}</h3>
                  <div className="text-xs text-[var(--mist)] mt-0.5">
                    Road: <strong>{item.roadName}</strong>
                  </div>
                </div>

                {item.amountAtRiskInr > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-[var(--ink)] font-mono">
                      {formatInr(item.amountAtRiskInr)}
                    </div>
                    <div className="text-[0.625rem] text-[var(--mist)] uppercase tracking-wider font-semibold">
                      Amount at risk
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--ink)] bg-[var(--sheet)] p-3 rounded-lg border border-[var(--rule)] mt-3 leading-relaxed">
                <strong className="text-[var(--ink)]">Recommended Protocol:</strong> {item.recommendedAction}
              </p>

              {/* Interactive Triage Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--rule)] text-xs mt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[var(--mist)] font-medium mr-1">Triage:</span>
                  {!isUnderReview && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(item.id, "under_review")}
                      className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs"
                    >
                      Under Review
                    </button>
                  )}
                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(item.id, "resolved")}
                      className="ux4g-btn ux4g-btn-xs ux4g-btn-primary touch-target text-xs"
                    >
                      Verified & Cleared
                    </button>
                  )}
                  {item.status !== "new" && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(item.id, "new")}
                      className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs"
                    >
                      Reset to New
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[var(--mist)]">{item.evidenceCount} supporting evidence records</span>
                  {item.roadId.startsWith("RD") && (
                    <Link
                      href={`/roads/${item.roadId}`}
                      className="text-[var(--enamel)] font-semibold hover:underline touch-target inline-flex items-center gap-1"
                    >
                      Open Road Passport →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default ActionQueueClientList;
