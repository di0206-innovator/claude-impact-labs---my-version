import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Citizen Transparency Hub — Rastabaaz",
  description:
    "Report road defects, track public work orders, inspect repair receipts, and verify road conditions across Mumbai.",
};

export default function CitizenHubPage() {
  const actions = [
    {
      title: "Report a Road Problem",
      description: "Photograph a pothole, paver block depression, or open manhole in Mumbai.",
      href: "/",
      cta: "File Report",
      badge: "Intake",
    },
    {
      title: "Track Your Report",
      description: "Lookup your Complaint ID or reference to see downstream work order status.",
      href: "/track",
      cta: "Track Complaint",
      badge: "Status",
    },
    {
      title: "Pothole-to-Rupee Receipt",
      description: "Follow any complaint all the way to contractor billing, rate card checks, and SLA results.",
      href: "/receipt/BMC25-000005",
      cta: "View Sample Receipt",
      badge: "Accountability",
    },
    {
      title: "Verify Road Repairs",
      description: "Tell BMC whether a completed repair in your neighborhood actually held or failed.",
      href: "/verify",
      cta: "Submit Verification",
      badge: "Crowdsourced",
    },
    {
      title: "Explore 291 Mumbai Roads",
      description: "Browse individual Road Reliability Passports with complete work order histories.",
      href: "/roads",
      cta: "Open Road Explorer",
      badge: "Passports",
    },
    {
      title: "Ask Rastabaaz AI",
      description: "Ask questions grounded in official municipal records, contractors, and costs.",
      href: "/assistant",
      cta: "Start AI Chat",
      badge: "AI Grounded",
    },
  ];

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="rb-chip rb-chip-neutral">Public Civic Hub</span>
          <span className="rb-chip rb-chip-held">Citizen Decision Support</span>
        </div>
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Citizen Transparency Portal</h1>
        <p className="ux4g-body-l-default text-[var(--mist)] rb-measure">
          Empowering Mumbai residents to follow the rupee, verify physical road repairs, and demand accountable governance.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rb-motion-stagger">
        {actions.map((act) => (
          <div
            key={act.href}
            className="ux4g-card ux4g-card-solid p-6 border border-[var(--rule)] flex flex-col justify-between rb-interactive-card"
          >
            <div>
              <span className="rb-chip rb-chip-neutral mb-3 text-[0.625rem]">{act.badge}</span>
              <h2 className="ux4g-body-l-strong text-[var(--ink)] mb-2">{act.title}</h2>
              <p className="ux4g-body-s-default text-[var(--mist)] leading-relaxed">
                {act.description}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--rule)]">
              <Link
                href={act.href}
                className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary w-full touch-target text-center"
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
