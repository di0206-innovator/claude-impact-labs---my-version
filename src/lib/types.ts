export const ISSUE_TYPES = [
  "pothole",
  "waterlogging",
  "open_manhole",
  "choked_drain",
  "road_cave_in",
  "broken_paver_blocks",
  "other",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  pothole: "Pothole",
  waterlogging: "Waterlogging",
  open_manhole: "Open or broken manhole",
  choked_drain: "Choked drain or nullah",
  road_cave_in: "Road cave-in",
  broken_paver_blocks: "Broken paver blocks",
  other: "Other road problem",
};

/** Short help under each type, in the words people use on the street. */
export const ISSUE_TYPE_HINTS: Record<IssueType, string> = {
  pothole: "A hole or crater in the road surface",
  waterlogging: "Water stands on the road after rain",
  open_manhole: "Missing, broken or sunken cover",
  choked_drain: "Drain or nullah blocked or overflowing",
  road_cave_in: "The road has sunk or collapsed",
  broken_paver_blocks: "Loose, missing or uneven blocks",
  other: "Anything else wrong with the road",
};

/** Have you seen anyone hurt or nearly hurt here? */
export const ACCIDENT_SEEN = ["injury", "near_miss", "none", "not_sure"] as const;

export type AccidentSeen = (typeof ACCIDENT_SEEN)[number];

export const ACCIDENT_SEEN_LABELS: Record<AccidentSeen, string> = {
  injury: "Yes, someone was hurt",
  near_miss: "Yes, a fall or a near miss",
  none: "No",
  not_sure: "Not sure",
};

/**
 * What the person picked. `noticedAt` is not shown for these: it is only a
 * sort key, the recorded Kolkata date minus the window midpoint (today 0,
 * this_week 3, this_month 15, one_to_six_months 105, over_six_months 270
 * days). Display uses the window and that recorded date. The offsets live in
 * `NOTICED_WINDOW_MIDPOINT_DAYS`.
 */
export const NOTICED_WINDOWS = [
  "today",
  "this_week",
  "this_month",
  "one_to_six_months",
  "over_six_months",
] as const;

export type NoticedWindow = (typeof NOTICED_WINDOWS)[number];

export const NOTICED_WINDOW_LABELS: Record<NoticedWindow, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  one_to_six_months: "1 to 6 months ago",
  over_six_months: "More than six months ago",
};

/** Anything that pins a place: a submission, a stored location, an edit. */
export type PlaceSpot = { lat: number; lng: number; issueType: IssueType };

export type LocationRecord = {
  id: string;
  name: string;
  slug: string;
  /** A place is one problem at one spot. Garbage and road damage on the same
   * corner are two places, so nearby matching compares this as well as distance. */
  issueType: IssueType;
  lat: number;
  lng: number;
  street: string;
  /** BMC ward code from the ward polygons, such as "F/S". */
  ward: string;
  /** Nearest mapped road segment within 250 m, which joins the work orders. */
  roadId?: string | null;
  createdAt: string;
};

export type ReportRecord = {
  id: string;
  locationId: string;
  issueType: IssueType;
  lat: number;
  lng: number;
  noticedAt: string;
  /** Null on rows written before the five noticed windows existed. */
  noticedWindow: NoticedWindow | null;
  recurs: boolean;
  /** Null on rows written before the question existed. */
  accident?: AccidentSeen | null;
  description: string | null;
  isSample: boolean;
  createdAt: string;
  /** Canonical SHA-256 evidence fingerprint. */
  evidenceHash?: string;
};

export type PublicReportRecord = ReportRecord & {
  /** Drawn stand-in. Only a seeded row has one, so this follows `isSample`. */
  photoIsIllustration: boolean;
};

export type ReportListItem = PublicReportRecord;

/**
 * A seed report still carries its photo so the writer can store it beside the
 * META item. Page records do not.
 */
export type SeedReport = ReportRecord & { photo: string };

export type MapReportPoint = {
  id: string;
  locationId: string;
  lat: number;
  lng: number;
  issueType: IssueType;
  noticedAt: string;
  noticedWindow?: NoticedWindow | null;
  /** When the report was filed (ISO instant, or a date on seed rows). The map's date filter uses this. */
  reportedAt: string;
};

export type PlaceSummary = {
  location: LocationRecord;
  reportCount: number;
  recurring: boolean;
  latestReport: ReportListItem | null;
};

export type PlaceHistoryEvent = {
  id: string;
  at: string;
  kind: "report";
  title: string;
  body: string;
  href?: string;
  noticedWindow: NoticedWindow | null;
  /** When the report was recorded. Window labels anchor to this, not `at`. */
  createdAt: string;
};

export type MapInsightCounts = {
  reports: number;
  places: number;
  recurringPlaces: number;
};

export type CreateReportInput = {
  issueType: IssueType;
  lat: number;
  lng: number;
  photo: string;
  noticedAt: string;
  noticedWindow?: NoticedWindow | null;
  recurs: boolean;
  accident?: AccidentSeen | null;
  description: string | null;
  evidenceHash?: string;
};

export type ReportPageData = {
  report: PublicReportRecord;
  location: LocationRecord;
  place: PlaceSummary;
  similar: ReportListItem[];
  history: PlaceHistoryEvent[];
  connectedCount: number;
};

export type UpdateReportInput = {
  id: string;
  issueType?: IssueType;
  description?: string | null;
  recurs?: boolean;
  photo?: string;
};

export type DeskNote = {
  id: string;
  reportId: string;
  body: string;
  createdAt: string;
};

export type Catalog = {
  locations: LocationRecord[];
  reports: ReportListItem[];
  notes: DeskNote[];
};

export type CreateReportResult = {
  report: ReportRecord;
  location: LocationRecord;
  connectedCount: number;
};
