import Link from "next/link";
import type { RoadSpendVsNeed } from "@/lib/priority/types";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

type Props = {
  roads: RoadSpendVsNeed[];
};

export function RoadNeedTable({ roads }: Props) {
  // Show top 15 critical need deficit roads
  const deficitRoads = roads
    .filter((r) => r.status === "critical_deficit" || r.status === "moderate_deficit")
    .slice(0, 15);

  if (!deficitRoads.length) return null;

  return (
    <section aria-labelledby="deficit-roads-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="deficit-roads-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            High-Need Deficit Corridors
          </h2>
          <p className="text-xs text-[var(--mist)]">
            Roads with high risk scores (unresolved citizen complaints, flood exposure, accidents) that received zero or minimal repair spend.
          </p>
        </div>
        <span className="text-xs text-[var(--mist)] font-mono">
          Top {deficitRoads.length} Deficit Segments
        </span>
      </div>

      <div className="rb-table-wrap border border-[var(--rule)] rounded bg-[var(--card)]">
        <table className="rb-data-table rb-stack w-full">
          <thead>
            <tr>
              <th scope="col" className="text-center w-12">Rank</th>
              <th scope="col">Road & Ward</th>
              <th scope="col" className="text-center">Need Score</th>
              <th scope="col">Risk Drivers</th>
              <th scope="col" className="text-right">Billed Spend</th>
              <th scope="col" className="text-right">Fair Share Gap</th>
              <th scope="col" className="text-center">Deficit Status</th>
              <th scope="col" className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {deficitRoads.map((r) => {
              const drivers: string[] = [];
              if (r.dimensions.complaintsScore >= 40) drivers.push(`${r.openComplaintsCount} open complaints`);
              if (r.dimensions.reopenScore >= 30) drivers.push("Recurring repair failures");
              if (r.dimensions.floodingScore >= 40) drivers.push("Chronic flood hotspot");
              if (r.dimensions.accidentsScore >= 40) drivers.push("High accident cluster");
              if (r.dimensions.facilityScore >= 40) drivers.push("Ambulance / emergency route");
              if (!drivers.length) drivers.push("Multiple moderate stress factors");

              return (
                <tr key={r.roadId} className="hover:bg-[var(--sheet)] transition-colors">
                  <td className="text-center font-bold text-xs text-[var(--mist)]" data-label="Rank">
                    #{r.needRank}
                  </td>
                  <td data-label="Road">
                    <Link
                      href={`/roads/${r.roadId}`}
                      className="font-semibold text-xs text-[var(--ink)] hover:underline block"
                    >
                      {r.roadName}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--mist)]">
                      <Link href={`/wards/${wardSlug(r.ward)}`} className="text-[var(--enamel)] hover:underline">
                        Ward {r.ward}
                      </Link>
                      <span>·</span>
                      <span>{r.lengthM}m</span>
                      <span>·</span>
                      <span>{r.surface}</span>
                      {r.underDlp ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">(Under DLP)</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-center" data-label="Need Score">
                    <span className="inline-block px-2 py-0.5 rounded font-bold font-mono text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {r.needScore}/100
                    </span>
                  </td>
                  <td className="text-xs text-[var(--mist)]" data-label="Risk Drivers">
                    <ul className="list-disc list-inside space-y-0.5">
                      {drivers.slice(0, 2).map((d, i) => (
                        <li key={i} className="truncate max-w-xs">{d}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--ink)]" data-label="Billed Spend">
                    {r.spentInr > 0 ? formatInrShort(r.spentInr) : <span className="text-rose-600 font-semibold">₹0 Billed</span>}
                  </td>
                  <td className="text-right font-mono text-xs text-rose-600 dark:text-rose-400 font-semibold" data-label="Shortfall">
                    {formatInrShort(Math.abs(r.disparityInr))} deficit
                    <div className="text-[0.625rem] text-[var(--mist)] font-normal">
                      Exp: {formatInrShort(r.expectedSpendInr)}
                    </div>
                  </td>
                  <td className="text-center" data-label="Status">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      {r.status === "critical_deficit" ? "Zero / Severe" : "Underfunded"}
                    </span>
                  </td>
                  <td className="text-right" data-label="Action">
                    <Link
                      href={`/roads/${r.roadId}`}
                      className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs inline-flex items-center"
                    >
                      Passport
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
