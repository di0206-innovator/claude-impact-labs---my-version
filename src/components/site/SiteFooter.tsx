import Link from "next/link";

const COL1_LINKS = [
  { href: "/", label: "Report a road problem" },
  { href: "/map", label: "Map of reports" },
  { href: "/roads", label: "Road passports" },
  { href: "/wards", label: "Ward money trail" },
  { href: "/contractors", label: "Contractors" },
] as const;

const COL2_LINKS = [
  { href: "/overview", label: "City overview" },
  { href: "/queue", label: "Action queue" },
  { href: "/track", label: "Track complaint" },
  { href: "/assistant", label: "Ask AI" },
  { href: "/budget", label: "Budget & Disparity" },
  { href: "/spend-vs-need", label: "Spend vs Need" },
] as const;

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

/**
 * Architectural #064E4B footer with subtle concentric line-art watermark,
 * clean 2-column navigation links, and synthetic provenance notice.
 */
export function SiteFooter() {
  return (
    <footer className="ux4g-footer-wrapper ux4g-footer-dark rb-footer relative overflow-hidden bg-[var(--teal-deep)] text-[#F7F9F8]">
      {/* Concentric geometric line-art watermark on bottom-left */}
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 w-80 h-80 opacity-[0.07] text-white select-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="w-full h-full">
          <circle cx="100" cy="100" r="24" strokeWidth="1" />
          <circle cx="100" cy="100" r="48" strokeWidth="1" />
          <circle cx="100" cy="100" r="72" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="96" strokeWidth="1" />
          <circle cx="100" cy="100" r="120" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx="100" cy="100" r="144" strokeWidth="0.75" />
          <line x1="0" y1="100" x2="200" y2="100" strokeWidth="0.5" />
          <line x1="100" y1="0" x2="100" y2="200" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="ux4g-footer-row shell rb-footer-grid relative z-10 py-10">
        <div className="flex flex-col gap-2">
          <p className="ux4g-heading-xs-strong font-serif text-xl tracking-tight text-white">
            Rastabaaz <span lang="mr" className="text-sm font-sans font-normal opacity-80">रस्ताबाज</span>
          </p>
          <p className="text-xs text-[var(--mint-tint)] opacity-85 max-w-sm">
            Evidence-First Civic Intelligence &amp; Mumbai Monsoon Road Repair Accountability Platform.
          </p>
        </div>

        <nav aria-label="Footer" className="rb-footer-nav my-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
            <ul className="space-y-2.5 list-none p-0 m-0">
              {COL1_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="ux4g-text-link-neutral-inverse ux4g-text-link-neutral-s touch-target text-sm hover:text-[var(--mint-tint)] transition-colors inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {COL2_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="ux4g-text-link-neutral-inverse ux4g-text-link-neutral-s touch-target text-sm hover:text-[var(--mint-tint)] transition-colors inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="border-t border-[rgba(255,255,255,0.12)] pt-6 mt-4">
          <p className="ux4g-body-xs-default rb-footer-note text-xs leading-relaxed text-[rgba(247,249,248,0.75)]">
            Ward codes and road names are real. Every amount, date, contractor and
            work order comes from the synthetic Claude Impact Lab dataset. Reports
            filed here are public and anonymous, and do not reach the BMC
            complaint system.{" "}
            {LEGAL.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="ux4g-text-link-neutral-inverse rb-footer-legal text-[var(--mint-tint)] underline ml-2 touch-target inline-block"
              >
                {link.label}
              </Link>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
