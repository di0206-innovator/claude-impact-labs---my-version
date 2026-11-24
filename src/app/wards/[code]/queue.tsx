"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActionQueueItem } from "@/lib/passport/types";
import { formatInr } from "@/lib/rupee/format";
import {
  clearTriageOverrides,
  exportTriageCsv,
  loadTriageOverrides,
  saveTriageOverrides,
} from "@/lib/passport/triage";
import { QueueItemCard } from "./queue-item-card";

export type WardEngineerQueueProps = {
  wardCode: string;
  wardName: string;
  items: ActionQueueItem[];
  className?: string;
};

export function WardEngineerQueue({ wardCode, wardName, items, className = "" }: WardEngineerQueueProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ActionQueueItem["status"]>>({});

  useEffect(() => {
    setStatusOverrides(loadTriageOverrides(wardCode));
  }, [wardCode]);

  const decoratedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      status: statusOverrides[item.id] ?? item.status,
    }));
  }, [items, statusOverrides]);

  const filteredItems = useMemo(() => {
    return decoratedItems.filter((item) => {
      if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [decoratedItems, priorityFilter, categoryFilter, statusFilter]);

  const criticalCount = decoratedItems.filter((i) => i.priority === "critical").length;
  const highCount = decoratedItems.filter((i) => i.priority === "high").length;
  const totalAtRisk = decoratedItems.reduce((sum, i) => sum + i.amountAtRiskInr, 0);

  const toggleStatus = (id: string, nextStatus: ActionQueueItem["status"]) => {
    setStatusOverrides((prev) => {
      const updated = { ...prev, [id]: nextStatus };
      saveTriageOverrides(wardCode, updated);
      return updated;
    });
  };

  const handleReset = () => {
    clearTriageOverrides(wardCode);
    setStatusOverrides({});
  };

  const handleExport = () => {
    exportTriageCsv(decoratedItems, `ward-${wardCode}-triage.csv`);
  };

  return (
    <section className={`rb-section space-y-6 ${className}`} aria-labelledby="queue-heading">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rb-chip rb-chip-neutral">Ward {wardCode} Operational Triage</span>
          {criticalCount > 0 && (
            <span className="rb-chip rb-chip-failed">{criticalCount} Critical Action{criticalCount === 1 ? "" : "s"}</span>
          )}
        </div>
        <h2 id="queue-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Ward Engineer Action Queue
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          Operational triage queue for {wardCode} ward ({wardName}): verify Defect Liability warranties, investigate rate-card overages, and inspect repeat billing claims.
        </p>
      </header>

      {/* Metrics Row */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rb-motion-stagger">
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Action Items</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{decoratedItems.length}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Critical Priority</dt>
          <dd className="rb-stat-val text-[var(--failed-ink)] rb-tabular-nums">{criticalCount}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">High Priority</dt>
          <dd className="rb-stat-val text-[var(--flagged-ink)] rb-tabular-nums">{highCount}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Amount at Risk</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{formatInr(totalAtRisk)}</dd>
        </div>
      </dl>

      {/* Controls & Filters */}
      <div className="p-3.5 rounded-lg border border-[var(--rule)] bg-[var(--sheet)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-[var(--mist)] mr-1">Priority:</span>
          {(["all", "critical", "high", "medium"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`rb-chip touch-target transition-colors ${
                priorityFilter === p ? (p === "critical" ? "rb-chip-failed" : p === "high" ? "rb-chip-flagged" : "rb-chip-held") : "rb-chip-neutral"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`cat-filter-${wardCode}`} className="font-semibold text-[var(--mist)]">Category:</label>
          <select
            id={`cat-filter-${wardCode}`}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="ux4g-input py-1 px-2 text-xs rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
          >
            <option value="all">All Categories</option>
            <option value="potential_dlp_conflict">DLP Conflicts</option>
            <option value="repeat_work_cluster">Repeat Billings</option>
            <option value="cost_anomaly">Rate Card Variances</option>
            <option value="sla_breach">SLA Delays</option>
          </select>

          <label htmlFor={`status-filter-${wardCode}`} className="font-semibold text-[var(--mist)] ml-2">Status:</label>
          <select
            id={`status-filter-${wardCode}`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ux4g-input py-1 px-2 text-xs rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            type="button"
            onClick={handleExport}
            className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs ml-2"
          >
            Export Triage CSV
          </button>
          {Object.keys(statusOverrides).length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="ux4g-btn ux4g-btn-xs text-xs text-[var(--vermilion)] hover:underline ml-1"
            >
              Reset Triage
            </button>
          )}
        </div>
      </div>

      {/* Queue Items List */}
      <div className="space-y-3" role="feed" aria-label="Action queue items">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center rounded border border-dashed border-[var(--rule)] bg-[var(--card)]">
            <p className="ux4g-body-m-default text-[var(--mist)]">No action items match the active filters.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onSelectToggle={(id) => setSelectedId(selectedId === id ? null : id)}
              onStatusChange={toggleStatus}
            />
          ))
        )}
      </div>

      <footer className="p-3 rounded border border-[var(--rule)] bg-[var(--sheet)] text-xs text-[var(--mist)]">
        <strong>Civic Data Guardrail:</strong> Screening hints are deterministic preliminary audit candidates, NEVER confirmed contractual liability verdicts. Work order amounts represent claims submitted under municipal contracts.
      </footer>
    </section>
  );
}
export default WardEngineerQueue;
