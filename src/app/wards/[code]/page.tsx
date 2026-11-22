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
import { getRepository } from "@/lib/repo/context";
import { formatInr, formatInrShort, generateWardActionQueue, getRupee, nextRupee } from "@/lib/rupee";
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
  const queueItems = generateWardActionQueue(rupee.ds, ward.code);
  const scoreById = new Map(
    rupee.scores.map((score) => [score.contractor.id, score]),
  );
  const citizen = await citizenReportCount(ward.code);
  const score = moneyScore(ledger);
  const rank = 1 + rupee.ledgers.filter((row) => moneyScore(row) > score).length;
  const index = rupee.ledgers.findIndex((row) => row.ward.code === ward.code);
  const prev = rupee.ledgers[index - 1];
  const after = rupee.ledgers[index + 1];

  return (
    <div className="shell-narrow rb-page">
      <nav
        className="ux4g-breadcrumb ux4g-breadcrumb-divider"
        aria-label="Breadcrumb"
      >
        <ol className="ux4g-breadcrumb-list flex">
          <li className="ux4g-breadcrumb-item">
            <Link href="/wards" className="ux4g-breadcrumb-link touch-target">
              Wards
            </Link>
          </li>
          <li className="ux4g-breadcrumb-item active" aria-current="page">
            {ward.code}
          </li>
        </ol>
      </nav>

      <h1 className="ux4g-display-xs-strong ux4g-mt-xs">{ward.code} ward</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary">
        {ward.name}
      </p>
      <p className="rb-ward-score ux4g-mt-xs">
        <span className={`rb-rank-score rb-score-${scoreBand(score)}`}>
          <span className="rb-rank-score-n">{score}</span>
          <span className="rb-rank-score-w">Score</span>
        </span>
        <span className="ux4g-body-m-default">
          Ranked <strong>{rank} of {rupee.ledgers.length}</strong> wards.{" "}
          <Link href="/wards" className="ux4g-text-link-m">
            See the ranking
          </Link>
        </span>
      </p>

      <ScoreHow kind="ward" className="ux4g-mt-s" />

      <section className="rb-section rb-section-tight" aria-labelledby="next-heading">
        <h2 id="next-heading" className="ux4g-title-l-strong">
          Where the next rupee should go
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          Roads ranked by open complaints, accidents, flooding, traffic, and
          schools or hospitals on them.
        </p>
        <div className="ux4g-mt-s">
          <BudgetSimulator wardCode={ward.code} items={next} />
        </div>
      </section>

      <section
        className="ux4g-card ux4g-card-solid ux4g-card-vertical ux4g-mt-3xl"
        aria-labelledby="money-heading"
      >
        <div className="ux4g-card-header">
          <h2 id="money-heading" className="ux4g-heading-xs-strong">
            {formatInrShort(ledger.spentInr)} spent on {ledger.orders} jobs
          </h2>
        </div>
        <div className="ux4g-card-body">
          <OutcomeBar
            outcome={outcome}
            spentInr={ledger.spentInr}
            budgetInr={ledger.budgetInr}
            label={`${ward.code} ward monsoon road spend by outcome`}
          />
        </div>
      </section>

      <section className="rb-section" aria-labelledby="held-heading">
        <h2 id="held-heading" className="ux4g-title-l-strong">
          Where the money went, and did it last?
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          {pct(ledger.reopenRate)} of jobs were re-opened within 30 days.{" "}
          {pct(ledger.slaRate)} were finished on time.
          {view === "contractor"
            ? ` Fair is the re-open rate expected for the same work in equally flood-prone wards (${context.floodHotspots} flood ${context.floodHotspots === 1 ? "hotspot" : "hotspots"} here).`
            : ""}
        </p>
        <nav className="rb-tabs ux4g-mt-s" aria-label="Split the spend by">
          {VIEWS.map((option) => (
            <Link
              key={option.key}
              href={
                option.key === "problem"
                  ? `/wards/${wardSlug(ward.code)}#held-heading`
                  : `/wards/${wardSlug(ward.code)}?by=${option.key}#held-heading`
              }
              aria-current={view === option.key ? "true" : undefined}
              scroll={false}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <div className="ux4g-mt-s">
          {view === "problem" ? (
            <SpendCategories
              caption="By problem"
              rows={ledger.byWorkType}
              totalInr={ledger.spentInr}
            />
          ) : view === "method" ? (
            <SpendCategories
              caption="By repair method"
              rows={ledger.byMethod}
              totalInr={ledger.spentInr}
            />
          ) : (
            <SpendCategories
              caption="By contractor"
              rows={ledger.byContractor}
              totalInr={ledger.spentInr}
              scorecards={new Map(getScorecards().cards.map((card) => [card.id, card]))}
              fairRate={
                new Map(
                  ledger.byContractor.map((row) => [
                    row.key,
                    scoreById.get(row.key)?.expectedReopenRate ?? 0,
                  ]),
                )
              }
            />
          )}
        </div>
        <p className="ux4g-body-s-default ux4g-mt-s">
          <Link href="/contractors" className="ux4g-text-link-s">
            All contractor scorecards
          </Link>
        </p>
      </section>

      <section className="rb-section" aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="ux4g-title-l-strong">
          Bills that need an explanation
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          {formatInr(outcome.flaggedInr)} sits on {ledger.flags.length} flagged{" "}
          {ledger.flags.length === 1 ? "bill" : "bills"}. A flag is a question
          for the ward office, not proof of wrongdoing.
        </p>
        <div className="ux4g-mt-s">
          <FlagList flags={ledger.flags} />
          <OfficerActions wardCode={ward.code} wardName={ward.name} flags={ledger.flags} next={next} />
        </div>
      </section>

      {/* Operational Ward Engineer Triage Queue */}
      <WardEngineerQueue
        wardCode={ward.code}
        wardName={ward.name}
        items={queueItems}
        className="ux4g-mt-3xl"
      />

      <section className="rb-section" aria-labelledby="people-heading">
        <h2 id="people-heading" className="ux4g-title-l-strong">
          What people reported
        </h2>
        <p className="ux4g-body-m-default ux4g-mt-2xs rb-measure">
          {complaints.total} complaints this season. {complaints.linked} led to
          a work order;{" "}
          <strong>{complaints.stillOpen} are still open with none</strong>.{" "}
          {citizen.reports > 0
            ? `${citizen.reports} photo ${citizen.reports === 1 ? "report has" : "reports have"} been filed here.`
            : "No photo reports filed here yet."}
        </p>
        <div className="ux4g-mt-s">
          <WardVoices ds={rupee.ds} ward={ward.code} />
        </div>
        <div className="rb-actions ux4g-mt-m">
          <Link href="/" className="ux4g-btn-primary ux4g-btn-m touch-target">
            Report a road problem
          </Link>
          <Link
            href="/map"
            className="ux4g-btn-outline-primary ux4g-btn-m touch-target"
          >
            See reports on the map
          </Link>
        </div>
      </section>

      <nav className="rb-pager ux4g-mt-2xl" aria-label="Other wards">
        {prev ? (
          <Link
            href={`/wards/${wardSlug(prev.ward.code)}`}
            className="ux4g-text-link-m touch-target"
          >
            Previous: {prev.ward.code} ward
          </Link>
        ) : (
          <span />
        )}
        {after ? (
          <Link
            href={`/wards/${wardSlug(after.ward.code)}`}
            className="ux4g-text-link-m touch-target"
          >
            Next: {after.ward.code} ward
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
