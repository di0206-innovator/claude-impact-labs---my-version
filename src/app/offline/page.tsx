import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline — Rastabaaz",
  description: "You are currently offline. Reconnect to load live Mumbai road audit data.",
};

export default function OfflinePage() {
  return (
    <article className="shell-narrow rb-page py-12 sm:py-20">
      <div className="rb-editorial-hero text-center space-y-4">
        <div className="inline-flex items-center gap-2 rb-chip-dark">
          <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
          <span>No Network Connection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl">You&apos;re offline right now</h1>
        <p className="rb-editorial-lead mx-auto text-sm sm:text-base">
          Signal dropped on the road. Once your connection returns, reload to submit your pothole report or view live BMC ward ledgers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#E85D4A] px-6 py-3 text-sm font-semibold text-white touch-target"
          >
            Try Again
          </Link>
          <Link
            href="/report"
            className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white touch-target"
          >
            Open Report Form
          </Link>
        </div>
      </div>
    </article>
  );
}
