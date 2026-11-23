import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import type { ActionQueueCategory, ActionQueueItem } from "./types";

export const CATEGORY_LABELS: Record<ActionQueueCategory, string> = {
  potential_dlp_conflict: "DLP Conflict",
  repeat_work_cluster: "Repeat Billing",
  cost_anomaly: "Rate Card Variance",
  sla_breach: "SLA Delay",
  high_defect_recurrence: "High Defect Recurrence",
  reopened_repair: "Chronic Reopening",
  unlinked_complaint_backlog: "Unlinked Backlog",
};

export const TRIAGE_STORAGE_PREFIX = "rastabaaz:queue-triage-v1";

/**
 * Returns the standardized localStorage key for ward or citywide queue triage.
 * Scope is either a ward code (e.g. "A", "K/W") or "all" for citywide queue.
 */
export function getTriageStorageKey(scope: string): string {
  const cleanScope = scope.trim();
  return `${TRIAGE_STORAGE_PREFIX}:${cleanScope || "all"}`;
}

/**
 * Loads stored triage status overrides from localStorage safely.
 * Returns an empty object on SSR or JSON parsing failures.
 */
export function loadTriageOverrides(scope: string): Record<string, ActionQueueItem["status"]> {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(getTriageStorageKey(scope));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, ActionQueueItem["status"]>;
  } catch {
    return {};
  }
}

/**
 * Persists triage status overrides to localStorage.
 */
export function saveTriageOverrides(
  scope: string,
  overrides: Record<string, ActionQueueItem["status"]>,
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const key = getTriageStorageKey(scope);
    window.localStorage.setItem(key, JSON.stringify(overrides));
  } catch {
    // Graceful handling for quota exceeded or storage disabled
  }
}

/**
 * Clears triage overrides from localStorage for the given scope.
 */
export function clearTriageOverrides(scope: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(getTriageStorageKey(scope));
  } catch {
    // Ignore storage deletion errors
  }
}

/**
 * Generates CSV content from triaged action queue items with formula injection sanitization.
 */
export function generateTriageCsv(items: ActionQueueItem[]): string {
  const headers = [
    "Task ID",
    "Priority",
    "Category",
    "Status",
    "Headline",
    "Road Corridor",
    "Ward",
    "Related Entity ID",
    "Amount at Risk (INR)",
    "Recommended Protocol",
    "Screening Reason",
  ];

  const rows = items.map((item) => [
    sanitizeCsvCell(item.id),
    sanitizeCsvCell(item.priority),
    sanitizeCsvCell(item.category),
    sanitizeCsvCell(item.status),
    sanitizeCsvCell(item.headline),
    sanitizeCsvCell(item.roadName),
    sanitizeCsvCell(item.ward),
    sanitizeCsvCell(item.relatedEntityId),
    sanitizeCsvCell(item.amountAtRiskInr),
    sanitizeCsvCell(item.recommendedAction),
    sanitizeCsvCell(item.reason),
  ]);

  return [
    headers.map(sanitizeCsvCell).join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
}

/**
 * Triggers a browser download of the triage log as a sanitized CSV file.
 */
export function exportTriageCsv(items: ActionQueueItem[], filename?: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const csvText = generateTriageCsv(items);
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `ward-triage-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
