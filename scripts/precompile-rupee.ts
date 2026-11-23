import fs from "node:fs";
import path from "node:path";
import { loadAll } from "../src/lib/rupee/load-rows";
import { auditWorkOrders } from "../src/lib/rupee/audit";
import { allLedgers, cityOverview } from "../src/lib/rupee/ledger";
import { contractorScores } from "../src/lib/rupee/contractors";

export function precompileRupeeDataset(outputPath?: string): string {
  const startTime = Date.now();
  console.log("Pre-compiling Rupee CSV dataset and civic audit structures...");

  const ds = loadAll();
  const flags = auditWorkOrders(ds);
  const ledgers = allLedgers(ds, flags);
  const scores = contractorScores(ds, flags);
  const overview = cityOverview(ds, flags);

  const payload = {
    ...ds,
    flags,
    ledgers,
    scores,
    overview,
  };

  const targetPath =
    outputPath ??
    path.join(process.cwd(), "src", "lib", "rupee", "generated-dataset.json");

  fs.writeFileSync(targetPath, JSON.stringify(payload), "utf8");

  const stat = fs.statSync(targetPath);
  const elapsed = Date.now() - startTime;
  console.log(
    `Pre-compiled ${ds.workOrders.length} work orders, ${ds.complaints.length} complaints into ${targetPath}`,
  );
  console.log(`Dataset size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB in ${elapsed}ms`);
  return targetPath;
}

// Run immediately if executed directly
if (process.argv[1]?.includes("precompile-rupee")) {
  precompileRupeeDataset();
}
