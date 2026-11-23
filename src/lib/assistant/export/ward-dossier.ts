import { PDFDocument, StandardFonts } from "pdf-lib";
import { getRupee, nextRupee } from "@/lib/rupee";
import { Cursor, MARGIN, CONTENT_W, MUTED, RULE, ACCENT, INK } from "@/lib/rupee/scorecard-pdf/layout";
import { sanitiseText, moneyFull, generatedDate } from "@/lib/rupee/scorecard-pdf/text";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";

const DISCLAIMER = "BMC Ward Accountability Dossier. Claude explains, it does not count. Figures reflect billed amounts.";

function getWardData(wardCode: string) {
  const norm = wardCode.trim().toUpperCase().replace(/-/g, "/");
  const rupee = getRupee();
  const ledger = rupee.ledgers.find((l) => l.ward.code.toUpperCase() === norm);
  if (!ledger) return null;
  const plan = nextRupee(rupee.ds, rupee.flags, norm, 8);
  return { ledger, plan, norm };
}

/** Exports ward accountability dossier as CSV. */
export function exportWardDossierCsv(wardCode: string): string | null {
  const data = getWardData(wardCode);
  if (!data) return null;
  const { ledger, plan } = data;

  const rows: string[] = [
    [
      sanitizeCsvCell("BMC WARD ACCOUNTABILITY DOSSIER"),
      sanitizeCsvCell(`Ward ${ledger.ward.code} - ${ledger.ward.name}`),
    ].join(","),
    [sanitizeCsvCell("Generated At"), sanitizeCsvCell(new Date().toISOString())].join(","),
    [sanitizeCsvCell("Budget Allocated INR"), sanitizeCsvCell(ledger.budgetInr)].join(","),
    [sanitizeCsvCell("Total Billed INR"), sanitizeCsvCell(ledger.spentInr)].join(","),
    [sanitizeCsvCell("Variance INR"), sanitizeCsvCell(ledger.spentInr - ledger.budgetInr)].join(","),
    [sanitizeCsvCell("Total Work Orders"), sanitizeCsvCell(ledger.orders)].join(","),
    [
      sanitizeCsvCell("30d Reopen Rate"),
      sanitizeCsvCell(`${Math.round(ledger.reopenRate * 100)}%`),
    ].join(","),
    [
      sanitizeCsvCell("SLA Compliance Rate"),
      sanitizeCsvCell(`${Math.round(ledger.slaRate * 100)}%`),
    ].join(","),
    [sanitizeCsvCell("Citizen Complaints"), sanitizeCsvCell(ledger.complaints)].join(","),
    [sanitizeCsvCell("Flagged Bills Count"), sanitizeCsvCell(ledger.flags.length)].join(","),
    "",
    sanitizeCsvCell("OUTCOME BREAKDOWN"),
    [sanitizeCsvCell("Held Billed INR (DLP Active)"), sanitizeCsvCell(ledger.outcome.heldInr)].join(","),
    [sanitizeCsvCell("Failed Billed INR (Reopened 30d)"), sanitizeCsvCell(ledger.outcome.failedInr)].join(","),
    [
      sanitizeCsvCell("Flagged Billed INR (Audit Irregularities)"),
      sanitizeCsvCell(ledger.outcome.flaggedInr),
    ].join(","),
    "",
    sanitizeCsvCell("TOP CONTRACTORS IN WARD"),
    [
      sanitizeCsvCell("Contractor ID"),
      sanitizeCsvCell("Contractor Name"),
      sanitizeCsvCell("Jobs"),
      sanitizeCsvCell("Billed INR"),
    ].join(","),
    ...ledger.byContractor.map((c) =>
      [
        sanitizeCsvCell(c.key),
        sanitizeCsvCell(c.label),
        sanitizeCsvCell(c.orders),
        sanitizeCsvCell(c.spentInr),
      ].join(","),
    ),
    "",
    sanitizeCsvCell(`FLAGGED BILLS IN WARD (${ledger.flags.length})`),
    [
      sanitizeCsvCell("Work Order ID"),
      sanitizeCsvCell("Flag Kind"),
      sanitizeCsvCell("Road Name"),
      sanitizeCsvCell("Contractor"),
      sanitizeCsvCell("Cost INR"),
      sanitizeCsvCell("Amount At Risk INR"),
      sanitizeCsvCell("Reason"),
    ].join(","),
    ...ledger.flags.map((f) =>
      [
        sanitizeCsvCell(f.workOrderId),
        sanitizeCsvCell(f.kind),
        sanitizeCsvCell(f.roadName),
        sanitizeCsvCell(f.contractorName),
        sanitizeCsvCell(f.costInr),
        sanitizeCsvCell(f.amountAtRiskInr),
        sanitizeCsvCell(f.reason),
      ].join(","),
    ),
    "",
    sanitizeCsvCell("NEXT RUPEE PRIORITY ROADS"),
    [
      sanitizeCsvCell("Rank"),
      sanitizeCsvCell("Road ID"),
      sanitizeCsvCell("Road Name"),
      sanitizeCsvCell("Risk Score"),
      sanitizeCsvCell("Under DLP (Free Fix)"),
      sanitizeCsvCell("Est Cost INR"),
      sanitizeCsvCell("Reasons"),
    ].join(","),
    ...plan.map((p) =>
      [
        sanitizeCsvCell(p.rank),
        sanitizeCsvCell(p.roadId),
        sanitizeCsvCell(p.roadName),
        sanitizeCsvCell(p.score),
        sanitizeCsvCell(p.underDlp ? "Yes" : "No"),
        sanitizeCsvCell(p.underDlp ? 0 : p.estCostInr),
        sanitizeCsvCell(p.reasons.join("; ")),
      ].join(","),
    ),
  ];

  return rows.join("\n");
}

