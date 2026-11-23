import Link from "next/link";

type SceneHeroProps = {
  wardsCount: number;
  ordersCount: number;
  billedInrFormatted: string;
  flaggedCount: number;
};

export function SceneHero({
  wardsCount,
  ordersCount,
  billedInrFormatted,
  flaggedCount,
}: SceneHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#064E4B] text-white pt-12 pb-12 sm:pt-20 sm:pb-16 lg:pt-28 lg:pb-24">
      {/* Concentric topographic parallax rings SVG */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30 rb-parallax-slow"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1000 1000"
          className="h-[140%] w-[140%] max-w-none animate-spin-extremely-slow"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="500" cy="500" r="160" stroke="rgba(221, 244, 241, 0.12)" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle cx="500" cy="500" r="260" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
          <circle cx="500" cy="500" r="360" stroke="rgba(221, 244, 241, 0.14)" strokeWidth="1.5" strokeDasharray="12 8" />
          <circle cx="500" cy="500" r="460" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
          <circle cx="500" cy="500" r="560" stroke="rgba(221, 244, 241, 0.06)" strokeWidth="1.5" strokeDasharray="4 8" />
          <circle cx="500" cy="500" r="660" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium tracking-wide uppercase text-[#DDF4F1] backdrop-blur-md">
            <span className="rb-pulse-vermilion" aria-hidden="true" />
            <span>BMC Monsoon Road Repair Accountability</span>
          </div>

          {/* Serif H1 */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] tracking-tight text-white mb-6">
            Road accountability isn&apos;t promised. It&apos;s audited.
          </h1>

          {/* Editorial lead */}
          <p className="text-lg sm:text-xl text-[#DDF4F1]/90 leading-relaxed max-w-2xl mb-10 font-sans">
            Photograph a pothole, waterlogging or open manhole in Mumbai. Your report joins the ward&apos;s repair money trail.
          </p>

          {/* Immediate Dual CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-14">
            <Link
              href="/report"
              className="inline-flex items-center justify-center rounded-full bg-[#E85D4A] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#E85D4A]/25 transition-all hover:bg-[#d84e3b] hover:shadow-xl active:scale-95"
            >
              Report a Pothole
            </Link>
            <Link
              href="/wards"
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/50 active:scale-95"
            >
              Inspect Your Ward →
            </Link>
          </div>
        </div>

        {/* Live dataset headline bar */}
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-mono text-[#DDF4F1]">
              <span className="h-2 w-2 rounded-full bg-[#E85D4A]" />
              <span className="tracking-wider uppercase font-semibold">Live Audited Dataset</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-8 font-mono text-white">
              <div>
                <span className="text-white/60">Wards: </span>
                <span className="font-semibold text-white">{wardsCount}</span>
              </div>
              <div className="hidden sm:block text-white/30">|</div>
              <div>
                <span className="text-white/60">Work Orders: </span>
                <span className="font-semibold text-white">{ordersCount.toLocaleString()}</span>
              </div>
              <div className="hidden sm:block text-white/30">|</div>
              <div>
                <span className="text-white/60">Billed: </span>
                <span className="font-semibold text-[#DDF4F1]">{billedInrFormatted}</span>
              </div>
              <div className="hidden sm:block text-white/30">|</div>
              <div>
                <span className="text-white/60">Flagged: </span>
                <span className="font-semibold text-[#E85D4A]">{flaggedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
