import { fromLocationItem, fromNoteItem, fromReportItem, type DynamoItem } from "@/lib/repo/mappers";
import { toListItem } from "@/lib/repo/port";
import type { Catalog } from "@/lib/types";

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

export function projectAttrs(attrs: readonly string[]) {
  const ExpressionAttributeNames = Object.fromEntries(attrs.map((attr) => [`#${attr}`, attr]));
  return {
    ProjectionExpression: attrs.map((attr) => `#${attr}`).join(", "),
    ExpressionAttributeNames,
  };
}

export function byTypeQueryInput(type: (typeof CATALOG_TYPES)[number]) {
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
