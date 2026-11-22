import Link from "next/link";

export function SceneInsights() {
  return (
    <section className="bg-white py-20 lg:py-28 border-b border-[#064E4B]/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#064E4B]/70 mb-2 font-mono">
            Civic Exploration Tools
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#0B2625] font-normal tracking-tight">
            Audit tools built for citizens &amp; councillors.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4A6361] leading-relaxed">
            Three forensic lenses to inspect municipal contractors, ask plain-language questions, and redirect future capital.
          </p>
        </div>

        {/* Three Tall Alternating Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: White */}
          <div className="rounded-2xl border border-[#064E4B]/15 bg-white p-7 sm:p-8 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-[#064E4B]/30">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#064E4B]/70">
                Forensic Audit
              </span>
              <h3 className="font-serif text-2xl text-[#0B2625] font-normal mt-3 mb-3">
                Contractor Audit &amp; Risk Flags
              </h3>
              <p className="text-sm text-[#4A6361] leading-relaxed">
                Screening for rate-card markups, duplicate work orders, and repairs billed on roads under warranty.
              </p>
            </div>
            <Link
              href="/accountability"
              className="mt-8 inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#064E4B] hover:text-[#043937]"
            >
              <span>Inspect Audit Flags</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Card 2: Deep Teal */}
          <div className="rounded-2xl border border-[#043937] bg-[#064E4B] text-white p-7 sm:p-8 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-white/30">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#DDF4F1]/70">
                AI Civic Console
              </span>
              <h3 className="font-serif text-2xl text-white font-normal mt-3 mb-3">
                Conversational Assistant
              </h3>
              <p className="text-sm text-[#DDF4F1]/85 leading-relaxed">
                Ask plain-language questions to analyze contractor performance, ward budgets, and road passports.
              </p>
            </div>
            <Link
              href="/assistant"
              className="mt-8 inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#DDF4F1] hover:text-white"
            >
              <span>Query Assistant</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Card 3: Mint */}
          <div className="rounded-2xl border border-[#064E4B]/20 bg-[#DDF4F1] text-[#064E4B] p-7 sm:p-8 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-[#064E4B]/40">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#064E4B]/70">
                Budget Optimization
              </span>
              <h3 className="font-serif text-2xl text-[#064E4B] font-normal mt-3 mb-3">
                Spend vs. Need Engine
              </h3>
              <p className="text-sm text-[#4A6361] leading-relaxed">
                Compare ward repair allocations against pothole distress and traffic density to optimize the next rupee.
              </p>
            </div>
            <Link
              href="/spend-vs-need"
              className="mt-8 inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#064E4B] hover:text-[#043937]"
            >
              <span>Explore Spend vs. Need</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Mint Split CTA Band */}
        <div className="mt-16 rounded-2xl bg-[#DDF4F1] border border-[#064E4B]/15 p-8 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
          <div className="max-w-xl">
            <h3 className="font-serif text-2xl sm:text-3xl text-[#064E4B] font-normal tracking-tight">
              Ready to hold your ward accountable?
            </h3>
            <p className="mt-2 text-sm text-[#4A6361]">
              Submit a photo from your neighborhood or explore all active road reports on the city map.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="#report-entry"
              className="inline-flex items-center justify-center rounded-full bg-[#E85D4A] px-6 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-white shadow hover:bg-[#d84e3b] transition-all"
            >
              Report a Pothole
            </a>
            <Link
              href="/map"
              className="inline-flex items-center justify-center rounded-full border border-[#064E4B]/20 bg-white/80 px-6 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-[#064E4B] hover:bg-white transition-all"
            >
              View City Map →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
