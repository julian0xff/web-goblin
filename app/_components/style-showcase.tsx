"use client";

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm leading-7 text-[var(--foreground)]">
      <span className="h-px w-3.5 shrink-0 bg-[var(--accent)] opacity-50" />
      {children}
    </li>
  );
}

export function MarketingContent() {
  return (
    <div className="space-y-8">
      <div
        data-animate
        style={{ "--delay": "400ms" } as React.CSSProperties}
        className="grid gap-5 sm:grid-cols-2"
      >
        <article className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            What it pulls
          </p>
          <ul className="mt-4 space-y-3">
            <FeatureItem>Palette balance and likely accent colors</FeatureItem>
            <FeatureItem>Font stacks and display-body pairing</FeatureItem>
            <FeatureItem>
              Button radius, shadow weight, and header treatment
            </FeatureItem>
            <FeatureItem>
              Layout width, spacing rhythm, and page sections
            </FeatureItem>
          </ul>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[color:var(--accent-soft)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            What you do after
          </p>
          <ul className="mt-4 space-y-3">
            <FeatureItem>Share a compact design card</FeatureItem>
            <FeatureItem>Copy a prompt for Codex or Claude</FeatureItem>
            <FeatureItem>Compare references before you build</FeatureItem>
            <FeatureItem>Export structured style notes</FeatureItem>
          </ul>
        </article>
      </div>

      <aside
        data-animate
        style={{ "--delay": "500ms" } as React.CSSProperties}
        className="rounded-2xl border border-[var(--line)] bg-[color:var(--ink)] p-6 text-[color:var(--paper)] shadow-[0_18px_40px_-20px_rgba(20,18,14,0.7)]"
      >
        <p className="text-xs uppercase tracking-[0.26em] text-[rgba(247,242,233,0.54)]">
          Goblin instincts
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="font-heading text-[2.5rem] font-bold leading-none tracking-tighter text-[var(--paper)]">
              01
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(247,242,233,0.7)]">
              Reads the front door first, then follows linked stylesheets for
              stronger signals.
            </p>
          </div>
          <div className="border-t border-white/10 pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="font-heading text-[2.5rem] font-bold leading-none tracking-tighter text-[var(--paper)]">
              02
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(247,242,233,0.7)]">
              Labels the vibe in plain language instead of dumping raw CSS noise.
            </p>
          </div>
          <div className="border-t border-white/10 pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="font-heading text-[2.5rem] font-bold leading-none tracking-tighter text-[var(--paper)]">
              03
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(247,242,233,0.7)]">
              Writes a reusable prompt so you can rebuild the atmosphere, not the
              exact site.
            </p>
          </div>
        </div>
      </aside>

      <div
        data-animate
        style={{ "--delay": "580ms" } as React.CSSProperties}
        className="grid gap-4 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)] md:grid-cols-2"
      >
        <p>
          Built for designers, frontend devs, and the very specific kind of
          person who inspects a button radius before reading the headline.
        </p>
        <p className="md:text-right">
          Web Goblin reads style patterns. It does not try to recreate logos,
          copy, or brand identity.
        </p>
      </div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-6">
        <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--skeleton)]" />
        <div className="mt-4 h-7 w-[60%] animate-pulse rounded-xl bg-[var(--skeleton)]" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[var(--skeleton)]" />
        <div className="mt-2 h-4 w-[85%] animate-pulse rounded-full bg-[var(--skeleton)]" />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`tag-${i}`}
              className="h-7 w-20 animate-pulse rounded-full bg-[var(--skeleton)]"
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-6">
        <div className="h-3 w-16 animate-pulse rounded-full bg-[var(--skeleton)]" />
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`swatch-${i}`}
              className="h-20 animate-pulse rounded-xl bg-[var(--skeleton)]"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-6">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--skeleton)]" />
          <div className="mt-5 space-y-3">
            <div className="h-8 w-[80%] animate-pulse rounded-xl bg-[var(--skeleton)]" />
            <div className="h-6 w-[60%] animate-pulse rounded-lg bg-[var(--skeleton)]" />
            <div className="h-5 w-[50%] animate-pulse rounded-lg bg-[var(--skeleton)]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-[var(--skeleton)]" />
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-6">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--skeleton)]" />
          <div className="mt-5 space-y-3">
            <div className="flex gap-3">
              <div className="h-10 w-28 animate-pulse rounded-xl bg-[var(--skeleton)]" />
              <div className="h-10 w-24 animate-pulse rounded-xl bg-[var(--skeleton)]" />
            </div>
            <div className="h-28 animate-pulse rounded-xl bg-[var(--skeleton)]" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--skeleton)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
