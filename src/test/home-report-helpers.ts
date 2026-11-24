import { vi } from "vitest";
import type { MapInsightCounts, PlaceSummary } from "@/lib/types";
import { getMapInsights, listMapPoints, listPlaces } from "@/lib/queries";

export const testPlace: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "Pothole on Dr Ambedkar Road, Parel",
    slug: "dr-ambedkar-road-parel-pothole",
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8328,
    street: "Dr Ambedkar Road",
    ward: "A Ward",
    createdAt: "2022-08-18",
  },
  reportCount: 4,
  recurring: true,
  latestReport: null,
};

export const testInsights: MapInsightCounts = {
  reports: 4,
  places: 1,
  recurringPlaces: 3,
};

export const testPoint = {
  id: "rpt_1",
  locationId: "loc_1",
  lat: 18.9298,
  lng: 72.8328,
  issueType: "pothole" as const,
  noticedAt: "2022-08-18",
  reportedAt: "2022-08-18",
};

export function stubMap(places: PlaceSummary[] = [testPlace]) {
  vi.mocked(listMapPoints).mockResolvedValue([testPoint]);
  vi.mocked(listPlaces).mockResolvedValue(places);
  vi.mocked(getMapInsights).mockResolvedValue(testInsights);
}
