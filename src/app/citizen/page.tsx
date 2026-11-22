import type { Metadata } from "next";
import Link from "next/link";
import { getRupee } from "@/lib/rupee/index";

export const metadata: Metadata = {
  title: "Citizen Transparency Hub — Rastabaaz",
  description:
    "Report road defects, track public work orders, inspect repair receipts, and verify road conditions across Mumbai.",
};

export default function CitizenHubPage() {
  const { ds } = getRupee();
  const roadCount = ds.roads.length;
  const wardCount = new Set(ds.roads.map((r) => r.ward)).size;

  const actions = [
    {
      title: "Report a Road Problem",
      description: "Photograph a pothole, paver block depression, or open manhole in Mumbai with cryptographic GPS evidence.",
      href: "/report",
      cta: "File Report",
      badge: "Intake",
      highlight: true,
    },
    {
      title: "Track Your Report",
      description: "Lookup your Complaint Reference ID to see downstream work order assignment, SLA timing, and contractor status.",
      href: "/track",
      cta: "Track Complaint",
      badge: "Status",
    },
    {
      title: "Pothole-to-Rupee Receipt",
      description: "Follow any citizen grievance to contractor billing, rate-card audit variances, and physical repair outcomes.",
      href: "/receipt/BMC25-000005",
      cta: "View Sample Receipt",
      badge: "Accountability",
    },
    {
      title: "Verify Road Repairs",
      description: "Tell BMC whether a completed repair in your neighborhood actually held, reopened, or was never executed.",
      href: "/verify",
      cta: "Submit Verification",
      badge: "Crowdsourced",
    },
    {
      title: `Explore ${roadCount} Mumbai Roads`,
      description: "Browse individual Road Reliability Passports with complete expenditure histories, reopening rates, and DLP status.",
      href: "/roads",
      cta: "Open Road Explorer",
      badge: "Passports",
    },
    {
      title: "Ask Rastabaaz AI",
      description: "Ask natural language questions grounded in official municipal audit ledgers, contractor scores, and budgets.",
      href: "/assistant",
      cta: "Start AI Query",
      badge: "AI Grounded",
    },
  ];

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      {/* Editorial Authority Header */}
      <header className="p-6 sm:p-10 rounded-2xl bg-[var(--teal-deep)] text-white space-y-4 shadow-md rb-glass-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--vermilion)]" />
            Public Civic Hub
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--mint-tint)] text-[var(--teal-deep)] border border-transparent">
            Citizen Decision Support
          </span>
        </div>
        <h1 className="ux4g-display-xs-strong text-white font-serif tracking-tight">
          Citizen Transparency Portal
        </h1>
        <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
          Empowering Mumbai residents to follow the rupee, verify physical road repairs, and demand accountable governance across all {wardCount} municipal wards.
        </p>

        {/* Live Authority KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15">
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">{wardCount}</div>
            <div className="text-xs text-white/70">Municipal Wards</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">{roadCount}</div>
            <div className="text-xs text-white/70">Road Passports</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--mint-tint)]">100%</div>
            <div className="text-xs text-white/70">Deterministic Trail</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">Zero PII</div>
            <div className="text-xs text-white/70">Privacy Protected</div>
          </div>
        </div>
      </header>

      {/* 6 High-Trust Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 rb-motion-stagger">
        {actions.map((act) => (
          <div
            key={act.href}
            className={`p-6 rounded-xl border bg-[var(--card)] flex flex-col justify-between rb-interactive-card transition-all ${
              act.highlight
                ? "border-[var(--teal-deep)] shadow-md"
                : "border-[var(--rule)] shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rb-chip rb-chip-neutral text-[0.6875rem]">{act.badge}</span>
                {act.highlight && (
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--vermilion)]" />
                )}
              </div>
              <h2 className="text-base font-bold text-[var(--ink)] mb-2">{act.title}</h2>
              <p className="text-xs text-[var(--mist)] leading-relaxed">
                {act.description}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--rule)]">
              <Link
                href={act.href}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide text-center touch-target inline-flex items-center justify-center transition-colors ${
                  act.highlight
                    ? "bg-[var(--vermilion)] hover:bg-[#d04b39] text-white shadow-sm"
                    : "border border-[var(--rule)] hover:border-[var(--teal-deep)] hover:text-[var(--teal-deep)] text-[var(--ink)] bg-[var(--canvas)]"
                }`}
              >
                {act.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
