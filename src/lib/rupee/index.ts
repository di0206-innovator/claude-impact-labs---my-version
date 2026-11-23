/** Public entry point for the Follow the Rupee analytics. */

export * from "./types";
export type {
  Accident,
  Complaint,
  Dataset,
  Facility,
  FloodHotspot,
  Rainfall,
  RateCardEntry,
  Tide,
  Traffic,
} from "./load";
export { loadDataset } from "./load";
export { parseCsv, parseRows } from "./csv";
export { formatInr, formatInrShort, groupIndian } from "./format";
export { auditWorkOrders, expectedCostInr } from "./audit";
export { wardLedger, allLedgers, cityOverview } from "./ledger";
export { contractorScores } from "./contractors";
export { nextRupee } from "./next-rupee";

// Core accountability & audit services
export * from "./matching";
export * from "./deduplication";
export * from "./cost-anomaly";
export * from "./dlp";
export * from "./accountability";

import type { AuditFlag, CityOverview, ContractorScore, WardLedger } from "./types";
import type { Dataset } from "./load";
import { loadDataset } from "./load";
import { auditWorkOrders } from "./audit";
import { allLedgers, cityOverview } from "./ledger";
import { contractorScores } from "./contractors";

export type Rupee = {
  ds: Dataset;
  flags: AuditFlag[];
  ledgers: WardLedger[];
  scores: ContractorScore[];
  overview: CityOverview;
};

let cached: Rupee | null = null;

/** Load, audit and aggregate once, then reuse across requests. */
export function getRupee(): Rupee {
  if (!cached) {
    const ds = loadDataset();
    const pre = ds as unknown as Partial<Rupee>;
    if (pre.flags && pre.ledgers && pre.scores && pre.overview) {
      cached = {
        ds,
        flags: pre.flags,
        ledgers: pre.ledgers,
        scores: pre.scores,
        overview: pre.overview,
      };
    } else {
      const flags = auditWorkOrders(ds);
      cached = {
        ds,
        flags,
        ledgers: allLedgers(ds, flags),
        scores: contractorScores(ds, flags),
        overview: cityOverview(ds, flags),
      };
    }
  }
  return cached;
}
