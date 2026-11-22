"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  AskTabIcon,
  MapTabIcon,
  ReportTabIcon,
  RoadsTabIcon,
  WardsTabIcon,
} from "@/components/site/nav-icons";

const PRIMARY_NAV = [
  { href: "/", label: "Report", Icon: ReportTabIcon },
  { href: "/map", label: "Map", Icon: MapTabIcon },
  { href: "/roads", label: "Roads", Icon: RoadsTabIcon },
  { href: "/wards", label: "Wards", Icon: WardsTabIcon },
  { href: "/assistant", label: "Ask", Icon: AskTabIcon },
] as const;

const MORE_GROUPS = [
  {
    heading: "For Citizens",
    links: [
      { href: "/citizen", label: "Citizen Hub" },
      { href: "/track", label: "Track a Complaint" },
      { href: "/verify", label: "Verify a Repair" },
    ],
  },
  {
    heading: "For BMC & Auditors",
    links: [
      { href: "/overview", label: "City Overview" },
      { href: "/contractors", label: "Contractors" },
      { href: "/queue", label: "Action Queue" },
      { href: "/accountability", label: "Procurement Audit" },
      { href: "/budget", label: "Budget & Disparity" },
      { href: "/spend-vs-need", label: "Spend vs Need" },
    ],
  },
] as const;

const MORE_HREFS = MORE_GROUPS.flatMap((g) => g.links.map((l) => l.href));

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/report" || pathname.startsWith("/report/");
  if (href === "/map" && /^\/(reports|places)\//.test(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * UX4G navbar with 5 primary items and an organized More menu for citizen & BMC tools.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_HREFS.some((href) => isActive(pathname, href));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

  return (
    <header className="rb-header">
      <nav className="ux4g-navbar" aria-label="Site">
        <div className="ux4g-navbar-wrap shell">
          <div className="flex items-center gap-3">
            <Link href="/" className="rb-wordmark touch-target" onClick={() => setMoreOpen(false)}>
              <span className="ux4g-heading-xs-strong">Rastabaaz</span>
              <span lang="mr" className="ux4g-label-m-default ux4g-text-neutral-secondary">
                रस्ताबाज
              </span>
            </Link>
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[var(--held-bg)] text-[var(--held-ink)] border border-[var(--held-border)]">
              <span className="rb-pulse-dot" aria-hidden="true" />
              <span>Civic Ledger 2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ul className="ux4g-navbar-links rb-nav">
              {PRIMARY_NAV.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(pathname, href) ? "page" : undefined}
                    className="ux4g-text-link-neutral-m rb-nav-link touch-target"
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon className="rb-nav-icon" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div ref={menuRef} className="rb-nav-more-wrap">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="rb-more-menu"
                onClick={() => setMoreOpen((open) => !open)}
                className={`ux4g-text-link-neutral-m rb-nav-more-btn touch-target${moreActive ? " is-active" : ""}`}
              >
                <span>More</span>
                <svg
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
              {moreOpen ? (
                <div id="rb-more-menu" className="rb-nav-more-panel" role="region" aria-label="More tools">
                  {MORE_GROUPS.map((group) => (
                    <div key={group.heading} className="rb-nav-more-group">
                      <p className="rb-nav-more-heading">{group.heading}</p>
                      <ul>
                        {group.links.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={isActive(pathname, item.href) ? "page" : undefined}
                              className="rb-nav-more-link touch-target"
                              onClick={() => setMoreOpen(false)}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
      <div className="rb-lane" aria-hidden="true" />
    </header>
  );
}
