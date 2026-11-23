import fs from "node:fs";
import path from "node:path";
import { loadAll } from "./load-rows";
import type { Contractor, Road, Ward, WorkOrder } from "./types";

/** Extra source shapes not needed in types.ts, defined here to keep that file intact. */
export type RateCardEntry = {
  method: string;
  unit: "per sqm" | "per job";
  rateInr: number;
};

export type Complaint = {
  id: string;
  receivedAt: string;
  channel: string;
  category: string;
  description: string;
  language: string;
  locality: string;
  ward: string | null;
  lat: number | null;
  lng: number | null;
  upvotes: number;
  status: string;
  resolvedAt: string | null;
};

export type FloodHotspot = {
  id: string;
  name: string;
  ward: string;
  lat: number;
  lng: number;
  floodThresholdMm: number;
  tideSensitive: boolean;
  avgWaterDepthCm: number;
  avgRecessionHours: number;
  pumpingStationNearby: boolean;
  yearsFlagged: number;
};

export type Rainfall = {
  date: string;
  station: string;
  rainfallMm: number;
  imdCategory: string;
  imdAlert: string;
};

export type Tide = {
  date: string;
  highTideTime: string;
  heightM: number;
  bigTideFlag: boolean;
};

export type Traffic = {
  roadId: string;
  peakHourVehicles: number;
  avgPeakSpeedKmph: number;
  congestionIndex: number;
  busRoutesCount: number;
  twoWheelerSharePct: number;
};

export type Accident = {
  id: string;
  occurredAt: string;
  ward: string;
  roadId: string;
  lat: number;
  lng: number;
  vehicleType: string;
  severity: string;
  probableCause: string;
};

export type Facility = {
  id: string;
  type: string;
  name: string;
  ward: string;
  lat: number;
  lng: number;
  bedsOrStudents: number;
  emergencyServices: boolean;
  ambulanceEntryRoad: string;
};

export type SocialPost = {
  id: string;
  postedAt: string;
  source: string;
  text: string;
  hasMedia: boolean;
  likes: number;
};

export type Dataset = {
  wards: Ward[];
  roads: Road[];
  workOrders: WorkOrder[];
  contractors: Contractor[];
  rateCard: RateCardEntry[];
  complaints: Complaint[];
  floodHotspots: FloodHotspot[];
  rainfall: Rainfall[];
  tides: Tide[];
  traffic: Traffic[];
  accidents: Accident[];
  facilities: Facility[];
  socialPosts: SocialPost[];
};

let cached: Dataset | null = null;

/** Load and parse the whole dataset once per process. Uses pre-compiled JSON when available. */
export function loadDataset(): Dataset {
  if (cached) return cached;

  const jsonPath = path.join(process.cwd(), "src", "lib", "rupee", "generated-dataset.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      cached = JSON.parse(raw) as Dataset;
      return cached;
    } catch {
      // Fall back to CSV files on error
    }
  }

  cached = loadAll();
  return cached;
}

export function resetDatasetCacheForTests(): void {
  cached = null;
}
