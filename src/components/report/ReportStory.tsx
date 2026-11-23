import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { ReportRows } from "@/components/place/ReportRows";
import { reportHeadline } from "@/lib/place-name";
import { reportAside } from "@/lib/report-copy";
import {
  ISSUE_TYPE_LABELS,
  type LocationRecord,
  type PlaceHistoryEvent,
  type PlaceSummary,
  type PublicReportRecord,
  type ReportListItem,
} from "@/lib/types";

const LINK = "ux4g-text-link-m touch-target inline-flex items-center";

/** Other reports at the same place shown here; the place page has the rest. */
const NEARBY = 5;

type ReportStoryProps = {
  report: PublicReportRecord;
  location: LocationRecord;
  place: PlaceSummary;
  history: PlaceHistoryEvent[];
  similar: ReportListItem[];
  connectedCount: number;
};

/**
 * One report: what was seen and where, the photo, then the place it belongs
 * to with its latest other reports. The full list lives on the place page.
 */
export function ReportStory({ report, location, place, history, connectedCount }: ReportStoryProps) {
  const issue = ISSUE_TYPE_LABELS[report.issueType];
  const headline = reportHeadline(issue, location.street, location.name);
  const placeHref = `/places/${location.slug}?report=${report.id}`;
  const others = history.filter((event) => event.id !== `report-${report.id}`).slice(0, NEARBY);

  return (
    <div className="min-w-0">
      <nav aria-label="Breadcrumb" className="mb-4 min-w-0">
        <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-2 p-0">
          <li>
            <Link href="/map" className={LINK}>
              Map
            </Link>
          </li>
          <li aria-hidden="true" className="ux4g-text ux4g-text-neutral-tertiary">
            /
          </li>
          <li className="min-w-0">
            <Link href={placeHref} className={`${LINK} min-w-0`}>
              <span className="break-words">{location.name}</span>
            </Link>
          </li>
          <li aria-hidden="true" className="ux4g-text ux4g-text-neutral-tertiary">
            /
          </li>
          <li className="ux4g-text min-w-0 break-words" aria-current="page">
            {issue}
          </li>
        </ol>
      </nav>

      <p className="rb-place-tags">
        <GovBadge tone="info">{issue}</GovBadge>
        {place.recurring ? <GovBadge tone="error">Keeps coming back</GovBadge> : null}
      </p>
      <h1 className="ux4g-heading-xl-strong ux4g-mt-xs break-words">{headline}</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary mt-2">
        {reportAside(report, location)}
        {report.recurs ? " People have noticed this more than once." : null}
      </p>

      {report.description ? <blockquote className="rb-report-words">{report.description}</blockquote> : null}

      {report.evidenceHash ? (
        <div className="my-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--mist)]">Cryptographic Evidence Hash:</span>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[var(--sheet)] text-[var(--ink)] border border-[var(--rule)] break-all select-all">
            {report.evidenceHash}
          </span>
        </div>
      ) : null}

      <figure className="rb-report-photo">
        {/* The photo is a separate request so this page's payload stays small. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/reports/${report.id}/photo`} alt={headline} />
        <figcaption>
          {location.street}, {location.ward}
          {report.photoIsIllustration ? ". Illustration. No photo was supplied with this report." : ""}
        </figcaption>
      </figure>

      <section className="rb-report-place" aria-labelledby="place-history-heading">
        <h2 id="place-history-heading" className="ux4g-heading-s-strong">
          At this place
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary">
          {connectedCount <= 0
            ? "This is the first report here."
            : `${place.reportCount} reports here${place.recurring ? ", and it keeps coming back" : ""}. The latest:`}
        </p>
        {others.length ? <ReportRows events={others} /> : null}
        <p className="ux4g-mt-s">
          <Link href={placeHref} className={LINK}>
            See every report at {location.name}
          </Link>
        </p>
      </section>
    </div>
  );
}
