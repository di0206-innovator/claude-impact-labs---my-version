import Link from "next/link";

type Props = {
  currentFilter: string;
  currentZone: string;
  currentSort: string;
};

export function BudgetFilterBar({ currentFilter, currentZone, currentSort }: Props) {
  const filters = [
    { id: "all", label: "All Wards" },
    { id: "deficit", label: "Deficit Only" },
    { id: "surplus", label: "Surplus Only" },
    { id: "equitable", label: "Equitable" },
  ];

  const zones = [
    { id: "all", label: "All Zones" },
    { id: "City", label: "Island City" },
    { id: "Western", label: "Western Suburbs" },
    { id: "Eastern", label: "Eastern Suburbs" },
  ];

  const sorts = [
    { id: "disparity", label: "Most Underfunded" },
    { id: "need", label: "Highest Need" },
    { id: "spend", label: "Highest Spend" },
  ];

  const buildHref = (f: string, z: string, s: string) => {
    const params = new URLSearchParams();
    if (f && f !== "all") params.set("filter", f);
    if (z && z !== "all") params.set("zone", z);
    if (s && s !== "disparity") params.set("sort", s);
    const qs = params.toString();
    return `/budget${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--rule)] bg-[var(--card)] shadow-xs">
      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Status filter">
        {filters.map((f) => {
          const active = currentFilter === f.id;
          return (
            <Link
              key={f.id}
              href={buildHref(f.id, currentZone, currentSort)}
              role="tab"
              aria-selected={active}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-target inline-flex items-center ${
                active
                  ? "bg-[#064E4B] text-white shadow-xs border border-[#064E4B]"
                  : "bg-[var(--sheet)] text-[var(--mist)] hover:text-[var(--ink)] hover:bg-[var(--rule)] border border-[var(--rule)]"
              }`}
            >
              {active ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--vermilion)] mr-1.5 inline-block" />
              ) : null}
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Zone Filter */}
        <div className="flex items-center gap-1 text-xs text-[var(--mist)]">
          <label htmlFor="budget-zone-filter" className="sr-only">Zone</label>
          <div className="flex items-center gap-1">
            {zones.map((z) => {
              const active = currentZone === z.id;
              return (
                <Link
                  key={z.id}
                  href={buildHref(currentFilter, z.id, currentSort)}
                  className={`px-2 py-1 rounded text-[0.6875rem] font-medium transition-colors ${
                    active
                      ? "bg-[#064E4B] text-white font-semibold"
                      : "text-[var(--mist)] hover:text-[var(--ink)]"
                  }`}
                >
                  {z.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="w-[1px] h-4 bg-[var(--rule)] hidden sm:block" aria-hidden="true" />

        {/* Sort selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[var(--mist)] text-[0.6875rem]">Sort:</span>
          {sorts.map((s) => {
            const active = currentSort === s.id;
            return (
              <Link
                key={s.id}
                href={buildHref(currentFilter, currentZone, s.id)}
                className={`px-2 py-1 rounded text-[0.6875rem] font-medium transition-colors ${
                  active
                    ? "bg-[var(--mint-tint)] text-[#064E4B] font-semibold border border-[#064E4B]/20"
                    : "text-[var(--mist)] hover:text-[var(--ink)]"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
