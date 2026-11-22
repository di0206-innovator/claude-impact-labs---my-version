import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContractorBrief, ContractorBriefLoading } from "@/components/rupee/ContractorBrief";
import { ContractorMethod } from "@/components/rupee/ContractorMethod";
import { MethodTable, WardTable } from "@/components/rupee/ContractorBreakdowns";
import { CONTRACT_FILTERS, ContractList, contractFilterOf, type ContractFilterKey } from "@/components/rupee/ContractList";
import { FlagList } from "@/components/rupee/FlagList";
import { RepeatRepairs } from "@/components/rupee/RepeatRepairs";
import { BandBadge, ScoreMeter } from "@/components/rupee/ScoreMeter";
import { ScoreParts } from "@/components/rupee/ScoreParts";
import { formatInr, formatInrShort, getRupee } from "@/lib/rupee";
import { getScorecards, PRIOR_JOBS } from "@/lib/rupee/scorecard";
import { pct } from "@/lib/rupee/slug";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string; n?: string }>;
};

function findCard(id: string) {
  return getScorecards().cards.find((card) => card.id.toLowerCase() === id.toLowerCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = findCard((await params).id);
  if (!card) return { title: "Contractor not found" };
  return {
    title: `${card.name} scorecard`,
    description: `How ${card.name}'s monsoon road repairs held up, what they billed against the rate card, and whether they finished on time.`,
  };
}

export default async function ContractorPage({ params, searchParams }: Props) {
  const card = findCard((await params).id);
  if (!card) notFound();
  const query = await searchParams;
  const filter = contractFilterOf(query.show);
  const limit = Math.min(Math.max(Number(query.n) || 10, 10), 500);

  const { flags } = getRupee();
  const ownFlags = flags.filter((flag) => flag.contractorId === card.id);
  const flaggedInr = new Set(ownFlags.map((f) => f.workOrderId));
  const flaggedTotal = card.orders.filter((o) => flaggedInr.has(o.id)).reduce((n, o) => n + o.costInr, 0);
  const test = CONTRACT_FILTERS.find((f) => f.key === filter)!.test;
  const matching = card.orders.filter(test);
  const { cards } = getScorecards();
  const basePath = `/contractors/${card.id}`;

  return (
    <div className="shell rb-page py-6 sm:py-10 space-y-8 rb-cdetail rb-motion-fade-in">
      <nav className="ux4g-breadcrumb ux4g-breadcrumb-divider" aria-label="Breadcrumb">
        <ol className="ux4g-breadcrumb-list flex">
          <li className="ux4g-breadcrumb-item">
            <Link href="/contractors" className="ux4g-breadcrumb-link touch-target">
              Contractors
            </Link>
          </li>
          <li className="ux4g-breadcrumb-item active" aria-current="page">
            {card.name}
          </li>
        </ol>
      </nav>

      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Contractor Scorecard
            </span>
            <span className="rb-chip-dark rb-chip-dark-held">Rank {card.rank} of {cards.length}</span>
            <span className="rb-chip-dark">Empanelled {card.empanelledSince}</span>
            <span className="rb-chip-dark font-mono">{card.id}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            {card.name}
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            Fair accountability scorecard: evaluated against what is expected for their specific repair mix and ward flood conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 flex flex-col justify-between">
            <div>
              <span className="text-[0.6875rem] uppercase tracking-wider font-semibold text-[var(--mint-tint)]/80">Overall Score</span>
              <div className="text-4xl sm:text-5xl font-serif font-bold text-white mt-1 rb-tabular-nums">{card.overall.toFixed(0)}</div>
            </div>
            <div className="mt-3">
              <BandBadge band={card.band} />
            </div>
          </div>
          <div className="p-5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 md:col-span-2 flex flex-col justify-center space-y-3">
            <ScoreMeter score={card.overall} label={`${card.name} overall score`} large />
            <p className="text-xs text-[var(--mint-tint)]/80 leading-relaxed">
              50 means exactly as expected. 60+ is Strong, 40-60 is As expected, under 40 Needs attention.
              {card.volume.jobs >= PRIOR_JOBS ? ` ${card.volume.jobs} jobs counted.` : ` Under ${PRIOR_JOBS} jobs, so no band is given.`}
            </p>
          </div>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Total Jobs</dt>
            <dd className="rb-kpi-val">{card.volume.jobs}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Total Billed</dt>
            <dd className="rb-kpi-val">{formatInrShort(card.volume.billedInr)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">30-Day Reopen Rate</dt>
            <dd className={`rb-kpi-val ${card.durability.actualRate > 0.2 ? "text-[#fca5a5]" : "text-[var(--mint-tint)]"}`}>
              {pct(card.durability.actualRate)}
            </dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">DLP Flagged Jobs</dt>
            <dd className="rb-kpi-val text-[#fde68a]">{card.volume.paidUnderDlpJobs}</dd>
          </div>
        </dl>
      </header>

      <div className="rb-pdf-actions">
        <a
          href={`${basePath}/scorecard.pdf`}
          download
          className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target rb-btn-icon"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Download scorecard (PDF)
        </a>
      </div>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          In plain words
        </h2>
        <div className="pt-1">
          <Suspense fallback={<ContractorBriefLoading />}>
            <ContractorBrief card={card} />
          </Suspense>
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="parts-heading">
        <h2 id="parts-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          How the score is made
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          Each part compares what happened with what is expected for the same kind of work in the same conditions. Doing exactly as expected scores 50.
        </p>
        <div className="pt-2">
          <ScoreParts card={card} />
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="repeat-heading">
        <h2 id="repeat-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Did the same potholes come back?
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          Shown as evidence. It is not counted in the score.
        </p>
        <div className="pt-2">
          <RepeatRepairs repeats={card.repeats} contractorName={card.name} />
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Bills that need an explanation
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          {formatInr(flaggedTotal)} sits on {ownFlags.length} flagged {ownFlags.length === 1 ? "bill" : "bills"}.{" "}
          {card.volume.paidUnderDlpJobs > 0
            ? `${card.volume.paidUnderDlpJobs} jobs (${formatInrShort(card.volume.paidUnderDlpInr)}) were paid for on roads still under guarantee. `
            : ""}
          A flag is a question for the ward office, not proof of wrongdoing.
        </p>
        <div className="pt-2">
          <FlagList flags={ownFlags} emptyText="No audit flags on this contractor's bills." />
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="where-heading">
        <h2 id="where-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Where they worked
        </h2>
        <p className="ux4g-body-m-default text-[var(--mist)] rb-measure">
          Red figures are more than 15% worse than expected for that ward&apos;s mix of work.
        </p>
        <div className="pt-2">
          <WardTable rows={card.byWard} />
        </div>
        <details className="rb-more pt-2">
          <summary className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target rb-more-btn">Results by repair method</summary>
          <div className="pt-2">
            <MethodTable rows={card.byMethod} />
          </div>
        </details>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" id="contracts" aria-labelledby="contracts-heading">
        <h2 id="contracts-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          Every contract
        </h2>
        <div className="pt-2">
          <ContractList
            orders={matching}
            basePath={basePath}
            filter={filter}
            limit={limit}
            total={card.orders.length}
            counts={
              Object.fromEntries(
                CONTRACT_FILTERS.map((f) => [f.key, card.orders.filter(f.test).length]),
              ) as Record<ContractFilterKey, number>
            }
          />
        </div>
      </section>

      <section className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] space-y-4" aria-labelledby="method-heading">
        <h2 id="method-heading" className="ux4g-title-l-strong text-[var(--ink)]">
          How we score
        </h2>
        <div className="pt-2">
          <ContractorMethod />
        </div>
      </section>

      <nav className="rb-pager pt-4" aria-label="Other contractors">
        {cards[card.rank - 2] ? (
          <Link href={`/contractors/${cards[card.rank - 2].id}`} className="text-[var(--enamel)] hover:underline touch-target text-sm font-medium">
            ← Ranked above: {cards[card.rank - 2].name}
          </Link>
        ) : (
          <span />
        )}
        {cards[card.rank] ? (
          <Link href={`/contractors/${cards[card.rank].id}`} className="text-[var(--enamel)] hover:underline touch-target text-sm font-medium">
            Ranked below: {cards[card.rank].name} →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
