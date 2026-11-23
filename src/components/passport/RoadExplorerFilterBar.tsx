import Link from "next/link";

type FilterBarProps = {
  currentWard?: string;
  currentSort?: string;
  underDlp?: string;
  hasFlags?: string;
  wards: string[];
};

export function RoadExplorerFilterBar({
  currentWard,
  currentSort = "billed_desc",
  underDlp,
  hasFlags,
  wards,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-[var(--mist)] mr-1">Sort:</span>
        <Link
          href={`/roads?sort=billed_desc${currentWard ? `&ward=${currentWard}` : ""}`}
          className={`rb-chip touch-target ${currentSort === "billed_desc" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          Highest Billed
        </Link>
        <Link
          href={`/roads?sort=reopen_desc${currentWard ? `&ward=${currentWard}` : ""}`}
          className={`rb-chip touch-target ${currentSort === "reopen_desc" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          Highest Reopening %
        </Link>
        <Link
          href={`/roads?sort=orders_desc${currentWard ? `&ward=${currentWard}` : ""}`}
          className={`rb-chip touch-target ${currentSort === "orders_desc" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          Most Orders
        </Link>
        <Link
          href={`/roads?sort=name_asc${currentWard ? `&ward=${currentWard}` : ""}`}
          className={`rb-chip touch-target ${currentSort === "name_asc" ? "rb-chip-held" : "rb-chip-neutral"}`}
        >
          A–Z
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs sm:ml-auto w-full sm:w-auto pt-1 sm:pt-0">
        <span className="font-semibold text-[var(--mist)] mr-1">Filter:</span>
        <Link
          href={`/roads?hasFlags=true${currentWard ? `&ward=${currentWard}` : ""}`}
          className={`rb-chip touch-target ${hasFlags === "true" ? "rb-chip-flagged" : "rb-chip-neutral"}`}
        >
          Audit Flagged
        </Link>
        <Link
          href={`/roads?underDlp=true${currentWard ? `&ward=${currentWard}` : ""}`}
          className={`rb-chip touch-target ${underDlp === "true" ? "rb-chip-failed" : "rb-chip-neutral"}`}
        >
          Under DLP
        </Link>
        {(currentWard || underDlp || hasFlags || currentSort !== "billed_desc") && (
          <Link href="/roads" className="text-xs text-[var(--enamel)] hover:underline ml-2 touch-target">
            Reset Filters
          </Link>
        )}
      </div>
    </div>
  );
}
