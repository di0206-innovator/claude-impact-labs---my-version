import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/passport/PrintButton";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import { formatInr } from "@/lib/rupee/format";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const receipt = getPotholeReceipt(id);
  if (!receipt) return { title: "Receipt Not Found" };
  return {
    title: `Pothole-to-Rupee Receipt #${receipt.complaintId}`,
    description: `Citizen receipt tracking complaint #${receipt.complaintId} to municipal work orders, contractor billing, and repair outcomes.`,
  };
}

export default async function PotholeReceiptPage({ params }: PageProps) {
  const { id } = await params;
  const receipt = getPotholeReceipt(id);
  if (!receipt) notFound();

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-6 rb-motion-fade-in">
      <div className="flex items-center justify-between no-print max-w-[46rem] mx-auto">
        <Link href="/citizen" className="ux4g-text-link-m touch-target inline-flex items-center gap-1.5 text-xs text-[var(--teal-deep)] font-semibold">
          <span>←</span> Back to Citizen Portal
        </Link>
        <PrintButton
          label="Print Receipt"
          className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
        />
      </div>

      <div className="rb-receipt-card space-y-6 rb-glass-card">
        {/* Receipt Authority Header */}
        <header className="border-b border-[var(--rule)] pb-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-[var(--sheet)] text-[var(--ink)] border border-[var(--rule)]">
                {receipt.complaintId}
              </span>
              <span className="rb-receipt-badge">
                MUNICIPAL AUDIT TRAIL
              </span>
            </div>
            <span className="text-xs text-[var(--mist)] font-mono">{receipt.receivedAt}</span>
          </div>

          <h1 className="ux4g-heading-m-strong text-[var(--ink)] font-serif tracking-tight">
            Pothole-to-Rupee Public Receipt
          </h1>
          <p className="text-xs text-[var(--mist)]">
            Channel: <strong className="text-[var(--ink)]">{receipt.channel}</strong> — Locality: <strong className="text-[var(--ink)]">{receipt.locality}</strong> — Ward <strong className="text-[var(--ink)]">{receipt.ward}</strong>
          </p>
          {receipt.evidenceHash ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[0.6875rem] text-[var(--mist)] uppercase tracking-wider font-semibold">
                Evidence SHA-256:
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-[var(--sheet)] text-[var(--ink)] border border-[var(--rule)] break-all select-all">
                {receipt.evidenceHash}
              </span>
            </div>
          ) : null}
        </header>

        {/* Original Citizen Complaint */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
              Original Citizen Complaint
            </h2>
            <span className="text-[0.6875rem] text-[var(--mist)] font-mono">Category: {receipt.category}</span>
          </div>
          <div className="p-4 bg-[var(--canvas)] rounded-lg border border-[var(--rule)] text-xs text-[var(--ink)] leading-relaxed italic">
            &ldquo;{receipt.description}&rdquo;
          </div>
        </section>

        {/* Downstream Municipal Work Order Trail */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
            Downstream Municipal Work Order Trail
          </h2>

          {receipt.workOrder ? (
            <div className="p-5 rounded-lg border border-[var(--rule)] bg-[var(--card)] space-y-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--rule)] pb-3">
                <div>
                  <div className="text-xs font-mono font-bold text-[var(--ink)]">{receipt.workOrder.id}</div>
                  <div className="text-xs text-[var(--mist)] mt-0.5">Contractor: <strong className="text-[var(--ink)]">{receipt.workOrder.contractorName}</strong></div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-[var(--ink)]">
                    {formatInr(receipt.workOrder.amountBilledInr)}
                  </div>
                  <div className="text-[0.6875rem] text-[var(--mist)]">Amount Billed</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-[var(--canvas)] border border-[var(--rule)] space-y-0.5">
                  <div className="text-[0.6875rem] text-[var(--mist)]">Repair Method & Area</div>
                  <div className="font-semibold text-[var(--ink)]">{receipt.workOrder.method} ({receipt.workOrder.areaSqm} sqm)</div>
                </div>
                <div className="p-3 rounded bg-[var(--canvas)] border border-[var(--rule)] space-y-0.5">
                  <div className="text-[0.6875rem] text-[var(--mist)]">Completion & SLA</div>
                  <div className="font-semibold text-[var(--ink)]">
                    {receipt.workOrder.completedAt} — SLA {receipt.workOrder.slaMet ? <span className="text-[var(--held-ink)] font-bold">Met</span> : <span className="text-[var(--failed-ink)] font-bold">Missed</span>}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded bg-[var(--sheet)] border border-[var(--rule)] text-xs flex items-center justify-between">
                <span className="text-[var(--mist)]">30-Day Physical Durability:</span>
                {receipt.workOrder.reopened ? (
                  <span className="text-[var(--failed-ink)] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--failed)]" />
                    Reopened within 30 days
                  </span>
                ) : (
                  <span className="text-[var(--held-ink)] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--held)]" />
                    Held without reopening
                  </span>
                )}
              </div>

              {receipt.workOrder.engineerRemark && (
                <div className="text-xs text-[var(--mist)] italic pt-2 border-t border-[var(--rule)]">
                  Engineer remark: &ldquo;{receipt.workOrder.engineerRemark}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-[var(--rule)] bg-[var(--canvas)] text-xs text-[var(--mist)]">
              No downstream municipal work order has been assigned to this complaint in available records.
            </div>
          )}
        </section>

        {/* Associated Road Segment */}
        {receipt.road && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
              Associated Road Segment
            </h2>
            <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--rule)] bg-[var(--canvas)]">
              <div>
                <div className="text-xs font-bold text-[var(--ink)]">{receipt.road.name}</div>
                <div className="text-[0.6875rem] text-[var(--mist)] font-mono">{receipt.road.id} — Surface: {receipt.road.surface}</div>
              </div>
              <Link
                href={`/roads/${receipt.road.id}`}
                className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center gap-1"
              >
                View Road Passport
              </Link>
            </div>
          </section>
        )}

        {/* Missing or Unavailable Records */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
            Forensic Integrity Checklist
          </h2>
          <ul className="text-xs space-y-1.5 text-[var(--mist)] list-disc pl-4">
            {receipt.missingRecords.map((m, idx) => (
              <li key={idx} className="leading-relaxed">{m}</li>
            ))}
          </ul>
        </section>

        {/* Provenance Footer */}
        <footer className="pt-4 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] space-y-1">
          <p><strong>Integrity Disclaimer:</strong> {receipt.provenance.dataIntegrityNotice}</p>
          <p className="font-mono">Engine: {receipt.provenance.algorithmVersion}</p>
        </footer>
      </div>
    </article>
  );
}
