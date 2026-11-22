import { getScorecards } from "@/lib/rupee/scorecard";
import { getRupee } from "@/lib/rupee";
import { renderScorecardPdf } from "@/lib/rupee/scorecard-pdf/render";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";

function findCard(contractorId: string): { card: ContractorScorecard; total: number } | null {
  const norm = contractorId.trim().toUpperCase();
  const { cards } = getScorecards();
  const card = cards.find((c) => c.id.toUpperCase() === norm || c.name.toUpperCase() === norm);
  if (!card) return null;
  return { card, total: cards.length };
}

/**
 * Exports contractor performance and audit dossier as CSV.
 */
export function exportContractorDossierCsv(contractorId: string): string | null {
  const found = findCard(contractorId);
  if (!found) return null;
  const { card, total } = found;

  const rupee = getRupee();
  const flags = rupee.flags.filter((f) => f.contractorId.toUpperCase() === card.id.toUpperCase());
  const orders = rupee.ds.workOrders.filter((w) => w.contractorId.toUpperCase() === card.id.toUpperCase());

  const rows: string[] = [
    `"CONTRACTOR PERFORMANCE & ACCOUNTABILITY DOSSIER","${card.name}","${card.id}"`,
    `"Generated At","${new Date().toISOString()}"`,
    `"Citywide Rank","${card.rank} of ${total}"`,
    `"Overall Stress-Adjusted Score","${card.overall.toFixed(1)} / 100"`,
    `"Performance Band","${card.band}"`,
    `"Total Jobs Completed","${card.volume.jobs}"`,
    `"Total Billed INR","${card.volume.billedInr}"`,
    `"Wards Worked","${card.volume.wards}"`,
    `"Actual 30d Reopen Rate","${Math.round(card.durability.actualRate * 100)}%"`,
    `"Expected Reopen Rate","${Math.round(card.durability.expectedRate * 100)}%"`,
    `"Rate-Card Billing Ratio","${card.cost.avgCostRatio.toFixed(2)}x"`,
    `"SLA Miss Rate","${Math.round(card.speed.actualRate * 100)}%"`,
    `"High Monsoon Stress Share","${Math.round(card.volume.highStressShare * 100)}%"`,
    `"Repeat Repairs on Same Road","${card.repeats.repeatJobs}"`,
    `"Flagged Bills Count","${flags.length}"`,
    "",
    `"FLAGGED BILLS TABLE (${flags.length})"`,
    `"Work Order ID","Flag Kind","Ward","Road Name","Billed INR","Amount At Risk INR","Reason"`,
    ...flags.map(
      (f) =>
        `"${f.workOrderId}","${f.kind}","${f.ward}","${f.roadName}","${f.costInr}","${f.amountAtRiskInr}","${f.reason.replace(/"/g, '""')}"`,
    ),
    "",
    `"RECORDED WORK ORDERS SAMPLE (${Math.min(orders.length, 50)})"`,
    `"Work Order ID","Ward","Road ID","Method","Cost INR","SLA Met","Reopened"`,
    ...orders.slice(0, 50).map(
      (w) =>
        `"${w.id}","${w.ward}","${w.roadId}","${w.method}","${w.costInr}","${w.slaMet ? "Yes" : "No"}","${w.reopened ? "Yes" : "No"}"`,
    ),
  ];

  return rows.join("\n");
}

/**
 * Renders official contractor scorecard & accountability dossier PDF.
 */
export async function exportContractorDossierPdf(contractorId: string): Promise<Uint8Array | null> {
  const found = findCard(contractorId);
  if (!found) return null;
  const { card, total } = found;

  return renderScorecardPdf(card, {
    total,
    generatedOn: new Date(),
  });
}
