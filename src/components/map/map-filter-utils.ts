import type { DateRange } from "@/components/map/ReportedDateFilter";
import { filterByReportedDate } from "@/lib/map-date-filter";
import type { IssueType, MapReportPoint, PlaceSummary } from "@/lib/types";

export type IssueFilter = IssueType | "all";

export function matchesQuery(place: PlaceSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { name, street, ward } = place.location;
  return [name, street, ward].some((field) => field.toLowerCase().includes(q));
}

export function filterMapPoints(
  points: MapReportPoint[],
  issue: IssueFilter,
  range: DateRange = { from: null, to: null },
): MapReportPoint[] {
  const byIssue = issue === "all" ? points : points.filter((point) => point.issueType === issue);
  return filterByReportedDate(byIssue, range.from, range.to);
}

export function getVisiblePlaces(
  places: PlaceSummary[],
  points: MapReportPoint[],
  issue: IssueFilter,
  range: DateRange,
  query: string,
): PlaceSummary[] {
  const ids = new Set(
    filterMapPoints(points, issue, range).map((point) => point.locationId),
  );
  return places
    .filter(
      (place) => ids.has(place.location.id) && matchesQuery(place, query),
    )
    .sort((a, b) => b.reportCount - a.reportCount);
}

export function getFilteredPoints(
  points: MapReportPoint[],
  visiblePlaces: PlaceSummary[],
  issue: IssueFilter,
  range: DateRange,
): MapReportPoint[] {
  const ids = new Set(visiblePlaces.map((place) => place.location.id));
  return filterMapPoints(points, issue, range).filter((point) =>
    ids.has(point.locationId),
  );
}
