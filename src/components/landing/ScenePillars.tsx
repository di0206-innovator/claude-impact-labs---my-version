export function ScenePillars() {
  const pillars = [
    {
      title: "COMPLAINT-TO-RUPEE TRAIL",
      description:
        "Citizen photo reports are linked directly to BMC SAP work order IDs. We verify whether emergency pothole fixes were physically executed or simply billed.",
      metric: "100% Geotagged Reconciliation",
    },
    {
      title: "DLP & RATE-CARD AUDIT",
      description:
        "Automated screening flags duplicate bills, 7-day clustering anomalies, and unauthorized billings on roads still covered under contractor defect liability warranty.",
      metric: "4 Algorithmic Audits",
    },
    {
      title: "FAIR CONTRACTOR SCORING",
      description:
        "Contractors are scored with empirical Bayesian shrinkage and rainfall-adjusted models, ensuring fair evaluations regardless of flood-prone geography.",
      metric: "Weather-Adjusted Rework Rates",
    },
    {
      title: "NEXT-RUPEE BUDGET ENGINE",
      description:
        "Data-driven fiscal intelligence guides where the next rupee should be deployed to prevent recurring potholes before the heavy monsoon deluge hits.",
      metric: "Corridor Need Optimization",
    },
  ];

  return (
    <section className="bg-[#F7F9F8] border-b border-[#064E4B]/10 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#064E4B]/70 mb-2 font-mono">
            Civic Engine Architecture
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#0B2625] font-normal tracking-tight">
            Forensically audited, built for Mumbai.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4A6361] leading-relaxed">
            Four deterministic pillars ensuring transparency from citizen photo upload to municipal budget reallocation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* 4 Pillars List */}
          <div className="lg:col-span-7 space-y-6">
            {pillars.map((pillar, idx) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-[#064E4B]/15 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#064E4B]/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="rb-pulse-vermilion" aria-hidden="true" />
                    <h3 className="font-mono text-sm font-semibold tracking-wider text-[#064E4B]">
                      {pillar.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#4A6361] bg-[#F7F9F8] px-2.5 py-0.5 rounded border border-[#064E4B]/10">
                    0{idx + 1}
                  </span>
                </div>
                <p className="text-sm text-[#4A6361] leading-relaxed mb-3">
                  {pillar.description}
                </p>
                <div className="text-xs font-mono font-medium text-[#064E4B]/80 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#064E4B]" />
                  <span>{pillar.metric}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Rotating Circular Mumbai Corridor SVG Diagram */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative flex items-center justify-center h-80 w-80 sm:h-96 sm:w-96 rounded-full border border-[#064E4B]/15 bg-white p-4 shadow-sm">
              {/* Rotating outer ring */}
              <svg
                viewBox="0 0 360 360"
                className="absolute inset-0 h-full w-full animate-spin-extremely-slow pointer-events-none"
                fill="none"
              >
                <circle cx="180" cy="180" r="170" stroke="rgba(6, 78, 75, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
                <circle cx="180" cy="180" r="140" stroke="rgba(6, 78, 75, 0.2)" strokeWidth="1" />
                <circle cx="180" cy="180" r="105" stroke="rgba(232, 93, 74, 0.3)" strokeWidth="1.5" strokeDasharray="8 6" />

                {/* Corridor Markers */}
                <circle cx="180" cy="10" r="5" fill="#E85D4A" />
                <text x="180" y="28" fill="#064E4B" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">
                  WEH · HIGHWAY
                </text>

                <circle cx="350" cy="180" r="5" fill="#064E4B" />
                <text x="315" y="184" fill="#064E4B" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">
                  EEH
                </text>

                <circle cx="180" cy="350" r="5" fill="#064E4B" />
                <text x="180" y="340" fill="#064E4B" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">
                  S.V. ROAD
                </text>

                <circle cx="10" cy="180" r="5" fill="#064E4B" />
                <text x="45" y="184" fill="#064E4B" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">
                  LBS MARG
                </text>
              </svg>

              {/* Central static hub */}
              <div className="z-10 flex flex-col items-center justify-center text-center p-6 rounded-full bg-[#064E4B] text-white h-44 w-44 shadow-md">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#DDF4F1]/70">
                  MUMBAI
                </span>
                <span className="font-serif text-lg font-medium text-white my-0.5">
                  Arterial Grid
                </span>
                <span className="text-[10px] font-mono text-[#DDF4F1]/90">
                  24 Wards Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
