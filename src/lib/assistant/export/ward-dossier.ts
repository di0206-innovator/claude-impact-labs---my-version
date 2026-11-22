import { PDFDocument, StandardFonts } from "pdf-lib";
import { getRupee, nextRupee } from "@/lib/rupee";
import { Cursor, MARGIN, CONTENT_W, MUTED, RULE, ACCENT, INK } from "@/lib/rupee/scorecard-pdf/layout";
import { sanitiseText, moneyFull, generatedDate } from "@/lib/rupee/scorecard-pdf/text";

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
    `"BMC WARD ACCOUNTABILITY DOSSIER","Ward ${ledger.ward.code} - ${ledger.ward.name}"`,
    `"Generated At","${new Date().toISOString()}"`,
    `"Budget Allocated INR","${ledger.budgetInr}"`,
    `"Total Billed INR","${ledger.spentInr}"`,
    `"Variance INR","${ledger.spentInr - ledger.budgetInr}"`,
    `"Total Work Orders","${ledger.orders}"`,
    `"30d Reopen Rate","${Math.round(ledger.reopenRate * 100)}%"`,
    `"SLA Compliance Rate","${Math.round(ledger.slaRate * 100)}%"`,
    `"Citizen Complaints","${ledger.complaints}"`,
    `"Flagged Bills Count","${ledger.flags.length}"`,
    "",
    `"OUTCOME BREAKDOWN"`,
    `"Held Billed INR (DLP Active)","${ledger.outcome.heldInr}"`,
    `"Failed Billed INR (Reopened 30d)","${ledger.outcome.failedInr}"`,
    `"Flagged Billed INR (Audit Irregularities)","${ledger.outcome.flaggedInr}"`,
    "",
    `"TOP CONTRACTORS IN WARD"`,
    `"Contractor ID","Contractor Name","Jobs","Billed INR"`,
    ...ledger.byContractor.map((c) => `"${c.key}","${c.label}","${c.orders}","${c.spentInr}"`),
    "",
    `"FLAGGED BILLS IN WARD (${ledger.flags.length})"`,
    `"Work Order ID","Flag Kind","Road Name","Contractor","Cost INR","Amount At Risk INR","Reason"`,
    ...ledger.flags.map(
      (f) =>
        `"${f.workOrderId}","${f.kind}","${f.roadName}","${f.contractorName}","${f.costInr}","${f.amountAtRiskInr}","${f.reason.replace(/"/g, '""')}"`,
    ),
    "",
    `"NEXT RUPEE PRIORITY ROADS"`,
    `"Rank","Road ID","Road Name","Risk Score","Under DLP (Free Fix)","Est Cost INR","Reasons"`,
    ...plan.map(
      (p) =>
        `"${p.rank}","${p.roadId}","${p.roadName}","${p.score}","${p.underDlp ? "Yes" : "No"}","${p.underDlp ? 0 : p.estCostInr}","${p.reasons.join("; ")}"`,
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
