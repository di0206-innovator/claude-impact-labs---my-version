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
    <article className="shell rb-page py-6 sm:py-10 space-y-6 rb-motion-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <Link href={`/roads/${pack.road.id}`} className="ux4g-text-link-m touch-target inline-flex items-center gap-1.5 text-xs text-[var(--teal-deep)] font-semibold">
          <span>←</span> Back to Road Passport
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/roads/${pack.road.id}/evidence.json`}
            download={`${pack.road.id}-evidence-pack.json`}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs"
          >
            Export JSON
          </a>
          <a
            href={`/api/roads/${pack.road.id}/evidence.csv`}
            download={`${pack.road.id}-evidence-pack.csv`}
            className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs"
          >
            Export CSV
          </a>
          <PrintButton
            label="Print Dossier"
            className="ux4g-btn ux4g-btn-s ux4g-btn-primary touch-target text-xs font-semibold"
          />
        </div>
      </div>

      {/* Official Forensic Header */}
      <header className="p-6 sm:p-8 rounded-xl border border-[var(--teal-deep)] bg-[var(--card)] shadow-sm space-y-3 rb-glass-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--teal-deep)]" />
            <span className="font-mono text-xs font-bold text-[var(--teal-deep)]">
              BMC Internal Audit & Decision Support — Official Evidence Record
            </span>
          </div>
          <div className="font-mono text-xs text-[var(--mist)]">{pack.metadata.generatedAt}</div>
        </div>
        <h1 className="ux4g-heading-l-strong text-[var(--ink)] font-serif tracking-tight">
          {pack.metadata.dossierTitle}
        </h1>
        <p className="text-xs text-[var(--mist)] leading-relaxed">
          {pack.metadata.privacyDisclaimer}
        </p>
      </header>

      {/* Financial & Repair History Table */}
      <section className="space-y-3">
        <h2 className="ux4g-heading-s-strong text-[var(--ink)] font-serif">
          Financial & Repair History
        </h2>
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
                <tr key={wo.id} className="hover:bg-[var(--sheet)] transition-colors">
                  <td className="font-mono font-bold text-xs">{wo.id}</td>
                  <td className="text-xs font-medium">{wo.contractor}</td>
                  <td className="text-xs text-[var(--mist)]">{wo.method}</td>
                  <td className="text-right font-mono text-xs font-semibold text-[var(--ink)]">
                    {formatInr(wo.costBilledInr)}
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--mist)]">
                    {formatInr(wo.expectedCostInr)}
                  </td>
                  <td className="text-center text-xs">
                    {wo.slaMet === "YES" ? (
                      <span className="rb-chip rb-chip-held text-[0.625rem]">Met</span>
                    ) : (
                      <span className="rb-chip rb-chip-failed text-[0.625rem]">Missed</span>
                    )}
                  </td>
                  <td className="text-center text-xs">
                    {wo.reopenedWithin30d === "YES" ? (
                      <span className="rb-chip rb-chip-failed text-[0.625rem]">Reopened</span>
                    ) : (
                      <span className="rb-chip rb-chip-held text-[0.625rem]">Held</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Citizen Complaints Associated */}
      <section className="space-y-3">
        <h2 className="ux4g-heading-s-strong text-[var(--ink)] font-serif">
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
                <tr key={c.id} className="hover:bg-[var(--sheet)] transition-colors">
                  <td className="font-mono text-xs font-bold">{c.id}</td>
                  <td className="text-xs text-[var(--mist)]">{c.receivedAt}</td>
                  <td className="text-xs">{c.channel}</td>
                  <td className="text-xs font-medium">{c.category}</td>
                  <td className="text-xs">
                    <span className="rb-chip rb-chip-neutral text-[0.625rem]">{c.status}</span>
                  </td>
                  <td className="text-xs font-mono text-[var(--mist)]">{c.evidenceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Notice Box */}
      <section className="p-4 bg-[var(--sheet)] rounded-xl border border-[var(--rule)] space-y-1.5 text-xs">
        <h3 className="font-semibold text-[var(--ink)]">Audit Notice & Limitations</h3>
        <p className="text-[var(--mist)] leading-relaxed">{pack.auditDisclaimer}</p>
      </section>
    </article>
  );
}