/** Renders official A4 Ward Accountability Dossier PDF. */
export async function exportWardDossierPdf(wardCode: string): Promise<Uint8Array | null> {
  const data = getWardData(wardCode);
  if (!data) return null;
  const { ledger, plan } = data;

  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cur = new Cursor(doc, fonts);

  // Header Banner
  cur.line("MUMBAI ROAD REPAIR ACCOUNTABILITY", { size: 9, bold: true, color: MUTED });
  cur.line(`Ward Accountability Dossier: Ward ${ledger.ward.code}`, {
    size: 16,
    bold: true,
    color: ACCENT,
  });
  cur.line(
    `Ward Name: ${sanitiseText(ledger.ward.name)}  |  Generated: ${generatedDate(new Date())}`,
    { size: 9, color: MUTED },
  );
  cur.rule(10);

  // Financial & Durability KPI Summary
  cur.heading("Ward Financial & Durability Overview");
  cur.line(
    `Budget: ${moneyFull(ledger.budgetInr)}    Billed: ${moneyFull(ledger.spentInr)}    Orders: ${ledger.orders}`,
    { size: 10, bold: true, color: INK },
  );
  cur.line(
    `30d Reopen Failure: ${Math.round(ledger.reopenRate * 100)}%    SLA Rate: ${Math.round(ledger.slaRate * 100)}%    Flagged Bills: ${ledger.flags.length}`,
    { size: 9, color: MUTED },
  );
  cur.line(
    `Held Under DLP: ${moneyFull(ledger.outcome.heldInr)}    Failed Spend: ${moneyFull(ledger.outcome.failedInr)}    Flagged Spend: ${moneyFull(ledger.outcome.flaggedInr)}`,
    { size: 8.5, color: INK },
  );
  cur.move(8);

  // Top Contractors in Ward
  cur.heading(`Top Contractors in Ward ${ledger.ward.code}`);
  cur.line("Contractor                         Jobs    Billed Amount", { size: 8, bold: true, color: INK });
  cur.rule(4);
  for (const c of ledger.byContractor.slice(0, 6)) {
    cur.ensure(14);
    const name = sanitiseText(c.label.slice(0, 32)).padEnd(35);
    const jobs = String(c.orders).padEnd(8);
    const billed = moneyFull(c.spentInr);
    cur.line(`${name} ${jobs} ${billed}`, { size: 8, color: INK });
  }
  cur.move(8);

  // Flagged Bills in Ward
  cur.heading(`Flagged Bills Requiring Audit Review (${ledger.flags.length})`);
  if (ledger.flags.length === 0) {
    cur.line("No flagged bills recorded for this ward.", { size: 8.5, color: MUTED });
  } else {
    for (const f of ledger.flags.slice(0, 6)) {
      cur.ensure(16);
      cur.line(
        `${f.workOrderId} [${f.kind}]  ${moneyFull(f.costInr)} billed  |  Risk: ${moneyFull(f.amountAtRiskInr)}`,
        { size: 8, bold: true, color: INK },
      );
      cur.line(`  Road: ${sanitiseText(f.roadName)}  |  ${sanitiseText(f.reason)}`, { size: 7.5, color: MUTED });
    }
    if (ledger.flags.length > 6) {
      cur.line(`...and ${ledger.flags.length - 6} more flagged work orders in this ward.`, { size: 7.5, color: MUTED });
    }
  }
  cur.move(8);

  // Next Rupee Priority Roads
  cur.heading("Next Rupee Plan: Priority Roads for Repair");
  cur.line("Rank  Road ID   Road Name                      Risk   DLP Fix?  Est Cost", {
    size: 8,
    bold: true,
    color: INK,
  });
  cur.rule(4);
  for (const p of plan.slice(0, 6)) {
    cur.ensure(14);
    const rank = String(p.rank).padEnd(6);
    const id = p.roadId.padEnd(10);
    const name = sanitiseText(p.roadName.slice(0, 28)).padEnd(31);
    const risk = `${p.score}/100`.padEnd(7);
    const dlp = (p.underDlp ? "Zero Cost" : "Standard").padEnd(10);
    const cost = p.underDlp ? "Rs 0 (DLP)" : moneyFull(p.estCostInr);
    cur.line(`${rank} ${id} ${name} ${risk} ${dlp} ${cost}`, { size: 8, color: INK });
  }

  // Draw Page Furniture
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const y = 26;
    page.drawLine({
      start: { x: MARGIN, y: y + 14 },
      end: { x: MARGIN + CONTENT_W, y: y + 14 },
      thickness: 0.6,
      color: RULE,
    });
    page.drawText(DISCLAIMER, { x: MARGIN, y, size: 7.5, font: fonts.regular, color: MUTED });
    const label = `Page ${index + 1} of ${pages.length}`;
    const width = fonts.regular.widthOfTextAtSize(label, 7.5);
    page.drawText(label, { x: MARGIN + CONTENT_W - width, y, size: 7.5, font: fonts.regular, color: MUTED });
  });

  return doc.save();
}
