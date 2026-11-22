import { redirect } from "next/navigation";

type ReportIdPageProps = {
  params: Promise<{ id: string }>;
};

/** Redirects singular /report/[id] to canonical public report page at /reports/[id]. */
export default async function ReportIdRedirectPage({ params }: ReportIdPageProps) {
  const { id } = await params;
  redirect(`/reports/${encodeURIComponent(id)}`);
}
