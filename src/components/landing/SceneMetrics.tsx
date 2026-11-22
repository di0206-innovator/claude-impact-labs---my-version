type SceneMetricsProps = {
  wardsCount: number;
  ordersCount: number;
  billedInrFormatted: string;
  flaggedCount: number;
};

export function SceneMetrics({
  wardsCount,
  ordersCount,
  billedInrFormatted,
  flaggedCount,
}: SceneMetricsProps) {
  return (
    <section className="bg-[#F7F9F8] border-b border-[#064E4B]/10 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#064E4B]/70 mb-2 font-mono">
            Forensic Cross-Section &amp; Metrics
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#0B2625] font-normal tracking-tight">
            Mumbai Road Cross-Section &amp; Rupee Trail
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4A6361] leading-relaxed">
            Every millimeter of repaired asphalt leaves an administrative trail. We map citizen reports to contractor bills and warranty obligations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Frosted Glass Road Cross-Section SVG Card */}
          <div className="lg:col-span-7 rounded-2xl border border-[#064E4B]/15 bg-white/90 p-6 sm:p-8 shadow-sm backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between text-xs font-mono text-[#064E4B]">
              <span className="font-semibold uppercase tracking-wider">Pavement Structural Anatomy</span>
              <span className="text-[#4A6361]">IRC:37-2018 Standard</span>
            </div>

            <svg viewBox="0 0 540 220" className="w-full h-auto" fill="none">
              {/* Layer 1: Wear Course */}
              <rect x="10" y="20" width="520" height="35" rx="4" fill="#1D272D" />
              <text x="25" y="42" fill="#FFFFFF" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">
                Bituminous Concrete Surface Course (40mm)
              </text>
              <text x="440" y="42" fill="#E85D4A" fontSize="10" fontFamily="var(--font-mono)">
                DLP Monitored
              </text>

              {/* Layer 2: Binder Course */}
              <rect x="10" y="60" width="520" height="40" rx="4" fill="#2C3940" />
              <text x="25" y="85" fill="#E2E8F0" fontSize="11" fontFamily="var(--font-mono)">
                Dense Bituminous Macadam Binder (50mm)
              </text>
              <text x="430" y="85" fill="#DDF4F1" fontSize="10" fontFamily="var(--font-mono)">
                Rate-Card Verified
              </text>

              {/* Layer 3: Base Course */}
              <rect x="10" y="105" width="520" height="45" rx="4" fill="#3E4F59" />
              <text x="25" y="132" fill="#CBD5E1" fontSize="11" fontFamily="var(--font-mono)">
                Wet Mix Macadam Base Course (250mm)
              </text>
              <text x="445" y="132" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">
                Tender Item
              </text>

              {/* Layer 4: Sub-base */}
              <rect x="10" y="155" width="520" height="45" rx="4" fill="#526571" />
              <text x="25" y="182" fill="#F1F5F9" fontSize="11" fontFamily="var(--font-mono)">
                Granular Sub-Base Drainage Layer (150mm)
              </text>
              <text x="440" y="182" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">
                Foundation
              </text>

              {/* Forensic rupee audit trail flow overlay */}
              <path d="M 40 10 L 160 10 L 320 10 L 480 10" stroke="#E85D4A" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="40" cy="10" r="4" fill="#E85D4A" />
              <circle cx="200" cy="10" r="4" fill="#E85D4A" />
              <circle cx="360" cy="10" r="4" fill="#E85D4A" />
              <circle cx="500" cy="10" r="4" fill="#E85D4A" />
            </svg>

            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[#4A6361] border-t border-[#064E4B]/10 pt-3">
              <span>Trail: [Geotag] → [Work Order] → [Rate Card] → [Warranty Lock]</span>
              <span className="font-mono text-[#064E4B] font-medium">100% Deterministic Code</span>
            </div>
          </div>

          {/* Hairline KPI Stack */}
          <div className="lg:col-span-5 flex flex-col divide-y divide-[#064E4B]/15">
            <div className="py-5 first:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-semibold text-[#064E4B] tracking-tight">
                {wardsCount}
              </div>
              <div className="text-sm font-semibold text-[#0B2625] mt-1">Administrative Wards Audited</div>
              <div className="text-xs text-[#4A6361] mt-0.5">All 24 BMC zones from A (Colaba) to T (Mulund)</div>
            </div>

            <div className="py-5">
              <div className="font-mono text-3xl sm:text-4xl font-semibold text-[#064E4B] tracking-tight">
                {ordersCount.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-[#0B2625] mt-1">Work Orders Reconciled</div>
              <div className="text-xs text-[#4A6361] mt-0.5">Monsoon emergency repair records tracked in database</div>
            </div>

            <div className="py-5">
              <div className="font-mono text-3xl sm:text-4xl font-semibold text-[#064E4B] tracking-tight">
                {billedInrFormatted}
              </div>
              <div className="text-sm font-semibold text-[#0B2625] mt-1">Total Repair Spend Billed</div>
              <div className="text-xs text-[#4A6361] mt-0.5">Contractor bills recorded across city road network</div>
            </div>

            <div className="py-5 last:pb-0">
              <div className="font-mono text-3xl sm:text-4xl font-semibold text-[#E85D4A] tracking-tight">
                {flaggedCount}
              </div>
              <div className="text-sm font-semibold text-[#0B2625] mt-1">Forensic Audit Flags Raised</div>
              <div className="text-xs text-[#4A6361] mt-0.5">Over-rate, duplicate, or DLP warranty screening warnings</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
