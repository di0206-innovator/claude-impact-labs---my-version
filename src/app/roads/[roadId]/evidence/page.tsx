import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/passport/PrintButton";
import { passportService } from "@/lib/passport/service";
import { formatInr } from "@/lib/rupee/format";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roadId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const pack = passportService.buildEvidencePack(roadId);
  if (!pack) return { title: "Dossier Not Found" };
  return {
    title: `Audit-Ready Evidence Pack: ${pack.metadata.roadName}`,
    description: `Complete forensic evidence dossier with work orders, rate card variances, and complaints for ${pack.metadata.roadName}.`,
  };
}

export default async function EvidencePackPage({ params }: PageProps) {
  const { roadId } = await params;
  const pack = passportService.buildEvidencePack(roadId);
  if (!pack) notFound();

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <Link href={`/roads/${pack.road.id}`} className="ux4g-text-link-m touch-target inline-flex items-center gap-1">
          Back to Road Passport
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/roads/${pack.road.id}/evidence.json`}
            download={`${pack.road.id}-evidence-pack.json`}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
          >
            Export JSON
          </a>
          <a
            href={`/api/roads/${pack.road.id}/evidence.csv`}
            download={`${pack.road.id}-evidence-pack.csv`}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
          >
            Export CSV
          </a>
          <PrintButton
            label="Print Dossier"
            className="ux4g-btn ux4g-btn-s ux4g-btn-primary touch-target"
          />
        </div>
      </div>

      <header className="p-6 rounded border-2 border-[var(--ink)] bg-[var(--card)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
          <div className="font-mono text-xs text-[var(--mist)]">
            BMC Internal Audit & Decision Support — Official Record
          </div>
          <div className="font-mono text-xs text-[var(--mist)]">{pack.metadata.generatedAt}</div>
        </div>
        <h1 className="ux4g-heading-l-strong text-[var(--ink)]">{pack.metadata.dossierTitle}</h1>
        <p className="text-xs text-[var(--mist)] leading-relaxed">
          {pack.metadata.privacyDisclaimer}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="ux4g-heading-s-strong text-[var(--ink)]">Financial & Repair History</h2>
        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Work Order</th>
                <th scope="col">Contractor</th>
                <th scope="col">Method</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">Benchmark INR</th>
                <th scope="col" className="text-center">SLA Met</th>
                <th scope="col" className="text-center">Reopened 30d</th>
              </tr>
            </thead>
            <tbody>
              {pack.workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td className="font-mono font-bold text-xs">{wo.id}</td>
                  <td className="text-xs">{wo.contractor}</td>
                  <td className="text-xs">{wo.method}</td>
                  <td className="text-right font-mono text-xs">{formatInr(wo.costBilledInr)}</td>
                  <td className="text-right font-mono text-xs text-[var(--mist)]">{formatInr(wo.expectedCostInr)}</td>
                  <td className="text-center text-xs">{wo.slaMet}</td>
                  <td className="text-center text-xs">{wo.reopenedWithin30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="ux4g-heading-s-strong text-[var(--ink)]">
          Citizen Complaints Associated ({pack.complaints.length})
        </h2>
        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Complaint ID</th>
                <th scope="col">Date</th>
                <th scope="col">Channel</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Link Status</th>
              </tr>
            </thead>
            <tbody>
              {pack.complaints.slice(0, 20).map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.id}</td>
                  <td className="text-xs">{c.receivedAt}</td>
                  <td className="text-xs">{c.channel}</td>
                  <td className="text-xs">{c.category}</td>
                  <td className="text-xs">{c.status}</td>
                  <td className="text-xs font-mono">{c.evidenceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="p-4 bg-[var(--sheet)] rounded border border-[var(--rule)] space-y-2 text-xs">
        <h3 className="font-semibold text-[var(--ink)]">Audit Notice & Limitations</h3>
        <p className="text-[var(--mist)] leading-relaxed">{pack.auditDisclaimer}</p>
      </section>
    </article>
  );
}
