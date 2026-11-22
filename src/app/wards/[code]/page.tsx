import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BudgetSimulator } from "@/components/rupee/BudgetSimulator";
import { FlagList } from "@/components/rupee/FlagList";
import { OfficerActions } from "@/components/rupee/OfficerActions";
import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import { SpendCategories } from "@/components/rupee/SpendCategories";
import { ScoreHow } from "@/components/rupee/ScoreHow";
import { WardVoices } from "@/components/rupee/WardVoices";
import { listActionQueueItems } from "@/lib/passport/queue";
import { getRepository } from "@/lib/repo/context";
import { formatInr, formatInrShort, getRupee, nextRupee } from "@/lib/rupee";
import { getScorecards } from "@/lib/rupee/scorecard";
import { moneyScore, pct, scoreBand, wardFromSlug, wardSlug } from "@/lib/rupee/slug";
import { WardEngineerQueue } from "./queue";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };
type PageProps = Params & { searchParams: Promise<{ by?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const ledger = wardFromSlug(getRupee().ledgers, code);
  if (!ledger) return { title: "Ward not found" };
  return {
    title: `${ledger.ward.code} ward money trail`,
    description: `Where ${ledger.ward.code} ward (${ledger.ward.name}) spent its monsoon road money, what held up, and where the next rupee should go.`,
  };
}

const VIEWS = [
  { key: "problem", label: "Problem" },
  { key: "method", label: "Method" },
  { key: "contractor", label: "Contractor" },
] as const;

type View = (typeof VIEWS)[number]["key"];

async function citizenReportCount(
  code: string,
): Promise<{ places: number; reports: number }> {
  try {
    const catalog = await getRepository().loadCatalog();
    const ids = new Set(
      catalog.locations.filter((loc) => loc.ward === code).map((loc) => loc.id),
    );
    return {
      places: ids.size,
      reports: catalog.reports.filter((r) => ids.has(r.locationId)).length,
    };
  } catch {
    return { places: 0, reports: 0 };
  }
}

export default async function WardPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const asked = (await searchParams).by;
  const view: View = VIEWS.some((option) => option.key === asked)
    ? (asked as View)
    : "problem";
  const rupee = getRupee();
  const ledger = wardFromSlug(rupee.ledgers, code);
  if (!ledger) notFound();

  const { ward, outcome, complaints, context } = ledger;
  const next = nextRupee(rupee.ds, rupee.flags, ward.code, 8);
  const queueItems = listActionQueueItems(ward.code);
  const scoreById = new Map(
    rupee.scores.map((score) => [score.contractor.id, score]),
  );
  const citizen = await citizenReportCount(ward.code);
  const wardZone = rupee.ds.wards.find((d) => d.code === ward.code)?.zone;
  const score = moneyScore(ledger);
  const rank = 1 + rupee.ledgers.filter((row) => moneyScore(row) > score).length;
  const index = rupee.ledgers.findIndex((row) => row.ward.code === ward.code);
  const prev = rupee.ledgers[index - 1];
  const after = rupee.ledgers[index + 1];

  return (
    <div className="shell-narrow rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <nav className="ux4g-breadcrumb ux4g-breadcrumb-divider" aria-label="Breadcrumb">
        <ol className="ux4g-breadcrumb-list flex">
          <li className="ux4g-breadcrumb-item">
            <Link href="/wards" className="ux4g-breadcrumb-link touch-target">Wards</Link>
          </li>
          <li className="ux4g-breadcrumb-item active" aria-current="page">{ward.code}</li>
        </ol>
      </nav>

      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Ward {ward.code} Intelligence
            </span>
            <span className="rb-chip-dark rb-chip-dark-held">{wardZone ? `Zone ${wardZone}` : "Mumbai"}</span>
            <span className="rb-chip-dark">Rank {rank} of {rupee.ledgers.length}</span>
            {ledger.flags.length > 0 && (
              <span className="rb-chip-dark rb-chip-dark-flagged">
                {ledger.flags.length} Audit {ledger.flags.length === 1 ? "Flag" : "Flags"}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            Ward {ward.code} — {ward.name}
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            Monsoon road repair accountability ledger: where {ward.code} ward allocated funds, repair durability rates, rate-card compliance, and operational triage priorities.
          </p>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Civic Durability Score</dt>
            <dd className="rb-kpi-val flex items-baseline gap-1.5">
              <span>{score}</span>
              <span className="text-xs font-sans font-normal text-[var(--mint-tint)]/70">/ 100 ({scoreBand(score)})</span>
            </dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Total Amount Billed</dt>
            <dd className="rb-kpi-val">{formatInrShort(ledger.spentInr)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">30-Day Reopening Rate</dt>
            <dd className={`rb-kpi-val ${ledger.reopenRate > 0.2 ? "text-[#fca5a5]" : "text-[var(--mint-tint)]"}`}>
              {pct(ledger.reopenRate)}
            </dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Flagged at Risk</dt>
            <dd className="rb-kpi-val text-[#fde68a]">{formatInrShort(outcome.flaggedInr)}</dd>
          </div>
        </dl>
      </header>

      <ScoreHow kind="ward" className="ux4g-mt-s" />

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="next-heading">
        <h2 id="next-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Where the next rupee should go
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          Roads ranked by open complaints, accidents, flooding, traffic, and schools or hospitals on them.
        </p>
        <div className="pt-2">
          <BudgetSimulator wardCode={ward.code} items={next} />
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="money-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-2">
          <h2 id="money-heading" className="ux4g-heading-xs-strong text-[var(--ink)]">
            {formatInrShort(ledger.spentInr)} spent on {ledger.orders} jobs
          </h2>
          <span className="text-xs text-[var(--mist)] font-mono">Budget: {formatInrShort(ledger.budgetInr)}</span>
        </div>
        <OutcomeBar
          outcome={outcome}
          spentInr={ledger.spentInr}
          budgetInr={ledger.budgetInr}
          label={`${ward.code} ward monsoon road spend by outcome`}
        />
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="held-heading">
        <h2 id="held-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Where the money went, and did it last?
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          {pct(ledger.reopenRate)} of jobs were re-opened within 30 days. {pct(ledger.slaRate)} were finished on time.
          {view === "contractor" ? ` Fair is the re-open rate expected for the same work in equally flood-prone wards (${context.floodHotspots} flood ${context.floodHotspots === 1 ? "hotspot" : "hotspots"} here).` : ""}
        </p>
        <nav className="flex flex-wrap items-center gap-2 pt-2" aria-label="Split the spend by">
          {VIEWS.map((option) => (
            <Link
              key={option.key}
              href={
                option.key === "problem"
                  ? `/wards/${wardSlug(ward.code)}#held-heading`
                  : `/wards/${wardSlug(ward.code)}?by=${option.key}#held-heading`
              }
              className={`touch-target text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                view === option.key
                  ? "rb-pill-vermilion"
                  : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
              }`}
              aria-current={view === option.key ? "true" : undefined}
              scroll={false}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <div className="pt-2">
          {view === "problem" ? (
            <SpendCategories caption="By problem" rows={ledger.byWorkType} totalInr={ledger.spentInr} />
          ) : view === "method" ? (
            <SpendCategories caption="By repair method" rows={ledger.byMethod} totalInr={ledger.spentInr} />
          ) : (
            <SpendCategories
              caption="By contractor"
              rows={ledger.byContractor}
              totalInr={ledger.spentInr}
              scorecards={new Map(getScorecards().cards.map((card) => [card.id, card]))}
              fairRate={new Map(ledger.byContractor.map((row) => [row.key, scoreById.get(row.key)?.expectedReopenRate ?? 0]))}
            />
          )}
        </div>
        <p className="text-xs pt-2">
          <Link href="/contractors" className="text-[var(--enamel)] hover:underline font-medium">All contractor scorecards →</Link>
        </p>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Bills that need an explanation
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          {formatInr(outcome.flaggedInr)} sits on {ledger.flags.length} flagged {ledger.flags.length === 1 ? "bill" : "bills"}. A flag is a question for the ward office, not proof of wrongdoing.
        </p>
        <div className="space-y-4 pt-2">
          <FlagList flags={ledger.flags} />
          <OfficerActions wardCode={ward.code} wardName={ward.name} flags={ledger.flags} next={next} />
        </div>
      </section>

      {/* Operational Ward Engineer Triage Queue */}
      <WardEngineerQueue wardCode={ward.code} wardName={ward.name} items={queueItems} />

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="people-heading">
        <h2 id="people-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          What people reported
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          {complaints.total} complaints this season. {complaints.linked} led to a work order; <strong>{complaints.stillOpen} are still open with none</strong>.{" "}
          {citizen.reports > 0 ? `${citizen.reports} photo ${citizen.reports === 1 ? "report has" : "reports have"} been filed here.` : "No photo reports filed here yet."}
        </p>
        <div className="pt-2">
          <WardVoices ds={rupee.ds} ward={ward.code} />
        </div>
        <div className="rb-actions pt-2">
          <Link href="/" className="ux4g-btn-primary ux4g-btn-m touch-target">Report a road problem</Link>
          <Link href="/map" className="ux4g-btn-outline-primary ux4g-btn-m touch-target">See reports on the map</Link>
        </div>
      </section>

      <nav className="rb-pager pt-4" aria-label="Other wards">
        {prev ? (
          <Link href={`/wards/${wardSlug(prev.ward.code)}`} className="text-[var(--enamel)] hover:underline touch-target text-sm font-medium">
            ← Previous: {prev.ward.code} ward
          </Link>
        ) : <span />}
        {after ? (
          <Link href={`/wards/${wardSlug(after.ward.code)}`} className="text-[var(--enamel)] hover:underline touch-target text-sm font-medium">
            Next: {after.ward.code} ward →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
