import type { AssistantStructuredResponse } from "@/lib/assistant/types";

/** Record chips only make sense when the answer is about a complaint or a work order. */
function aboutARecord(data: AssistantStructuredResponse): boolean {
  return Boolean(data.linkedIssueReference || data.workOrderReferences.length || data.costInr != null);
}

function detectExportTargets(text: string, data?: AssistantStructuredResponse) {
  const roadMatch = text.match(/\b(RD\d{4})\b/i);
  const roadId = roadMatch ? roadMatch[1].toUpperCase() : null;

  const contractorMatch = text.match(/\b(CT\d{2})\b/i);
  let contractorId = contractorMatch ? contractorMatch[1].toUpperCase() : null;
  if (!contractorId && data?.contractorName) {
    const cMatch = data.contractorName.match(/\b(CT\d{2})\b/i);
    if (cMatch) contractorId = cMatch[1].toUpperCase();
  }

  const wardMatch = text.match(/\bWard\s+([A-Z]\/[A-Z]|[A-Z]\b)/i) || text.match(/\b([A-Z]\/[A-Z])\s+ward\b/i);
  const wardCode = wardMatch ? wardMatch[1].toUpperCase() : null;

  return { roadId, contractorId, wardCode };
}

/**
 * One answer, set as plain text (no bubble): a row of facts about the
 * record, the answer itself, the next step, export actions, and the records it checked.
 */
export function AssistantAnswer({ text, data }: { text: string; data?: AssistantStructuredResponse }) {
  const exports = detectExportTargets(text, data);
  const hasExports = Boolean(exports.roadId || exports.contractorId || exports.wardCode);

  return (
    <article className="rb-chat-answer">
      <p className="rb-chat-who">
        <span className="rb-chat-mark" aria-hidden="true">
          R
        </span>
        Rastabaaz
      </p>

      {data && aboutARecord(data) ? (
        <ul className="rb-chat-facts" aria-label="About this record">
          <li data-tone={data.isOfficialLink ? "good" : "warn"}>
            {data.isOfficialLink ? "Official BMC record" : "Not confirmed by a BMC record"}
          </li>
          {data.complaintStatus ? <li>Status: {data.complaintStatus}</li> : null}
          {data.costInr != null ? <li>Billed ₹{data.costInr.toLocaleString("en-IN")}</li> : null}
          {data.contractorName ? <li>{data.contractorName}</li> : null}
        </ul>
      ) : null}

      <div className="rb-chat-text">{text}</div>

      {hasExports ? (
        <div className="rb-chat-exports" aria-label="Export related evidence pack">
          <span className="rb-chat-exports-title">Export Evidence Dossier:</span>
          {exports.roadId ? (
            <span className="rb-chat-export-group">
              <span className="rb-chat-export-label">{exports.roadId}</span>
              <a href={`/api/export/road/${exports.roadId}?format=pdf`} download className="rb-export-chip touch-target">
                PDF
              </a>
              <a href={`/api/export/road/${exports.roadId}?format=csv`} download className="rb-export-chip touch-target">
                CSV
              </a>
            </span>
          ) : null}
          {exports.contractorId ? (
            <span className="rb-chat-export-group">
              <span className="rb-chat-export-label">{exports.contractorId}</span>
              <a href={`/api/export/contractor/${exports.contractorId}?format=pdf`} download className="rb-export-chip touch-target">
                PDF
              </a>
              <a href={`/api/export/contractor/${exports.contractorId}?format=csv`} download className="rb-export-chip touch-target">
                CSV
              </a>
            </span>
          ) : null}
          {exports.wardCode ? (
            <span className="rb-chat-export-group">
              <span className="rb-chat-export-label">Ward {exports.wardCode}</span>
              <a href={`/api/export/ward/${encodeURIComponent(exports.wardCode.replace(/\//g, "-"))}?format=pdf`} download className="rb-export-chip touch-target">
                PDF
              </a>
              <a href={`/api/export/ward/${encodeURIComponent(exports.wardCode.replace(/\//g, "-"))}?format=csv`} download className="rb-export-chip touch-target">
                CSV
              </a>
            </span>
          ) : null}
        </div>
      ) : null}

      {data?.nextAction ? (
        <div className="rb-chat-next">
          <p className="rb-chat-next-label">What you can do next</p>
          <p>{data.nextAction}</p>
        </div>
      ) : null}

      {data && data.evidenceSources.length > 0 ? (
        <details className="rb-chat-sources">
          <summary>
            Checked {data.evidenceSources.length} {data.evidenceSources.length === 1 ? "record" : "records"}
          </summary>
          <ul>
            {data.evidenceSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
