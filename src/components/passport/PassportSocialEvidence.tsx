import type { SocialPostSummary } from "@/lib/passport/types";

export type PassportSocialEvidenceProps = {
  posts: SocialPostSummary[];
  className?: string;
};

export function PassportSocialEvidence({ posts, className = "" }: PassportSocialEvidenceProps) {
  const highDistressCount = posts.filter(
    (p) => p.likes > 200 || /accident|gaddha|gadha|khadda|dhas|collapse|waterlog|paani/i.test(p.text),
  ).length;

  return (
    <section className={`bg-[var(--card)] rounded-xl border border-[var(--rule)] p-5 shadow-[var(--card-shadow)] space-y-4 ${className}`} aria-labelledby="social-evidence-heading">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rb-chip rb-chip-neutral">Crowdsourced Corroboration</span>
          <span className="rb-chip rb-chip-neutral">{posts.length} Matched Report{posts.length === 1 ? "" : "s"}</span>
          {highDistressCount > 0 && (
            <span className="rb-chip rb-chip-failed">{highDistressCount} High Distress Signal{highDistressCount === 1 ? "" : "s"}</span>
          )}
        </div>
        <h2 id="social-evidence-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Citizen Social Evidence & WhatsApp Reports
        </h2>
        <p className="ux4g-body-s-default text-[var(--mist)]">
          Real-time civic distress reports matched from municipal WhatsApp ALM groups and public channels.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-[var(--rule)] bg-[var(--sheet)] text-[var(--mist)] text-xs">
          No civic social distress posts or WhatsApp reports matched this specific road corridor.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {posts.map((post) => {
            const isHighDistress =
              post.likes > 200 ||
              /accident|gaddha|gadha|khadda|dhas|collapse|waterlog|paani/i.test(post.text);

            return (
              <article
                key={post.id}
                className={`p-3.5 rounded-lg border text-xs transition-colors ${
                  isHighDistress
                    ? "border-[var(--failed-border)] bg-[var(--failed-bg)]"
                    : "border-[var(--rule)] bg-[var(--sheet)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--ink)] px-2 py-0.5 rounded bg-[var(--card)] border border-[var(--rule)]">
                      {post.source}
                    </span>
                    {post.hasMedia && (
                      <span className="inline-flex items-center gap-1 text-[var(--mist)] font-medium">
                        <span aria-hidden="true">📷</span> Photo Attached
                      </span>
                    )}
                    {isHighDistress && (
                      <span className="rb-chip rb-chip-failed text-[0.625rem]">High Distress</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[var(--mist)]">
                    <span className="font-mono font-bold text-[var(--ink)]">{post.likes}</span>
                    <span>likes/forwards</span>
                    <span>·</span>
                    <time dateTime={post.postedAt}>{post.postedAt}</time>
                  </div>
                </div>

                <p className="text-[var(--ink)] leading-relaxed font-sans">{post.text}</p>
              </article>
            );
          })}
        </div>
      )}

      <footer className="text-[0.6875rem] text-[var(--mist)] pt-2 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-2">
        <span>* Citizen Social Signals: Public corroboration for municipal engineers and auditors.</span>
        <span className="font-mono text-[var(--enamel)]">DPDP-compliant synthetic records</span>
      </footer>
    </section>
  );
}
export default PassportSocialEvidence;
