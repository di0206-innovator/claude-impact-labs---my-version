import type { Metadata } from "next";

import { ReportForm } from "@/components/report/ReportForm";
import { parseIssueType } from "@/lib/issue-type-param";

export const metadata: Metadata = {
  title: "Report a Road Problem — Rasta Hisaab",
  description:
    "Photograph a pothole, waterlogging, or open manhole in Mumbai. Your report joins the ward's repair money trail.",
};

type ReportPageProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { type } = await searchParams;
  const initialIssueType = parseIssueType(type);

  return (
    <div className="shell-narrow rb-home rb-motion-fade-in">
      <h1 className="rb-flow-title">Report a road problem</h1>
      <ReportForm initialIssueType={initialIssueType} />
    </div>
  );
}
