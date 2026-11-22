import Link from "next/link";
import type { WardSpendVsNeed } from "@/lib/priority/types";
import { wardSlug } from "@/lib/rupee/slug";

type Props = {
  wards: WardSpendVsNeed[];
};

type QuadrantDef = {
  id: string;
  title: string;
  rule: string;
  desc: string;
  dot: string;
  border: string;
  badge: string;
  chip: string;
  ratio: string;
  wards: WardSpendVsNeed[];
};

export function WardQuadrantMatrix({ wards }: Props) {
  const quadrants: QuadrantDef[] = [
    {
      id: "critical",
      title: "Quadrant I: Critical Deficit",
      rule: "Spend < 0.75x Need",
      desc: "High citizen complaint density, yet received disproportionately low road repair spend.",
      dot: "bg-rose-600 animate-pulse",
      border: "border-rose-300 dark:border-rose-900",
      badge: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200",
      chip: "bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border-rose-200",
      ratio: "text-rose-600",
      wards: wards.filter((w) => w.status === "critical_deficit"),
    },
    {
      id: "moderate",
      title: "Quadrant II: Moderate Deficit",
      rule: "0.75x–0.90x",
      desc: "Elevated road distress indicators with cumulative funding falling below equitable share.",
      dot: "bg-amber-500",
      border: "border-amber-300 dark:border-amber-900",
      badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200",
      chip: "bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200 border-amber-200",
      ratio: "text-amber-600",
      wards: wards.filter((w) => w.status === "moderate_deficit"),
    },
    {
      id: "equitable",
      title: "Quadrant III: Equitable Alignment",
      rule: "0.90x–1.15x",
      desc: "Balanced allocation posture where billed expenditure closely mirrors empirical stress.",
      dot: "bg-emerald-600",
      border: "border-emerald-300 dark:border-emerald-900",
      badge: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200",
      chip: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200",
      ratio: "text-emerald-600",
      wards: wards.filter((w) => w.status === "equitable"),
    },
    {
      id: "surplus",
      title: "Quadrant IV: Surplus Allocation",
      rule: "Spend > 1.15x Need",
      desc: "Wards receiving expenditure share significantly higher than recorded complaint volume.",
      dot: "bg-blue-600",
      border: "border-blue-300 dark:border-blue-900",
      badge: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200",
      chip: "bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 border-blue-200",
      ratio: "text-blue-600",
      wards: wards.filter((w) => w.status === "surplus"),
    },
  ];

  return (
    <section aria-labelledby="quadrant-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="quadrant-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Ward Spend vs Need Quadrant Breakdown
          </h2>
          <p className="text-xs text-[var(--mist)] mt-0.5">
            Empirical matrix mapping municipal expenditure ratio against citizen distress across Mumbai&apos;s 24 wards.
          </p>
        </div>
        <span className="text-xs font-mono text-[var(--mist)] bg-[var(--sheet)] px-2.5 py-1 rounded border border-[var(--rule)]">
          24 Wards Mapped
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map((q) => (
          <div key={q.id} className={`p-4 rounded-xl border ${q.border} bg-[var(--card)] shadow-xs space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full inline-block ${q.dot}`} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                  {q.title}
                </h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${q.badge}`}>
                {q.wards.length} Wards · {q.rule}
              </span>
            </div>
            <p className="text-xs text-[var(--mist)] leading-relaxed">{q.desc}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {q.wards.map((w) => (
                <Link
                  key={w.wardCode}
                  href={`/wards/${wardSlug(w.wardCode)}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${q.chip}`}
                  title={`${w.wardName} (${w.zone}): ${w.spendToNeedRatio.toFixed(2)}x spend/need ratio`}
                >
                  <span className="font-bold">Ward {w.wardCode}</span>
                  <span className={`text-[0.6875rem] ${q.ratio}`}>({w.spendToNeedRatio.toFixed(2)}x)</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
