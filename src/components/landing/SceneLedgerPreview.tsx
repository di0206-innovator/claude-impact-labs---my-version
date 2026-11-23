import Link from "next/link";
import { formatInrShort } from "@/lib/rupee";
import { pct, wardSlug } from "@/lib/rupee/slug";

type WardItem = {
  code: string;
  name: string;
  budgetInr: number;
  spentInr: number;
  outcome: { heldInr: number; failedInr: number; flaggedInr: number };
  flagCount: number;
  reopenRate: number;
};

type SceneLedgerPreviewProps = {
  wards: WardItem[];
};

export function SceneLedgerPreview({ wards }: SceneLedgerPreviewProps) {
  const topWards = wards.slice(0, 6);

  return (
    <section className="bg-[#F7F9F8] border-b border-[#064E4B]/10 py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#064E4B]/70 mb-2 font-mono">
              Live Municipal Repair Ledger
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#0B2625] font-normal tracking-tight">
              Live Mumbai Ward Ledger
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#4A6361]">
              Top wards by repair expenditure, audit flags, and 30-day rework rates.
            </p>
          </div>

          <Link
            href="/wards"
            className="inline-flex items-center gap-2 rounded-full border border-[#064E4B]/20 bg-white px-5 py-2.5 text-xs font-semibold text-[#064E4B] shadow-sm hover:bg-[#064E4B] hover:text-white transition-all self-start md:self-auto"
          >
            <span>View All 24 Wards</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Alabaster Hairline Table */}
        <div className="overflow-hidden rounded-xl border border-[#064E4B]/15 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F7F9F8] border-b border-[#064E4B]/15 font-mono text-xs uppercase tracking-wider text-[#4A6361]">
                <tr>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 font-semibold">Ward</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 font-semibold">Localities</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 font-semibold text-right">Billed</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 font-semibold text-center">Flags</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 font-semibold text-right">30-Day Reopen</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#064E4B]/10">
                {topWards.map((ward) => (
                  <tr key={ward.code} className="hover:bg-[#F7F9F8]/60 transition-colors">
                    <td className="py-3.5 px-3 sm:px-6 font-mono font-bold text-[#064E4B] whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded bg-[#064E4B]/10 px-2 py-0.5 text-xs">
                        Ward {ward.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 sm:px-6 text-[#0B2625] font-medium max-w-[160px] truncate sm:max-w-none">
                      {ward.name}
                    </td>
                    <td className="py-3.5 px-3 sm:px-6 font-mono text-right text-[#0B2625] font-semibold whitespace-nowrap">
                      {formatInrShort(ward.spentInr)}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center font-mono">
                      {ward.flagCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E85D4A]/10 px-2 py-0.5 text-xs font-semibold text-[#E85D4A]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E85D4A]" />
                          {ward.flagCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#0E7C66]/10 px-2 py-0.5 text-xs font-semibold text-[#0E7C66]">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-right text-[#4A6361]">
                      {pct(ward.reopenRate)}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <Link
                        href={`/wards/${wardSlug(ward.code)}`}
                        className="font-medium text-[#064E4B] hover:text-[#043937] hover:underline"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
