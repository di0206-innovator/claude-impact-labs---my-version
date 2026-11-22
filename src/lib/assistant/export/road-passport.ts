import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildEvidencePack, exportEvidencePackCsv } from "@/lib/passport/evidence-pack";
import { Cursor, MARGIN, CONTENT_W, MUTED, RULE, ACCENT, INK } from "@/lib/rupee/scorecard-pdf/layout";
import { sanitiseText, moneyFull, generatedDate } from "@/lib/rupee/scorecard-pdf/text";

export { exportEvidencePackCsv as exportRoadPassportCsv };

const DISCLAIMER = "Public Civic Intelligence Record. Claude explains, it does not count. Figures reflect billed amounts.";

/**
 * Renders an official A4 Road Passport Evidence Pack PDF.
 */
export async function exportRoadPassportPdf(roadId: string): Promise<Uint8Array | null> {
  const pack = buildEvidencePack(roadId);
  if (!pack) return null;

  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cur = new Cursor(doc, fonts);

  // 1. Header Banner
  cur.line("MUMBAI ROAD REPAIR ACCOUNTABILITY", { size: 9, bold: true, color: MUTED });
  cur.line(`Road Passport Evidence Pack: ${sanitiseText(pack.road.name)}`, {
    size: 16,
    bold: true,
    color: ACCENT,
  });
  cur.line(
    `Road ID: ${pack.road.id}  |  Ward: ${pack.road.ward}  |  Length: ${pack.road.lengthM}m  |  Surface: ${pack.road.surface}`,
    { size: 9, color: MUTED },
  );
  cur.line(
    `Generated: ${generatedDate(new Date())}  |  Algorithm: ${pack.metadata.algorithmVersion}  |  DLP: ${pack.road.underDlp ? "Active DLP" : "Standard"}`,
    { size: 8, color: MUTED },
  );
  cur.rule(10);

  // 2. Summary KPI Box
  cur.heading("Key Repair & Financial Metrics");
  cur.line(
    `Total Billed: ${moneyFull(pack.summary.totalBilledInr)}    Total Work Orders: ${pack.summary.totalOrders}    Reopened Repairs (30d): ${pack.summary.reopenedOrders}`,
    { size: 10, bold: true, color: INK },
  );
  cur.line(
    `Audit Flags: ${pack.summary.auditFlagCount}    Citizen Complaints: ${pack.complaints.length}    Accident Clusters: ${pack.accidentsCount}`,
    { size: 9, color: MUTED },
  );
  cur.move(6);

  // 3. Work Orders Section
  cur.heading(`Official BMC Work Orders (${pack.workOrders.length})`);
  if (pack.workOrders.length === 0) {
    cur.line("No official municipal repair work orders recorded for this road segment.", { size: 9, color: MUTED });
  } else {
    cur.line("ID            Contractor           Method         Billed      SLA Met  Reopened", {
      size: 8,
      bold: true,
      color: INK,
    });
    cur.rule(4);
    for (const wo of pack.workOrders) {
      cur.ensure(14);
      const id = wo.id.padEnd(14);
      const contractor = sanitiseText(wo.contractor.slice(0, 18)).padEnd(20);
      const method = sanitiseText(wo.method.slice(0, 12)).padEnd(14);
      const billed = moneyFull(wo.costBilledInr).padEnd(12);
      const sla = wo.slaMet.padEnd(8);
      const reopened = wo.reopenedWithin30d;
      cur.line(`${id} ${contractor} ${method} ${billed} ${sla} ${reopened}`, { size: 8, color: INK });
    }
  }
  cur.move(8);

  // 4. Linked Complaints Section
  cur.heading(`Linked Citizen Complaints (${pack.complaints.length})`);
  if (pack.complaints.length === 0) {
    cur.line("No citizen complaints matched to this road segment.", { size: 9, color: MUTED });
  } else {
    cur.line("Complaint ID   Date         Category          Status        Upvotes", {
      size: 8,
      bold: true,
      color: INK,
    });
    cur.rule(4);
    for (const c of pack.complaints.slice(0, 15)) {
      cur.ensure(14);
      const id = c.id.padEnd(15);
      const date = c.receivedAt.slice(0, 10).padEnd(13);
      const cat = sanitiseText(c.category.slice(0, 16)).padEnd(18);
      const status = c.status.padEnd(14);
      const up = String(c.upvotes);
      cur.line(`${id} ${date} ${cat} ${status} ${up}`, { size: 8, color: INK });
    }
    if (pack.complaints.length > 15) {
      cur.line(`...and ${pack.complaints.length - 15} more complaints in official records.`, { size: 8, color: MUTED });
    }
  }
  cur.move(8);

  // 5. Recommended Actions
  if (pack.recommendedActions && pack.recommendedActions.length > 0) {
    cur.heading("Recommended Audit Actions");
    for (const action of pack.recommendedActions) {
      cur.paragraph(`- ${sanitiseText(action.headline)}: ${sanitiseText(action.explanation)}`, { size: 8.5, color: INK });
    }
  }

  // Draw Page Furniture (Footers and page numbers)
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
