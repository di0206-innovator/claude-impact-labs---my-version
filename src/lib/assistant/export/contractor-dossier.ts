import { getScorecards } from "@/lib/rupee/scorecard";
import { getRupee } from "@/lib/rupee";
import { renderScorecardPdf } from "@/lib/rupee/scorecard-pdf/render";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";

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
    [
      sanitizeCsvCell("CONTRACTOR PERFORMANCE & ACCOUNTABILITY DOSSIER"),
      sanitizeCsvCell(card.name),
      sanitizeCsvCell(card.id),
    ].join(","),
    [sanitizeCsvCell("Generated At"), sanitizeCsvCell(new Date().toISOString())].join(","),
    [sanitizeCsvCell("Citywide Rank"), sanitizeCsvCell(`${card.rank} of ${total}`)].join(","),
    [
      sanitizeCsvCell("Overall Stress-Adjusted Score"),
      sanitizeCsvCell(`${card.overall.toFixed(1)} / 100`),
    ].join(","),
    [sanitizeCsvCell("Performance Band"), sanitizeCsvCell(card.band)].join(","),
    [sanitizeCsvCell("Total Jobs Completed"), sanitizeCsvCell(card.volume.jobs)].join(","),
    [sanitizeCsvCell("Total Billed INR"), sanitizeCsvCell(card.volume.billedInr)].join(","),
    [sanitizeCsvCell("Wards Worked"), sanitizeCsvCell(card.volume.wards)].join(","),
    [
      sanitizeCsvCell("Actual 30d Reopen Rate"),
      sanitizeCsvCell(`${Math.round(card.durability.actualRate * 100)}%`),
    ].join(","),
    [
      sanitizeCsvCell("Expected Reopen Rate"),
      sanitizeCsvCell(`${Math.round(card.durability.expectedRate * 100)}%`),
    ].join(","),
    [
      sanitizeCsvCell("Rate-Card Billing Ratio"),
      sanitizeCsvCell(`${card.cost.avgCostRatio.toFixed(2)}x`),
    ].join(","),
    [
      sanitizeCsvCell("SLA Miss Rate"),
      sanitizeCsvCell(`${Math.round(card.speed.actualRate * 100)}%`),
    ].join(","),
    [
      sanitizeCsvCell("High Monsoon Stress Share"),
      sanitizeCsvCell(`${Math.round(card.volume.highStressShare * 100)}%`),
    ].join(","),
    [
      sanitizeCsvCell("Repeat Repairs on Same Road"),
      sanitizeCsvCell(card.repeats.repeatJobs),
    ].join(","),
    [sanitizeCsvCell("Flagged Bills Count"), sanitizeCsvCell(flags.length)].join(","),
    "",
    sanitizeCsvCell(`FLAGGED BILLS TABLE (${flags.length})`),
    [
      sanitizeCsvCell("Work Order ID"),
      sanitizeCsvCell("Flag Kind"),
      sanitizeCsvCell("Ward"),
      sanitizeCsvCell("Road Name"),
      sanitizeCsvCell("Billed INR"),
      sanitizeCsvCell("Amount At Risk INR"),
      sanitizeCsvCell("Reason"),
    ].join(","),
    ...flags.map((f) =>
      [
        sanitizeCsvCell(f.workOrderId),
        sanitizeCsvCell(f.kind),
        sanitizeCsvCell(f.ward),
        sanitizeCsvCell(f.roadName),
        sanitizeCsvCell(f.costInr),
        sanitizeCsvCell(f.amountAtRiskInr),
        sanitizeCsvCell(f.reason),
      ].join(","),
    ),
    "",
    sanitizeCsvCell(`RECORDED WORK ORDERS SAMPLE (${Math.min(orders.length, 50)})`),
    [
      sanitizeCsvCell("Work Order ID"),
      sanitizeCsvCell("Ward"),
      sanitizeCsvCell("Road ID"),
      sanitizeCsvCell("Method"),
      sanitizeCsvCell("Cost INR"),
      sanitizeCsvCell("SLA Met"),
      sanitizeCsvCell("Reopened"),
    ].join(","),
    ...orders.slice(0, 50).map((w) =>
      [
        sanitizeCsvCell(w.id),
        sanitizeCsvCell(w.ward),
        sanitizeCsvCell(w.roadId),
        sanitizeCsvCell(w.method),
        sanitizeCsvCell(w.costInr),
        sanitizeCsvCell(w.slaMet ? "Yes" : "No"),
        sanitizeCsvCell(w.reopened ? "Yes" : "No"),
      ].join(","),
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
