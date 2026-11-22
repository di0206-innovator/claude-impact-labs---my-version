import { getRupee } from "../rupee/index";
import type { Dataset } from "../rupee/load";
import type { AuditFlag, WardLedger } from "../rupee/types";
import { calculateDisparityMetrics } from "./metrics";
import { calculateRoadSpendVsNeed } from "./road-score";
import type {
  CityDisparityMetrics,
  RoadSpendVsNeed,
  SpendVsNeedReport,
  WardSpendVsNeed,
} from "./types";
import { calculateWardSpendVsNeed } from "./ward-score";

export { calculateRoadSpendVsNeed } from "./road-score";
export { calculateWardSpendVsNeed } from "./ward-score";
export { calculateDisparityMetrics } from "./metrics";

export function getSpendVsNeedReport(
  customDs?: Dataset,
  customFlags?: AuditFlag[],
  customLedgers?: WardLedger[],
): SpendVsNeedReport {
  const rupee = getRupee();
  const ds = customDs ?? rupee.ds;
  const flags = customFlags ?? rupee.flags;
  const ledgers = customLedgers ?? rupee.ledgers;

  const roads = calculateRoadSpendVsNeed(ds, flags);
  const wards = calculateWardSpendVsNeed(ds, roads, ledgers);
  const metrics = calculateDisparityMetrics(wards);

  return { wards, roads, metrics };
}

export type {
  CityDisparityMetrics,
  DisparityStatus,
  NeedDimensionBreakdown,
  RoadSpendVsNeed,
  SpendVsNeedReport,
  WardSpendVsNeed,
} from "./types";
