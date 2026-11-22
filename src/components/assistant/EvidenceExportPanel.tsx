"use client";

import { useState } from "react";
import type { EvidencePackType, ExportFormat } from "@/lib/assistant/export";

type QuickPick = { label: string; id: string };

const QUICK_PICKS: Record<EvidencePackType, QuickPick[]> = {
  road: [
    { label: "Senapati Bapat Marg", id: "RD0065" },
    { label: "Swami Vivekanand Rd", id: "RD0001" },
    { label: "Dr Ambedkar Rd", id: "RD0012" },
  ],
  contractor: [
    { label: "Eagle Infra (CT01)", id: "CT01" },
    { label: "Sahyadri Infra (CT05)", id: "CT05" },
    { label: "RPS Infra (CT08)", id: "CT08" },
  ],
  ward: [
    { label: "Ward F/S (Parel)", id: "F/S" },
    { label: "Ward K/W (Andheri W)", id: "K/W" },
    { label: "Ward G/N (Dadar)", id: "G/N" },
  ],
};

export function EvidenceExportPanel({
  onClose,
  initialType = "road",
  initialId = "",
}: {
  onClose?: () => void;
  initialType?: EvidencePackType;
  initialId?: string;
}) {
  const [type, setType] = useState<EvidencePackType>(initialType);
  const [targetId, setTargetId] = useState(initialId || QUICK_PICKS[initialType][0].id);
  const [format, setFormat] = useState<ExportFormat>("pdf");

  const exportUrl = targetId.trim()
    ? `/api/export/${type}/${encodeURIComponent(targetId.trim().replace(/\//g, "-"))}?format=${format}`
    : "#";

  return (
    <div className="rb-export-panel" role="region" aria-label="Evidence Pack Exporter">
      <div className="rb-export-header">
        <div>
          <h2 className="rb-export-title">Export Audit Evidence Pack</h2>
          <p className="rb-export-sub">
            Download certified vector PDFs or CSV audit dossiers with work orders, DLP status, and flagged bills.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="rb-export-close touch-target"
            onClick={onClose}
            aria-label="Close export panel"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="rb-export-type-select" role="group" aria-label="Evidence Pack Type">
        {(["road", "contractor", "ward"] as EvidencePackType[]).map((t) => (
          <button
            key={t}
            type="button"
            className="touch-target"
            aria-pressed={type === t}
            onClick={() => {
              setType(t);
              setTargetId(QUICK_PICKS[t][0].id);
            }}
          >
            {t === "road" ? "Road Passport" : t === "contractor" ? "Contractor Dossier" : "Ward Dossier"}
          </button>
        ))}
      </div>

      <div className="rb-export-form">
        <label htmlFor="export-id-input" className="rb-export-label">
          {type === "road" ? "Road Segment ID" : type === "contractor" ? "Contractor ID" : "Ward Code"}
        </label>
        <div className="rb-export-input-row">
          <input
            id="export-id-input"
            className="rb-export-input"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder={type === "road" ? "e.g. RD0065" : type === "contractor" ? "e.g. CT05" : "e.g. F/S"}
          />
        </div>

        <div className="rb-export-picks" aria-label="Quick suggestions">
          <span className="rb-export-picks-label">Quick select:</span>
          {QUICK_PICKS[type].map((pick) => (
            <button
              key={pick.id}
              type="button"
              className="rb-export-pick-chip touch-target"
              onClick={() => setTargetId(pick.id)}
            >
              {pick.label}
            </button>
          ))}
        </div>

        <div className="rb-export-format-row" role="group" aria-label="Export format">
          <button
            type="button"
            className="rb-export-format-btn touch-target"
            aria-pressed={format === "pdf"}
            onClick={() => setFormat("pdf")}
          >
            A4 Official PDF
          </button>
          <button
            type="button"
            className="rb-export-format-btn touch-target"
            aria-pressed={format === "csv"}
            onClick={() => setFormat("csv")}
          >
            Audit CSV
          </button>
        </div>

        <div className="rb-export-action-row">
          <a
            href={exportUrl}
            download
            className="ux4g-btn ux4g-btn-primary rb-export-download-btn touch-target"
            aria-disabled={!targetId.trim()}
          >
            Download {format.toUpperCase()} Evidence Pack
          </a>
        </div>
      </div>
    </div>
  );
}
