import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/passport/PrintButton";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import { formatInr } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

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
    <article className="shell rb-page py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href="/citizen" className="ux4g-text-link-m touch-target inline-flex items-center gap-1">
          Citizen Transparency Portal
        </Link>
        <PrintButton
          label="Print Receipt"
          className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
        />
      </div>

      <div className="rb-receipt-card space-y-6 rb-glass-elevated rb-motion-fade-in">
        <header className="border-b border-[var(--rule)] pb-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-[var(--sheet)] text-[var(--ink)]">
              {receipt.complaintId}
            </span>
            <span className="text-xs text-[var(--mist)]">{receipt.receivedAt}</span>
          </div>
          <h1 className="ux4g-heading-m-strong text-[var(--ink)]">
            Pothole-to-Rupee Public Receipt
          </h1>
          <p className="text-xs text-[var(--mist)]">
            Channel: {receipt.channel} — Locality: {receipt.locality} — Ward {receipt.ward}
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-[var(--mist)]">
            Original Citizen Complaint
          </h2>
          <div className="p-3 bg-[var(--sheet)] rounded border border-[var(--rule)] text-xs text-[var(--ink)] leading-relaxed italic">
            &ldquo;{receipt.description}&rdquo;
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[var(--mist)]">
            Downstream Municipal Work Order Trail
          </h2>

          {receipt.workOrder ? (
            <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono font-bold text-[var(--ink)]">{receipt.workOrder.id}</div>
                  <div className="text-xs text-[var(--mist)]">Contractor: {receipt.workOrder.contractorName}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[var(--ink)]">
                    {formatInr(receipt.workOrder.amountBilledInr)}
                  </div>
                  <div className="text-[0.6875rem] text-[var(--mist)]">Amount Billed</div>
                </div>
              </div>

              <div className="text-xs text-[var(--mist)] space-y-1">
                <div>Method: <strong className="text-[var(--ink)]">{receipt.workOrder.method}</strong> ({receipt.workOrder.areaSqm} sqm)</div>
                <div>Completion: {receipt.workOrder.completedAt} (Turnaround SLA: {receipt.workOrder.slaMet ? "Met" : "Missed"})</div>
                <div>30-Day Durability: {receipt.workOrder.reopened ? <span className="text-[var(--failed-ink)] font-semibold">Reopened within 30 days</span> : <span className="text-[var(--held-ink)] font-semibold">Held without reopening</span>}</div>
              </div>

              {receipt.workOrder.engineerRemark && (
                <div className="text-xs text-[var(--mist)] italic pt-2 border-t border-[var(--rule)]">
                  Engineer remark: &ldquo;{receipt.workOrder.engineerRemark}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded border border-[var(--rule)] bg-[var(--sheet)] text-xs text-[var(--mist)]">
              No downstream municipal work order has been assigned to this complaint in available records.
            </div>
          )}
        </section>

        {receipt.road && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-[var(--mist)]">
              Associated Road Segment
            </h2>
            <div className="flex items-center justify-between p-3 rounded border border-[var(--rule)] bg-[var(--card)]">
              <div>
                <div className="text-xs font-bold text-[var(--ink)]">{receipt.road.name}</div>
                <div className="text-[0.6875rem] text-[var(--mist)] font-mono">{receipt.road.id}, {receipt.road.surface}</div>
              </div>
              <Link
                href={`/roads/${receipt.road.id}`}
                className="text-xs text-[var(--enamel)] font-medium hover:underline touch-target"
              >
                View Road Passport
              </Link>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-[var(--mist)]">
            Missing or Unavailable Records
          </h2>
          <ul className="text-xs space-y-1 text-[var(--mist)] list-disc pl-4">
            {receipt.missingRecords.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </section>

        <footer className="pt-4 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] space-y-1">
          <p><strong>Integrity Disclaimer:</strong> {receipt.provenance.dataIntegrityNotice}</p>
          <p>Engine: {receipt.provenance.algorithmVersion}</p>
        </footer>
      </div>
    </article>
  );
}
