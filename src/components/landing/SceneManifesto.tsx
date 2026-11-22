export function SceneManifesto() {
  return (
    <section className="bg-white border-b border-[#064E4B]/10 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left sticky typographic reveal */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#064E4B]/70 mb-3 font-mono">
              Civic Commitment
            </div>
            <div className="space-y-6">
              <div className="border-l-2 border-[#064E4B]/20 pl-4 py-1">
                <span className="block text-xs font-mono font-medium text-[#4A6361] uppercase tracking-wider mb-1">
                  We know
                </span>
                <p className="font-serif text-2xl sm:text-3xl text-[#0B2625] leading-snug">
                  The monsoon breaks Mumbai roads every single monsoon.
                </p>
              </div>

              <div className="border-l-2 border-[#E85D4A] pl-4 py-1">
                <span className="block text-xs font-mono font-medium text-[#E85D4A] uppercase tracking-wider mb-1">
                  Our goal
                </span>
                <p className="font-serif text-2xl sm:text-3xl text-[#064E4B] leading-snug font-medium">
                  Ensure every rupee billed corresponds to asphalt laid, tested, and held accountable.
                </p>
              </div>
            </div>

            <p className="mt-8 text-sm text-[#4A6361] leading-relaxed">
              Accountability cannot depend on RTI applications that take months to answer. We bring algorithmic clarity to every tender and contractor payout.
            </p>
          </div>

          {/* Right blur-to-sharp visual card */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#064E4B]/15 bg-[#F7F9F8] p-6 sm:p-8 shadow-sm backdrop-blur-md transition-all duration-500 hover:shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-[#064E4B]/10 text-xs font-mono text-[#064E4B]">
                <span className="font-semibold uppercase tracking-wider">Forensic Standard of Truth</span>
                <span className="rounded-full bg-[#064E4B]/10 px-2.5 py-0.5 text-[11px] font-medium">Section 4 DPDP</span>
              </div>

              <div className="mt-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#064E4B] text-white font-mono text-xs font-bold">
                    01
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0B2625]">No Ghost Repairs</h3>
                    <p className="mt-1 text-sm text-[#4A6361] leading-relaxed">
                      Every completion must link to geotagged citizen reporting coordinates and time-stamped road physical assets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#064E4B] text-white font-mono text-xs font-bold">
                    02
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0B2625]">No Unbacked Markups</h3>
                    <p className="mt-1 text-sm text-[#4A6361] leading-relaxed">
                      Unit rates for cold mix, mastic asphalt, and rapid-hardening concrete are screened against official BMC rate-cards.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E85D4A] text-white font-mono text-xs font-bold">
                    03
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0B2625]">No Silent Warranty Evasion</h3>
                    <p className="mt-1 text-sm text-[#4A6361] leading-relaxed">
                      When a resurfaced road develops potholes during its Defect Liability Period (DLP), the contractor repairs it at zero citizen cost.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-lg bg-white border border-[#064E4B]/10 p-3.5 flex items-center justify-between text-xs font-mono text-[#4A6361]">
                <span>Deterministic Code · Zero Hallucination</span>
                <span className="text-[#064E4B] font-semibold">100% Open Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
