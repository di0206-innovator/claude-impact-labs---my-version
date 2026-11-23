"use client";

import { useState } from "react";

import { formatInr } from "@/lib/rupee/format";
import type { AuditFlag, NextRupeeItem } from "@/lib/rupee/types";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";

function buildAuditCsv(flags: AuditFlag[]): string {
  const header = [
    "work_order_id",
    "ward",
    "road_id",
    "road_name",
    "contractor_id",
    "contractor_name",
    "flag_kind",
    "completed_at",
    "cost_inr",
    "amount_at_risk_inr",
    "reason",
    "evidence",
  ];
  const rows = flags.map((f) =>
    [
      f.workOrderId,
      f.ward,
      f.roadId,
      f.roadName,
      f.contractorId,
      f.contractorName,
      f.kind,
      f.completedAt,
      f.costInr,
      f.amountAtRiskInr,
      f.reason,
      f.evidence.join("|"),
    ]
      .map(sanitizeCsvCell)
      .join(","),
  );
  return [header.map(sanitizeCsvCell).join(","), ...rows].join("\n");
}

function buildOfficerMemo(
  wardCode: string,
  wardName: string,
  flags: AuditFlag[],
  next: NextRupeeItem[],
): string {
  const atRisk = flags.reduce((sum, f) => sum + f.amountAtRiskInr, 0);
  const dlpFlags = flags.filter((f) => f.kind === "paid_under_dlp");
  const topLines = flags
    .slice(0, 5)
    .map(
      (f, i) =>
        `${i + 1}. ${f.workOrderId} (${f.roadName}, ${f.contractorName}) — [${f.kind}] ${formatInr(f.amountAtRiskInr)}: ${f.reason}`,
    );
  const dlpNext = next.filter((n) => n.underDlp);
  return [
    `BMC WARD OFFICE AUDIT & DLP ACTION BRIEF — ${wardCode} (${wardName})`,
    `Flagged work orders: ${flags.length} | Total to explain: ${formatInr(atRisk)} | DLP recovery items: ${dlpFlags.length}`,
    "",
    "1. Bills Requiring Contractor Explanation / Recovery:",
    ...(topLines.length ? topLines : ["None flagged in this ward."]),
    "",
    "2. Priority Roads Under Active DLP (Serve Zero-Cost Rectification Notice):",
    ...(dlpNext.length
      ? dlpNext.map((n) => `- ${n.roadName} (${n.roadId}): ${n.reasons[0] ?? "active defect"}`)
      : ["- No top-priority roads currently under DLP."]),
    "",
    "Note: Generated from Rastabaaz (synthetic Claude Impact Lab dataset). Flags are questions for verification, not proof of wrongdoing.",
  ].join("\n");
}

/** One-click BMC Ward Officer exports: Audit Register CSV and copyable DLP/Show-Cause Memo. */
export function OfficerActions({
  wardCode,
  wardName,
  flags,
  next,
}: {
  wardCode: string;
  wardName: string;
  flags: AuditFlag[];
  next: NextRupeeItem[];
}) {
  const [copied, setCopied] = useState(false);

  function downloadCsv() {
    const blob = new Blob([buildAuditCsv(flags)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rastabaaz-${wardCode.toLowerCase().replace("/", "-")}-audit.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyMemo() {
    const memo = buildOfficerMemo(wardCode, wardName, flags, next);
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={downloadCsv}
        disabled={flags.length === 0}
        className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target"
      >
        Download the {flags.length} flagged bills (CSV)
      </button>
      <button
        type="button"
        onClick={() => void copyMemo()}
        className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target"
      >
        {copied ? "Memo copied" : "Copy a memo for the ward office"}
      </button>
    </div>
  );
}
