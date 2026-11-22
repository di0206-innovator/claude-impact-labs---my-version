export function SceneLifecycle() {
  const stages = [
    {
      num: "1",
      title: "Citizen Intake",
      color: "border-[#DDF4F1]/30",
      items: [
        { code: "1.1", text: "Geotagged photo capture with metadata sanitization" },
        { code: "1.2", text: "Spatial deduplication against existing ward reports" },
        { code: "1.3", text: "Automated ward & road segment association" },
      ],
    },
    {
      num: "2",
      title: "Forensic Screening",
      color: "border-[#E85D4A]",
      items: [
        { code: "2.1", text: "4-rule algorithmic audit against official work orders" },
        { code: "2.2", text: "Rate-card variance and markup verification" },
        { code: "2.3", text: "Defect Liability Period (DLP) warranty active check" },
      ],
    },
    {
      num: "3",
      title: "Fair Accountability",
      color: "border-[#DDF4F1]/30",
      items: [
        { code: "3.1", text: "Weather and flood-adjusted contractor scoring" },
        { code: "3.2", text: "30-day rework and SLA compliance tracking" },
        { code: "3.3", text: "Bayesian shrinkage to prevent small-sample bias" },
      ],
    },
    {
      num: "4",
      title: "Action & Next Rupee",
      color: "border-[#DDF4F1]/30",
      items: [
        { code: "4.1", text: "Algorithmic ranking of critical corridors" },
        { code: "4.2", text: "Evidence-backed ward councillor briefing dossiers" },
        { code: "4.3", text: "Spend-vs-need reallocation modeling" },
      ],
    },
  ];

  return (
    <section className="bg-[#064E4B] text-white py-20 lg:py-28 relative overflow-hidden">
      {/* Hairline subtle background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#DDF4F1]/80 mb-2 font-mono">
            The End-to-End Governance Process
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight">
            Four stages of forensic road governance.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#DDF4F1]/80 leading-relaxed">
            Every step is recorded deterministically in code—from citizen intake through forensic screening to fiscal budget intelligence.
          </p>
        </div>

        {/* Scroll Progress Indicator Bar */}
        <div className="relative mb-12 hidden md:block" aria-hidden="true">
          <div className="h-0.5 w-full bg-white/20" />
          <div className="absolute top-0 left-0 h-0.5 w-1/2 bg-[#E85D4A]" />
          <div className="flex justify-between -mt-2">
            {stages.map((stage) => (
              <div key={stage.num} className="flex flex-col items-center">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#064E4B] border-2 border-white text-[10px] font-mono font-bold">
                  {stage.num}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Stages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stages.map((stage) => (
            <div
              key={stage.num}
              className={`rounded-2xl border ${stage.color} bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10`}
            >
              <div className="flex items-center gap-2 font-mono text-xs text-[#DDF4F1]/90 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 font-bold text-white">
                  {stage.num}
                </span>
                <span className="font-semibold tracking-wider uppercase">{stage.title}</span>
              </div>

              <div className="mt-4 space-y-3 pt-4 border-t border-white/10">
                {stage.items.map((item) => (
                  <div key={item.code} className="text-xs text-white/80 leading-relaxed flex items-start gap-2">
                    <span className="font-mono text-[#DDF4F1] shrink-0 font-medium">{item.code}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
