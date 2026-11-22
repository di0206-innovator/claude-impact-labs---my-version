import type { Metadata } from "next";
import Link from "next/link";

import { RoadExplorerFilterBar } from "@/components/passport/RoadExplorerFilterBar";
import { getRoadExplorerStats, listRoadSummaries } from "@/lib/passport/roads";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { getRupee } from "@/lib/rupee/index";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Road Explorer — 291 Mumbai Roads & Reliability Passports",
  description:
    "Explore all 291 road segments in Mumbai with complete work order histories, billed amounts, reopening rates, and audit flags.",
};

type PageProps = {
  searchParams: Promise<{
    ward?: string;
    sort?: "billed_desc" | "orders_desc" | "reopen_desc" | "name_asc";
    underDlp?: string;
    hasFlags?: string;
    q?: string;
  }>;
};

export default async function RoadExplorerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { ds } = getRupee();
  const stats = getRoadExplorerStats();

  const roads = listRoadSummaries({
    ward: params.ward,
    sortBy: params.sort,
    underDlp: params.underDlp === "true" ? true : undefined,
    hasFlags: params.hasFlags === "true" ? true : undefined,
    query: params.q,
  });

  const allWards = Array.from(new Set(ds.roads.map((r) => r.ward))).sort();

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-6 rb-motion-fade-in">
      <header className="space-y-2">
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Road Explorer & Reliability Passports</h1>
        <p className="ux4g-body-l-default text-[var(--mist)] rb-measure">
          Every road segment in Mumbai with traceable citizen complaints, billed repair amounts, 30-day durability rates, and audit flags.
        </p>
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rb-motion-stagger">
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Total Roads Tracked</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{stats.totalRoads}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Total Amount Billed</dt>
          <dd className="rb-stat-val text-[var(--ink)] rb-tabular-nums">{formatInrShort(stats.totalBilledInr)}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Flagged for Review</dt>
          <dd className="rb-stat-val text-[var(--flagged-ink)] rb-tabular-nums">{stats.flaggedRoadsCount}</dd>
        </div>
        <div className="rb-stat-card rb-interactive-card">
          <dt className="rb-stat-label">Under Active DLP</dt>
          <dd className="rb-stat-val text-[var(--held-ink)] rb-tabular-nums">{stats.dlpRoadsCount}</dd>
        </div>
      </dl>

      <form method="get" action="/roads" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search road name or ID (e.g. Swami Vivekananda, RD0001)..."
          className="ux4g-input flex-1 min-w-[16rem] py-2 px-3 text-sm rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
        />
        <select
          name="ward"
          defaultValue={params.ward ?? ""}
          className="ux4g-select py-2 px-3 text-sm rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
        >
          <option value="">All Wards</option>
          {allWards.map((w) => (
            <option key={w} value={w}>Ward {w}</option>
          ))}
        </select>
        <button type="submit" className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target">
          Search
        </button>
      </form>

      <RoadExplorerFilterBar
        currentWard={params.ward}
        currentSort={params.sort}
        underDlp={params.underDlp}
        hasFlags={params.hasFlags}
        wards={allWards}
      />

      <section aria-labelledby="roads-table-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="roads-table-heading" className="text-sm font-semibold text-[var(--mist)]">
            Showing {roads.length} road segment{roads.length === 1 ? "" : "s"}
          </h2>
        </div>

        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Road Name</th>
                <th scope="col">Ward</th>
                <th scope="col">Classification</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">Orders</th>
                <th scope="col" className="text-right">Reopen %</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {roads.map((road) => (
                <tr key={road.id} className="hover:bg-[var(--sheet)] transition-colors">
                  <td>
                    <div className="font-semibold text-[var(--ink)]">{road.name}</div>
                    <div className="text-xs text-[var(--mist)] font-mono">{road.id}, {road.surface}</div>
                  </td>
                  <td>
                    <Link href={`/wards/${wardSlug(road.ward)}`} className="text-xs font-semibold text-[var(--enamel)] hover:underline">
                      Ward {road.ward}
                    </Link>
                  </td>
                  <td className="text-xs text-[var(--mist)]">{road.roadType}</td>
                  <td className="text-right font-mono text-xs font-semibold text-[var(--ink)]">
                    {formatInr(road.totalBilledInr)}
                  </td>
                  <td className="text-right text-xs text-[var(--mist)]">{road.orderCount}</td>
                  <td className="text-right text-xs">
                    <span className={road.reopenRate >= 0.25 ? "text-[var(--failed-ink)] font-bold" : "text-[var(--ink)]"}>
                      {Math.round(road.reopenRate * 100)}%
                    </span>
                  </td>
                  <td>
                    {road.status === "flagged" ? (
                      <span className="rb-chip rb-chip-flagged text-[0.625rem]">Flagged</span>
                    ) : road.status === "high_risk" ? (
                      <span className="rb-chip rb-chip-failed text-[0.625rem]">High Risk</span>
                    ) : road.status === "under_review" ? (
                      <span className="rb-chip rb-chip-neutral text-[0.625rem]">Review</span>
                    ) : (
                      <span className="rb-chip rb-chip-held text-[0.625rem]">Held</span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/roads/${road.id}`}
                      className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center"
                    >
                      View Passport
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
