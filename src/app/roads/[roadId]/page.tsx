import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PassportActions } from "@/components/passport/PassportActions";
import { PassportContext } from "@/components/passport/PassportContext";
import { PassportGraph } from "@/components/passport/PassportGraph";
import { PassportHeader } from "@/components/passport/PassportHeader";
import { PassportLifecycle } from "@/components/passport/PassportLifecycle";
import { PassportMoneyTrail } from "@/components/passport/PassportMoneyTrail";
import { PassportSocialEvidence } from "@/components/passport/PassportSocialEvidence";
import { PassportTimeline } from "@/components/passport/PassportTimeline";
import { passportService } from "@/lib/passport/service";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roadId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const data = passportService.getRoadPassport(roadId);
  if (!data) return { title: "Road Not Found" };
  return {
    title: `${data.road.name} (${data.road.id}) — Road Reliability Passport`,
    description: `Citizen signal, contractor work orders, money trail, and repair outcomes for ${data.road.name} in Ward ${data.road.ward}.`,
  };
}

export default async function RoadPassportPage({ params }: PageProps) {
  const { roadId } = await params;
  const data = passportService.getRoadPassport(roadId);
  if (!data) notFound();

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      {/* Clean Swiss-Editorial Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-2">
        <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-2 p-0 text-xs">
          <li>
            <Link href="/roads" className="ux4g-text-link-m text-[var(--teal-deep)] font-semibold touch-target">
              Road Explorer
            </Link>
          </li>
          <li aria-hidden="true" className="text-[var(--mist)]">/</li>
          <li>
            <Link href={`/wards/${wardSlug(data.road.ward)}`} className="ux4g-text-link-m text-[var(--mist)] hover:text-[var(--teal-deep)] touch-target">
              Ward {data.road.ward}
            </Link>
          </li>
          <li aria-hidden="true" className="text-[var(--mist)]">/</li>
          <li className="font-semibold text-[var(--ink)] truncate max-w-[18rem]" aria-current="page">
            {data.road.name}
          </li>
        </ol>
      </nav>

      {/* Unified #064E4B Editorial Passport Header */}
      <PassportHeader data={data} />

      {/* 2-Column Passport Analytical Grid */}
      <div className="rb-passport-grid">
        <div className="space-y-8 min-w-0">
          <PassportTimeline workOrders={data.workOrders} />
          <PassportMoneyTrail data={data} />
          <PassportContext data={data} />
          <PassportSocialEvidence posts={data.socialCorroboration} />
        </div>

        <div className="space-y-8 min-w-0">
          <PassportActions actions={data.recommendedActions} />
          <PassportLifecycle data={data} />
          <PassportGraph edges={data.evidenceEdges} />
        </div>
      </div>

      {/* High-Trust Municipal Provenance Footer */}
      <footer className="p-5 bg-[var(--card)] rounded-xl border border-[var(--rule)] text-xs text-[var(--mist)] space-y-2 shadow-sm">
        <p>
          <strong className="text-[var(--ink)]">Data Provenance:</strong> {data.provenance.datasetSource} — Engine Version: {data.provenance.algorithmVersion} — Generated: {data.provenance.generatedAt}
        </p>
        <p className="leading-relaxed">
          <strong className="text-[var(--ink)]">Contractual Notice:</strong> {data.provenance.contractualDisclaimer}
        </p>
      </footer>
    </article>
  );
}
