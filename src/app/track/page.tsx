import type { Metadata } from "next";
import Link from "next/link";
import { getRupee } from "@/lib/rupee/index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track Your Road Problem Report — Rastabaaz",
  description:
    "Track the real-time status of your road complaint across BMC municipal work orders and contractor billing.",
};

const QUICK_TRACK_SAMPLES = [
  { id: "BMC25-000013", label: "BMC25-000013 (Completed)" },
  { id: "BMC25-000042", label: "BMC25-000042 (Reopened)" },
  { id: "BMC25-000002", label: "BMC25-000002 (Unlinked)" },
] as const;

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function TrackPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const { ds } = getRupee();

  const queryId = id?.trim().toUpperCase();
  const complaint = queryId
    ? ds.complaints.find((c) => c.id.toUpperCase() === queryId)
    : null;

  const linkedWorkOrder = complaint
    ? ds.workOrders.find((w) => w.complaintIds.includes(complaint.id))
    : null;

  return (
    <article className="shell rb-page py-6 sm:py-10 rb-motion-fade-in">
      <div className="rb-split-flow-grid">
        {/* Left Column: Sticky Editorial Intro */}
        <aside className="rb-split-sticky-col space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rb-chip rb-chip-neutral">Municipal Audit Trail</span>
              <span className="rb-chip rb-chip-held">Live Tracking</span>
            </div>
            <h1 className="ux4g-display-xs-strong text-[var(--ink)] font-serif">
              Track a Road Problem
            </h1>
            <p className="ux4g-body-m-default text-[var(--mist)] leading-relaxed">
              Trace your road complaint across Mumbai&apos;s municipal machinery: from grievance intake to contractor work order allocation, rate-card audit, and rupee receipts.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-[var(--rule)] bg-[var(--canvas)] space-y-3">
            <div className="text-xs font-semibold text-[var(--mist)] uppercase tracking-wider">
              Audit Milestones
            </div>
            <div className="rb-step-chain">
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">01 Grievance Intake</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Logged in BMC municipal records with unique ID
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">02 Work Order Linkage</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Matched to contractor tender, repair SLA & DLP warranty
                </div>
              </div>
              <div className="rb-step-node">
                <div className="text-xs font-bold text-[var(--ink)]">03 Public Rupee Receipt</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Forensic billing reconciliation & citizen field check
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--mist)]">Sample Real Records:</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TRACK_SAMPLES.map((s) => (
                <Link
                  key={s.id}
                  href={`/track?id=${s.id}`}
                  className="rb-chip rb-chip-neutral hover:border-[var(--teal-deep)] hover:text-[var(--teal-deep)] transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Hairline Alabaster Card with Form & Result */}
        <section className="space-y-6">
          <div className="p-6 sm:p-8 rounded-xl border border-[var(--rule)] bg-[var(--card)] shadow-sm rb-glass-card space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[var(--ink)]">Complaint Lookup</h2>
              <p className="text-xs text-[var(--mist)]">
                Enter your official BMC complaint reference number below.
              </p>
            </div>

            <form method="get" action="/track" className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="track-id" className="block text-xs font-semibold text-[var(--ink)]">
                  Complaint Reference ID
                </label>
                <input
                  id="track-id"
                  type="text"
                  name="id"
                  defaultValue={id ?? ""}
                  placeholder="e.g. BMC25-000013"
                  className="ux4g-input w-full py-2.5 px-3.5 text-sm rounded-lg border border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink)] font-mono focus:border-[var(--teal-deep)] focus:bg-[var(--card)] transition-colors"
                  required
                />
              </div>

              {/* Single Signal Vermilion CTA */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[var(--vermilion)] hover:bg-[#d04b39] text-white text-sm font-semibold tracking-wide shadow-sm transition-all transform active:scale-[0.99] touch-target flex items-center justify-center gap-2"
              >
                Track Status
              </button>
            </form>

            {queryId && !complaint && (
              <div className="p-4 rounded-lg border border-[var(--failed-border)] bg-[var(--failed-bg)] text-xs text-[var(--failed-ink)] space-y-1">
                <div className="font-bold">Record Not Found</div>
                <p>
                  No municipal complaint record found matching <strong>{queryId}</strong>. Please check your reference code and try again.
                </p>
              </div>
            )}
          </div>

          {complaint && (
            <div className="p-6 sm:p-8 rounded-xl border border-[var(--rule)] bg-[var(--card)] shadow-sm rb-glass-card space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-4">
                <div>
                  <span className="font-mono font-bold text-sm text-[var(--ink)]">{complaint.id}</span>
                  <span className="text-xs text-[var(--mist)] ml-2">Logged: {complaint.receivedAt}</span>
                </div>
                <span className="rb-chip rb-chip-held text-xs font-semibold">
                  Status: {complaint.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded bg-[var(--canvas)] border border-[var(--rule)]">
                  <div className="text-[0.6875rem] text-[var(--mist)]">Category</div>
                  <div className="font-bold text-[var(--ink)] mt-0.5">{complaint.category}</div>
                </div>
                <div className="p-3 rounded bg-[var(--canvas)] border border-[var(--rule)]">
                  <div className="text-[0.6875rem] text-[var(--mist)]">Locality & Ward</div>
                  <div className="font-bold text-[var(--ink)] mt-0.5">{complaint.locality} (Ward {complaint.ward ?? "Unassigned"})</div>
                </div>
                <div className="p-3 rounded bg-[var(--canvas)] border border-[var(--rule)]">
                  <div className="text-[0.6875rem] text-[var(--mist)]">Intake Channel</div>
                  <div className="font-bold text-[var(--ink)] mt-0.5">{complaint.channel}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[var(--sheet)] border border-[var(--rule)] text-xs text-[var(--ink)] leading-relaxed italic">
                &ldquo;{complaint.description}&rdquo;
              </div>

              <div className="pt-3 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  {linkedWorkOrder ? (
                    <span className="text-[var(--held-ink)] font-semibold flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--held)]" />
                      Linked to Work Order {linkedWorkOrder.id} ({linkedWorkOrder.contractorName})
                    </span>
                  ) : (
                    <span className="text-[var(--mist)] flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--mist)]" />
                      No municipal work order assigned yet.
                    </span>
                  )}
                </div>

                <Link
                  href={`/receipt/${complaint.id}`}
                  className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center gap-1.5"
                >
                  View Rupee Receipt
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
