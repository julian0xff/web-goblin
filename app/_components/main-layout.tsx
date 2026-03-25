"use client";

import {
  ArrowClockwiseIcon as ArrowClockwise,
  GlobeIcon as Globe,
  SparkleIcon as Sparkle,
  WarningCircleIcon as WarningCircle,
} from "@phosphor-icons/react";
import { AnalysisProvider, useAnalysis, EXAMPLE_URLS } from "./analysis-context";
import { ThemeEngine } from "./theme-engine";
import { MarketingContent, LoadingSkeleton } from "./style-showcase";
import { ResultsView } from "./goblin-console";
import { HeroIllustration } from "./hero-illustration";

export function MainLayout() {
  return (
    <AnalysisProvider>
      <ThemeEngine />
      <PageContent />
    </AnalysisProvider>
  );
}

function PageContent() {
  const {
    url,
    setUrl,
    analysis,
    isLoading,
    error,
    statusMessage,
    handleSubmit,
    copyText,
  } = useAnalysis();

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top_left,var(--gradient-accent-1,rgba(31,107,83,0.18)),transparent_55%)] transition-all duration-700" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[40vw] bg-[radial-gradient(ellipse_at_center_right,var(--gradient-accent-2,rgba(189,98,54,0.12)),transparent_60%)] transition-all duration-700" />

      <div className="relative mx-auto max-w-[1080px] px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-20">
        {/* Page header */}
        <header className="mb-10 text-center md:mb-14">
          <div
            data-animate
            style={{ "--delay": "0ms" } as React.CSSProperties}
          >
            <HeroIllustration />
          </div>
          <h1
            data-animate
            style={{ "--delay": "80ms" } as React.CSSProperties}
            className="mx-auto mt-4 max-w-[20ch] font-heading text-4xl font-bold tracking-tighter text-[var(--foreground)] sm:text-5xl md:text-[3.75rem] md:leading-[1.08]"
          >
            Steal the{" "}
            <span className="font-mono text-[var(--accent)]">design DNA</span>{" "}
            of any website.
          </h1>
          <p
            data-animate
            style={{ "--delay": "160ms" } as React.CSSProperties}
            className="mx-auto mt-5 max-w-[52ch] text-base leading-7 text-[var(--muted)]"
          >
            Paste a homepage and the goblin extracts palette, fonts, buttons,
            layout metrics, and a prompt-ready style report.
          </p>
        </header>

        {/* Input section */}
        <div className="mx-auto mb-12 max-w-2xl md:mb-16">
          <form
            data-animate
            style={{ "--delay": "240ms" } as React.CSSProperties}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Globe
                  aria-hidden="true"
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                  weight="duotone"
                />
                <input
                  id="website-url"
                  name="website-url"
                  type="text"
                  inputMode="url"
                  placeholder="apple.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-13 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] pl-11 pr-4 text-[15px] text-[var(--foreground)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-[color:var(--muted)]/70 focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/10"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-6 text-sm font-medium text-[var(--paper)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[color:var(--accent)] active:translate-y-[1px] disabled:cursor-wait disabled:opacity-70"
              >
                {isLoading ? (
                  <ArrowClockwise
                    size={18}
                    className="animate-spin"
                    weight="bold"
                  />
                ) : (
                  <Sparkle size={18} weight="duotone" />
                )}
                {isLoading ? "Analyzing" : "Analyze"}
              </button>
            </div>
          </form>

          <div
            data-animate
            style={{ "--delay": "320ms" } as React.CSSProperties}
            className="mt-4 flex flex-wrap justify-center gap-2"
          >
            {EXAMPLE_URLS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setUrl(sample);
                  handleSubmit(sample);
                }}
                className="rounded-full border border-[var(--line)] bg-[color:var(--panel-strong)]/75 px-3 py-2 text-xs tracking-[0.18em] text-[var(--muted)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-[1px]"
              >
                {sample.replace("https://", "")}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--error-line)] bg-[var(--error-soft)] px-4 py-3 text-sm leading-6 text-[var(--error)]">
              <WarningCircle
                aria-hidden="true"
                size={18}
                className="mt-0.5 shrink-0"
                weight="fill"
              />
              <p>{error}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3">
              <ArrowClockwise
                size={16}
                className="animate-spin shrink-0 text-[var(--accent)]"
                weight="bold"
              />
              <p className="text-sm font-medium text-[var(--accent)]">
                Reading{" "}
                {url
                  .replace("https://", "")
                  .replace("http://", "")
                  .split("/")[0]}
                ... extracting palette, fonts, layout.
              </p>
            </div>
          ) : null}

          {statusMessage && !isLoading ? (
            <p className="mt-4 text-center text-sm text-[var(--accent)]">
              {statusMessage}
            </p>
          ) : null}
        </div>

        {/* Content area */}
        {isLoading ? <LoadingSkeleton /> : null}
        {!isLoading && !analysis ? <MarketingContent /> : null}
        {!isLoading && analysis ? (
          <ResultsView
            analysis={analysis}
            onCopyPrompt={() =>
              void copyText(analysis.prompt, "Prompt copied.")
            }
          />
        ) : null}
      </div>
    </main>
  );
}
