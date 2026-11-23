import { createHash } from "node:crypto";
import { nid, slugify } from "@/lib/id";
import { assertItemSize } from "@/lib/item-size";
import { clusterKey, wardAt } from "@/lib/city";
import { namePlace, nearestRoad, repairStoredPlace } from "@/lib/place-name";
import { assertPhotoString } from "@/lib/photo-validate";
import { ItemTooLargeError, ReportValidationError } from "@/lib/repo/errors";
import { recoverIssueType } from "@/lib/repo/legacy";
import { geoPk, locationPk, notePk, reportPk, SEED_PK, slugLockPk } from "@/lib/repo/keys";
import { toListItem, type SeedItem } from "@/lib/repo/port";
import {
  ISSUE_TYPE_LABELS,
  NOTICED_WINDOWS,
  type Catalog,
  type CreateReportInput,
  type DeskNote,
  type LocationRecord,
  type NoticedWindow,
  type PlaceSpot,
  type ReportRecord,
  type SeedReport,
} from "@/lib/types";

export type DynamoItem = Record<string, unknown>;

const str = (item: DynamoItem, key: string) => String(item[key] ?? "");
const num = (item: DynamoItem, key: string) => Number(item[key]);
const flag = (item: DynamoItem, key: string) => Boolean(item[key]);
const opt = (item: DynamoItem, key: string) => (item[key] == null ? null : String(item[key]));

function noticedWindowOf(item: DynamoItem): NoticedWindow | null {
  const value = item.noticedWindow;
  return typeof value === "string" && (NOTICED_WINDOWS as readonly string[]).includes(value)
    ? (value as NoticedWindow)
    : null;
}

export function locationSlugBase(input: PlaceSpot): string {
  const street = namePlace(input.issueType, input.lat, input.lng).street;
  return slugify(`${street} ${ISSUE_TYPE_LABELS[input.issueType]}`) || "mumbai-road";
}

