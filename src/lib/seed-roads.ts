import { wardAt } from "@/lib/city";
import { clusterKey, neighbourClusterKeys, nearestMatching } from "@/lib/geo";
import seedRows from "@/lib/geo-data/seed-reports.data.json";
import { slugify } from "@/lib/id";
import { namePlace, nearestRoad } from "@/lib/place-name";
import { computeEvidenceHash } from "@/lib/repo/mappers";
import type { SeedItem } from "@/lib/repo/port";
import type { AccidentSeen, IssueType, LocationRecord, SeedReport } from "@/lib/types";

export type SeedRow = {
  id: string;
  complaintId: string;
  issueType: IssueType;
  lat: number;
  lng: number;
  noticedAt: string;
  recurs: boolean;
  accident: AccidentSeen;
  description: string;
};

/** Drawn stand-ins. Seeded reports never carry a real photo. */
const PHOTO: Record<IssueType, string> = {
  pothole: "/samples/road.svg",
  waterlogging: "/samples/drainage.svg",
  open_manhole: "/samples/manhole.svg",
  choked_drain: "/samples/drainage.svg",
  road_cave_in: "/samples/road.svg",
  broken_paver_blocks: "/samples/paving.svg",
  other: "/samples/road.svg",
};

type PlaceGroup = {
  /** The first (earliest noticedAt) row fixes the place's point, as on live writes. */
  lat: number;
  lng: number;
  issueType: IssueType;
  locationId: string;
  first: SeedRow;
  reports: SeedRow[];
};

/**
 * Seed complaints are grouped exactly the way a live report joins a place:
 * `nearestMatching` decides, and the cluster index only narrows the candidates
 * (the same 5x5 neighbourhood `findNearbyLocation` searches). The place keeps
 * the earliest row's point and name; later rows only get its locationId.
 */
export function seedItemsForRows(rows: SeedRow[]): SeedItem[] {
  const ordered = rows
    .filter((row) => wardAt(row.lat, row.lng) !== null)
    .sort((a, b) => {
      if (a.noticedAt !== b.noticedAt) return a.noticedAt < b.noticedAt ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const groups: PlaceGroup[] = [];
  const byCluster = new Map<string, PlaceGroup[]>();
  for (const row of ordered) {
    const candidates: PlaceGroup[] = [];
    const seen = new Set<PlaceGroup>();
    for (const key of neighbourClusterKeys(row.lat, row.lng)) {
      for (const group of byCluster.get(key) ?? []) {
        if (seen.has(group)) continue;
        seen.add(group);
        candidates.push(group);
      }
    }
    const group = nearestMatching(candidates, row.lat, row.lng, row.issueType);
    if (group) {
      group.reports.push(row);
      continue;
    }
    const fresh: PlaceGroup = {
      lat: row.lat,
      lng: row.lng,
      issueType: row.issueType,
      locationId: `loc_${row.id.slice(4)}`,
      first: row,
      reports: [row],
    };
    groups.push(fresh);
    const key = clusterKey(row.lat, row.lng);
    const bucket = byCluster.get(key) ?? [];
    bucket.push(fresh);
    byCluster.set(key, bucket);
  }

  const items: SeedItem[] = [];
  for (const group of groups) {
    const first = group.first;
    const named = namePlace(first.issueType, first.lat, first.lng);
    const location: LocationRecord = {
      id: group.locationId,
      name: named.name,
      slug: slugify(`${named.street} ${first.complaintId}`),
      issueType: first.issueType,
      lat: first.lat,
      lng: first.lng,
      street: named.street,
      ward: wardAt(first.lat, first.lng) ?? "",
      roadId: nearestRoad(first.lat, first.lng)?.id ?? null,
      createdAt: first.noticedAt,
    };
    items.push({ entity: "location", record: location });
    for (const row of group.reports) {
      const photo = PHOTO[row.issueType];
      const report: SeedReport = {
        id: row.id,
        locationId: group.locationId,
        issueType: row.issueType,
        lat: row.lat,
        lng: row.lng,
        photo,
        noticedAt: row.noticedAt,
        noticedWindow: null,
        recurs: row.recurs,
        accident: row.accident,
        description: row.description,
        isSample: true,
        createdAt: row.noticedAt,
        evidenceHash: computeEvidenceHash({
          issueType: row.issueType,
          lat: row.lat,
          lng: row.lng,
          createdAt: row.noticedAt,
          photo,
        }),
      };
      items.push({ entity: "report", record: report });
    }
  }
  return items;
}

/**
 * Seeded reports are complaints from the synthetic dataset
 * (`data/rupee/complaints.csv`) that have coordinates or a locality
 * match. Built by `node scripts/build-geo.mjs`. A point outside every
 * ward polygon is dropped here.
 */
export function seedRoads(): SeedItem[] {
  return seedItemsForRows(seedRows as SeedRow[]);
}