export function buildCitizenLocation(input: PlaceSpot, slug: string): LocationRecord {
  const named = namePlace(input.issueType, input.lat, input.lng);
  return {
    id: nid("loc"),
    name: named.name,
    slug,
    issueType: input.issueType,
    lat: input.lat,
    lng: input.lng,
    street: named.street,
    ward: wardAt(input.lat, input.lng) ?? "",
    roadId: nearestRoad(input.lat, input.lng)?.id ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function computeEvidenceHash(payload: {
  issueType: string;
  lat: number;
  lng: number;
  createdAt: string;
  photo?: string;
}): string {
  const photo = payload.photo ?? "";
  const canonical = `${payload.issueType}|${payload.lat.toFixed(6)}|${payload.lng.toFixed(6)}|${payload.createdAt}|${photo}`;
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function buildCitizenReport(input: CreateReportInput, locationId: string): ReportRecord {
  const createdAt = new Date().toISOString();
  const evidenceHash =
    input.evidenceHash ||
    computeEvidenceHash({
      issueType: input.issueType,
      lat: input.lat,
      lng: input.lng,
      createdAt,
      photo: input.photo,
    });
  return {
    id: nid("rpt"),
    locationId,
    issueType: input.issueType,
    lat: input.lat,
    lng: input.lng,
    noticedAt: input.noticedAt,
    noticedWindow: input.noticedWindow ?? null,
    recurs: input.recurs,
    accident: input.accident ?? null,
    description: input.description,
    isSample: false,
    createdAt,
    evidenceHash,
  };
}

export function slugLockItem(slug: string, locationId: string): DynamoItem {
  return { pk: slugLockPk(slug), sk: "LOCK", locationId, slug };
}

export function toLocationItem(record: LocationRecord): DynamoItem {
  return {
    pk: locationPk(record.id),
    sk: "META",
    type: "location",
    gsi1pk: slugLockPk(record.slug),
    gsi1sk: "LOC",
    gsi2pk: geoPk(clusterKey(record.lat, record.lng)),
    gsi2sk: locationPk(record.id),
    ...record,
  };
}

export function fromLocationItem(item: DynamoItem): LocationRecord {
  const name = str(item, "name");
  return repairStoredPlace({
    id: str(item, "id"),
    name,
    slug: str(item, "slug"),
    issueType: (str(item, "issueType") || recoverIssueType(name)) as LocationRecord["issueType"],
    lat: num(item, "lat"),
    lng: num(item, "lng"),
    street: str(item, "street"),
    ward: str(item, "ward"),
    roadId: opt(item, "roadId"),
    createdAt: str(item, "createdAt"),
  });
}

export function reportWithoutPhoto(record: SeedReport): ReportRecord {
  const { photo: _photo, ...rest } = record;
  return rest;
}

export function toReportItem(record: ReportRecord): DynamoItem {
  return {
    pk: reportPk(record.id),
    sk: "META",
    type: "report",
    gsi1pk: locationPk(record.locationId),
    gsi1sk: `RPT#${record.noticedAt}#${record.id}`,
    ...record,
  };
}

/** Photo lives on its own item so a catalog query never reads the bytes. */
export function toPhotoItem(id: string, photo: string): DynamoItem {
  return { pk: reportPk(id), sk: "PHOTO", photo };
}

export function fromReportItem(item: DynamoItem): ReportRecord {
  const issueType = str(item, "issueType") as ReportRecord["issueType"];
  const lat = num(item, "lat");
  const lng = num(item, "lng");
  const createdAt = str(item, "createdAt");
  const evidenceHash =
    opt(item, "evidenceHash") ||
    computeEvidenceHash({ issueType, lat, lng, createdAt, photo: opt(item, "photo") ?? "" });
  return {
    id: str(item, "id"),
    locationId: str(item, "locationId"),
    issueType,
    lat,
    lng,
    noticedAt: str(item, "noticedAt"),
    noticedWindow: noticedWindowOf(item),
    recurs: flag(item, "recurs"),
    accident: (opt(item, "accident") as ReportRecord["accident"]) ?? null,
    description: opt(item, "description"),
    isSample: flag(item, "isSample"),
    createdAt,
    evidenceHash,
  };
}

export function toNoteItem(record: DeskNote): DynamoItem {
  return {
    pk: notePk(record.id),
    sk: "META",
    type: "note",
    gsi1pk: reportPk(record.reportId),
    gsi1sk: `UPD#${record.createdAt}#${record.id}`,
    ...record,
  };
}

export function fromNoteItem(item: DynamoItem): DeskNote {
  return {
    id: str(item, "id"),
    reportId: str(item, "reportId"),
    body: str(item, "body"),
    createdAt: str(item, "createdAt"),
  };
}

export function toSeedMarkerItem(version: string): DynamoItem {
  return { pk: SEED_PK, sk: "META", type: "seed", version };
}

export function seedToItem(item: Exclude<SeedItem, { entity: "retire_report" }>): DynamoItem {
  if (item.entity === "location") return toLocationItem(item.record);
  return toReportItem(reportWithoutPhoto(item.record));
}

export function emptyCatalog(): Catalog {
  return { locations: [], reports: [], notes: [] };
}

export const CATALOG_TYPES = ["location", "report", "note"] as const;

/**
 * Non-key attributes on the `byType` INCLUDE projection. A ProjectionExpression
 * returns only what it names, keys included, so queries add `type` themselves.
 */
export const CATALOG_ATTRS = [
  "id", "name", "slug", "lat", "lng", "street", "ward", "createdAt",
  "locationId", "issueType", "noticedAt", "noticedWindow", "recurs",
  "description", "isSample", "reportId", "body", "evidenceHash",
] as const;

function projectAttrs(attrs: readonly string[]) {
  const ExpressionAttributeNames = Object.fromEntries(attrs.map((attr) => [`#${attr}`, attr]));
  return {
    ProjectionExpression: attrs.map((attr) => `#${attr}`).join(", "),
    ExpressionAttributeNames,
  };
}

export function byTypeQueryInput(type: (typeof CATALOG_TYPES)[number]) {
  // `ingestCatalogItem` routes rows on `type`; without it every row is dropped.
  return {
    IndexName: "byType",
    KeyConditionExpression: "#type = :type",
    ExpressionAttributeValues: { ":type": type },
    ...projectAttrs(["type", ...CATALOG_ATTRS]),
  };
}

export function catalogScanInput() {
  return {
    FilterExpression: "#sk = :meta AND #type <> :seed",
    ...projectAttrs(["pk", "sk", "type", ...CATALOG_ATTRS]),
    ExpressionAttributeValues: { ":meta": "META", ":seed": "seed" },
  };
}

export function reportListProjection() {
  return projectAttrs([
    "id", "locationId", "issueType", "lat", "lng", "noticedAt",
    "noticedWindow", "recurs", "description", "isSample", "createdAt", "evidenceHash",
  ]);
}

export function ingestCatalogItem(catalog: Catalog, item: DynamoItem): void {
  if (item.type === "location") catalog.locations.push(fromLocationItem(item));
  else if (item.type === "report") catalog.reports.push(toListItem(fromReportItem(item)));
  else if (item.type === "note") catalog.notes.push(fromNoteItem(item));
}

export function sortByNoticed<T extends { noticedAt: string; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.noticedAt !== b.noticedAt) return a.noticedAt < b.noticedAt ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}

export function assertWritePhoto(photo: string, allowSample: boolean): void {
  try {
    assertPhotoString(photo, { allowSample });
  } catch (error) {
    throw new ReportValidationError(error instanceof Error ? error.message : "Use a JPEG, PNG, or WebP photo.");
  }
}

export function guardItemSize(item: DynamoItem): void {
  try {
    assertItemSize(item);
  } catch {
    throw new ItemTooLargeError("This record is too large to store.");
  }
}
