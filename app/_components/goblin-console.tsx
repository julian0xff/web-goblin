"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import {
  ArrowSquareOutIcon as ArrowSquareOut,
  CopyIcon as Copy,
  GlobeIcon as Globe,
  MagicWandIcon as MagicWand,
  PaletteIcon as Palette,
  ShareNetworkIcon as ShareNetwork,
  SparkleIcon as Sparkle,
  TextTIcon as TextT,
  XLogoIcon as XLogo,
} from "@phosphor-icons/react";
import type { WebsiteAnalysis } from "@/lib/site-analysis";

// ─── Main Results View ─────────────────────────────────────────

export function ResultsView({
  analysis,
  onCopyPrompt,
}: {
  analysis: WebsiteAnalysis;
  onCopyPrompt: () => void;
}) {
  return (
    <div className="space-y-6">
      <ResultHeader analysis={analysis} onCopyPrompt={onCopyPrompt} />
      <PaletteSection analysis={analysis} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TypographySection analysis={analysis} />
        <ControlsSection analysis={analysis} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LayoutSection analysis={analysis} />
        <NavigationSection analysis={analysis} />
      </div>
      <SectionsBlock analysis={analysis} />
      <PromptSection analysis={analysis} onCopy={onCopyPrompt} />
    </div>
  );
}

// ─── Result Header ─────────────────────────────────────────────

function ResultHeader({
  analysis,
  onCopyPrompt,
}: {
  analysis: WebsiteAnalysis;
  onCopyPrompt: () => void;
}) {
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  const generateCardAndShare = useCallback(async () => {
    setIsGeneratingCard(true);
    try {
      const bgColor =
        analysis.palette.find((s) => s.role === "background")?.hex ?? "";
      const fgColor =
        analysis.palette.find((s) => s.role === "foreground")?.hex ??
        analysis.palette.find((s) => s.role === "text")?.hex ??
        "";
      const accentColor =
        analysis.palette.find((s) => s.role === "accent")?.hex ??
        analysis.palette.find((s) => s.role === "primary")?.hex ??
        "";
      const params = new URLSearchParams({
        host: analysis.host,
        title: analysis.title,
        summary: analysis.summary,
        tags: analysis.tags.join(","),
        palette: analysis.palette.map((s) => s.hex).join(","),
        paletteRoles: analysis.palette.map((s) => s.role).join(","),
        fontDisplay: analysis.fonts.display,
        fontBody: analysis.fonts.body,
        layout: analysis.layout.structure,
        spacing: analysis.layout.spacing,
        buttons: analysis.buttons.label,
        header: analysis.header.label,
        ...(bgColor && { bg: bgColor }),
        ...(fgColor && { fg: fgColor }),
        ...(accentColor && { accentColor }),
      });

      const cardUrl = `${window.location.origin}/api/card?${params.toString()}`;
      const intentUrl = new URL("https://twitter.com/intent/tweet");
      const tweetText = `Web Goblin analyzed ${analysis.host} and found: ${analysis.tags.join(", ")}.\n\nCheck the design DNA breakdown:`;
      intentUrl.searchParams.set("text", tweetText);
      intentUrl.searchParams.set("url", cardUrl);
      window.open(intentUrl.toString(), "_blank", "noopener,noreferrer");
    } finally {
      setIsGeneratingCard(false);
    }
  }, [analysis]);

  const downloadCard = useCallback(async () => {
    setIsGeneratingCard(true);
    try {
      const bgColor =
        analysis.palette.find((s) => s.role === "background")?.hex ?? "";
      const fgColor =
        analysis.palette.find((s) => s.role === "foreground")?.hex ??
        analysis.palette.find((s) => s.role === "text")?.hex ??
        "";
      const accentColor =
        analysis.palette.find((s) => s.role === "accent")?.hex ??
        analysis.palette.find((s) => s.role === "primary")?.hex ??
        "";
      const params = new URLSearchParams({
        host: analysis.host,
        title: analysis.title,
        summary: analysis.summary,
        tags: analysis.tags.join(","),
        palette: analysis.palette.map((s) => s.hex).join(","),
        paletteRoles: analysis.palette.map((s) => s.role).join(","),
        fontDisplay: analysis.fonts.display,
        fontBody: analysis.fonts.body,
        layout: analysis.layout.structure,
        spacing: analysis.layout.spacing,
        buttons: analysis.buttons.label,
        header: analysis.header.label,
        ...(bgColor && { bg: bgColor }),
        ...(fgColor && { fg: fgColor }),
        ...(accentColor && { accentColor }),
      });

      const response = await fetch(`/api/card?${params.toString()}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `web-goblin-${analysis.host}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingCard(false);
    }
  }, [analysis]);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="uppercase tracking-[0.24em] text-[var(--accent)]">
          Fresh read
        </span>
        <span className="rounded-full border border-[var(--line)] px-2 py-1 uppercase tracking-[0.22em] text-[var(--muted)]">
          {analysis.host}
        </span>
        {analysis.analysisVersion === 2 && (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 uppercase tracking-[0.22em] text-[var(--accent)]">
            V2
          </span>
        )}
      </div>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
        {analysis.title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
        {analysis.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {analysis.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--accent)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ActionButton
          icon={<Copy size={16} weight="bold" />}
          onClick={onCopyPrompt}
        >
          Copy prompt
        </ActionButton>
        <ActionButton
          icon={<XLogo size={16} weight="bold" />}
          onClick={() => void generateCardAndShare()}
          disabled={isGeneratingCard}
        >
          Share on X
        </ActionButton>
        <ActionButton
          icon={<ShareNetwork size={16} weight="bold" />}
          onClick={() => void downloadCard()}
          disabled={isGeneratingCard}
        >
          Download card
        </ActionButton>
        <a
          href={analysis.normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm font-medium text-[var(--foreground)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-[1px]"
        >
          <ArrowSquareOut size={16} weight="bold" />
          <span className="hidden sm:inline">Open site</span>
        </a>
      </div>
    </section>
  );
}

// ─── Palette ───────────────────────────────────────────────────

function PaletteSection({ analysis }: { analysis: WebsiteAnalysis }) {
  return (
    <InspectorCard
      label="Palette"
      icon={<Palette size={16} weight="duotone" />}
      hint={`${analysis.palette.length} swatches`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {analysis.palette.map((swatch) => (
          <div
            key={swatch.hex}
            className="overflow-hidden rounded-xl border border-[var(--line)]"
          >
            <div
              className="h-14 border-b border-black/5"
              style={{ backgroundColor: swatch.hex }}
            />
            <div className="px-3 py-2">
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {swatch.role}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--foreground)]">
                {swatch.hex}
              </p>
            </div>
          </div>
        ))}
      </div>
    </InspectorCard>
  );
}

// ─── Typography ────────────────────────────────────────────────

function TypographySection({ analysis }: { analysis: WebsiteAnalysis }) {
  const cs = analysis.componentStyles;

  const h1Size = cs?.h1?.fontSizePx
    ? `${Math.round(cs.h1.fontSizePx)}px`
    : null;
  const h2Size = cs?.h2?.fontSizePx
    ? `${Math.round(cs.h2.fontSizePx)}px`
    : null;
  const h3Size = cs?.h3?.fontSizePx
    ? `${Math.round(cs.h3.fontSizePx)}px`
    : null;
  const h1Weight = cs?.h1?.fontWeight ?? 700;
  const h2Weight = cs?.h2?.fontWeight ?? 600;
  const h3Weight = cs?.h3?.fontWeight ?? 600;
  const bodySize = cs?.body?.fontSizePx
    ? `${Math.round(cs.body.fontSizePx)}px`
    : null;
  const bodyLh = cs?.body?.lineHeightRatio ?? 1.75;

  return (
    <InspectorCard
      label="Typography"
      icon={<TextT size={16} weight="duotone" />}
      hint={
        analysis.analysisVersion === 2
          ? "Per-role resolved"
          : "Font stacks and sizing"
      }
    >
      {/* Live preview */}
      <div className="mb-5 space-y-3 border-b border-[var(--line)] pb-5">
        <div className="flex items-baseline gap-3">
          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
            H1
          </span>
          <span
            className="tracking-tighter text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-display, inherit)",
              fontSize: h1Size ?? "clamp(1.5rem, 3.5vw, 2.25rem)",
              fontWeight: h1Weight,
              letterSpacing:
                cs?.h1?.letterSpacingPx != null
                  ? `${cs.h1.letterSpacingPx}px`
                  : undefined,
            }}
          >
            Page headline
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
            H2
          </span>
          <span
            className="tracking-tight text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-display, inherit)",
              fontSize: h2Size ?? "clamp(1.25rem, 2.5vw, 1.75rem)",
              fontWeight: h2Weight,
            }}
          >
            Section heading
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
            H3
          </span>
          <span
            className="tracking-tight text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-display, inherit)",
              fontSize: h3Size ?? "1.125rem",
              fontWeight: h3Weight,
            }}
          >
            Subsection heading
          </span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1 shrink-0 font-mono text-[10px] text-[var(--muted)]">
            p
          </span>
          <p
            className="text-[var(--muted)]"
            style={{
              fontFamily: "var(--font-body, inherit)",
              fontSize: bodySize ?? "1rem",
              lineHeight: bodyLh,
            }}
          >
            Body text rendered in the extracted font, showing line height and
            readability.
          </p>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
            a
          </span>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-[var(--accent)] underline underline-offset-4"
            style={{ fontFamily: "var(--font-body, inherit)" }}
          >
            Inline link style
          </a>
        </div>
      </div>

      {/* Spec data */}
      <div className="space-y-2.5">
        <SpecRow label="Display" value={analysis.fonts.display} />
        <SpecRow label="Body" value={analysis.fonts.body} />
        <SpecRow label="Mono" value={analysis.fonts.mono} />
        <SpecRow label="H1 size" value={analysis.fonts.headingSize} />
        <SpecRow label="Body size" value={analysis.fonts.bodySize} />
        <SpecRow label="Line-H" value={analysis.fonts.lineHeight} />
        {cs?.h1?.fontWeight != null && (
          <SpecRow label="H1 weight" value={String(cs.h1.fontWeight)} />
        )}
        {cs?.body?.letterSpacingPx != null && (
          <SpecRow
            label="Body ltr-sp"
            value={`${cs.body.letterSpacingPx.toFixed(1)}px`}
          />
        )}
      </div>
    </InspectorCard>
  );
}

// ─── Controls ──────────────────────────────────────────────────

function ControlsSection({ analysis }: { analysis: WebsiteAnalysis }) {
  const cs = analysis.componentStyles;
  const accentHex =
    analysis.palette.find((s) => s.role === "accent")?.hex ?? "var(--accent)";

  const btnHeight = cs?.buttonPrimary?.heightPx
    ? `${Math.round(cs.buttonPrimary.heightPx)}px`
    : analysis.buttons.height !== "Around 40px"
      ? analysis.buttons.height
      : "2.75rem";
  const btnRadius =
    cs?.buttonPrimary?.borderRadiusPx != null
      ? `${Math.round(cs.buttonPrimary.borderRadiusPx)}px`
      : "var(--button-radius, 0.95rem)";
  const btnPx = cs?.buttonPrimary?.paddingXpx
    ? `${Math.round(cs.buttonPrimary.paddingXpx)}px`
    : "1.25rem";
  const cardRadius =
    cs?.cardTitle?.borderRadiusPx != null
      ? `${Math.round(cs.cardTitle.borderRadiusPx)}px`
      : "var(--border-radius, 1.25rem)";
  const inputRadius =
    cs?.input?.borderRadiusPx != null
      ? `${Math.round(cs.input.borderRadiusPx)}px`
      : "var(--button-radius, 1rem)";
  const inputHeight = cs?.input?.heightPx
    ? `${Math.round(cs.input.heightPx)}px`
    : "3rem";

  return (
    <InspectorCard
      label="Controls"
      icon={<Sparkle size={16} weight="duotone" />}
      hint="Buttons, cards, inputs"
    >
      {/* Button preview */}
      <div className="mb-5 space-y-4 border-b border-[var(--line)] pb-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center text-sm font-medium text-[var(--paper)] transition-all duration-300"
            style={{
              backgroundColor: accentHex,
              borderRadius: btnRadius,
              height: btnHeight,
              paddingLeft: btnPx,
              paddingRight: btnPx,
            }}
          >
            Primary
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center border border-[var(--line)] text-sm font-medium text-[var(--foreground)] transition-all duration-300"
            style={{
              borderRadius: btnRadius,
              height: btnHeight,
              paddingLeft: btnPx,
              paddingRight: btnPx,
            }}
          >
            Secondary
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline transition-all duration-300"
            style={{
              height: btnHeight,
              paddingLeft: btnPx,
              paddingRight: btnPx,
            }}
          >
            Ghost
          </button>
        </div>

        {/* Card preview */}
        <div
          className="border border-[var(--line)] bg-[color:var(--panel)] p-4 transition-all duration-300"
          style={{ borderRadius: cardRadius }}
        >
          <div className="h-16 rounded-lg bg-[var(--skeleton)]" />
          <h4
            className="mt-3 font-semibold tracking-tight text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-display, inherit)",
              fontSize: cs?.cardTitle?.fontSizePx
                ? `${Math.round(cs.cardTitle.fontSizePx)}px`
                : "1.125rem",
              fontWeight: cs?.cardTitle?.fontWeight ?? 600,
            }}
          >
            Card title
          </h4>
          <p
            className="mt-1 text-sm text-[var(--muted)]"
            style={{
              fontFamily: "var(--font-body, inherit)",
              fontSize: cs?.cardBody?.fontSizePx
                ? `${Math.round(cs.cardBody.fontSizePx)}px`
                : "0.875rem",
            }}
          >
            Sample card with extracted radius and surface.
          </p>
        </div>

        {/* Input preview */}
        <input
          type="text"
          readOnly
          value="hello@example.com"
          className="w-full border border-[var(--line)] bg-[color:var(--panel)] px-4 text-sm text-[var(--foreground)] outline-none transition-all duration-300 focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/10"
          style={{ borderRadius: inputRadius, height: inputHeight }}
        />
      </div>

      {/* Spec data */}
      <div className="space-y-2.5">
        <SpecRow label="Style" value={analysis.buttons.style} />
        <SpecRow label="Radius" value={analysis.buttons.radiusPx} />
        <SpecRow label="Height" value={analysis.buttons.height} />
        <SpecRow label="Shadow" value={analysis.buttons.shadow} />
        <SpecRow label="Borders" value={analysis.borders.width} />
        <SpecRow label="Card R." value={analysis.borders.cardRadius} />
        <SpecRow label="Card sh." value={analysis.borders.cardShadow} />
        {cs?.buttonPrimary?.paddingXpx != null && (
          <SpecRow
            label="Btn pad-x"
            value={`${Math.round(cs.buttonPrimary.paddingXpx)}px`}
          />
        )}
        {cs?.input?.borderRadiusPx != null && (
          <SpecRow
            label="Input R."
            value={`${Math.round(cs.input.borderRadiusPx)}px`}
          />
        )}
      </div>
    </InspectorCard>
  );
}

// ─── Layout ────────────────────────────────────────────────────

function LayoutSection({ analysis }: { analysis: WebsiteAnalysis }) {
  return (
    <InspectorCard
      label="Layout"
      icon={<Globe size={16} weight="duotone" />}
      hint="Structure and spacing"
    >
      <div className="space-y-2.5">
        <SpecRow label="Structure" value={analysis.layout.structure} />
        <SpecRow label="Width" value={analysis.layout.width} />
        <SpecRow label="Spacing" value={analysis.layout.spacing} />
        <SpecRow label="Density" value={analysis.layout.density} />
        <SpecRow label="Gap" value={analysis.layout.gap} />
        <SpecRow label="Sec. pad" value={analysis.layout.sectionPadding} />
      </div>
    </InspectorCard>
  );
}

// ─── Navigation ────────────────────────────────────────────────

function NavigationSection({ analysis }: { analysis: WebsiteAnalysis }) {
  const accentHex =
    analysis.palette.find((s) => s.role === "accent")?.hex ?? "var(--accent)";
  const cs = analysis.componentStyles;
  const btnRadius =
    cs?.buttonPrimary?.borderRadiusPx != null
      ? `${Math.round(cs.buttonPrimary.borderRadiusPx)}px`
      : "var(--button-radius, 0.95rem)";

  return (
    <InspectorCard
      label="Navigation"
      icon={<Globe size={16} weight="duotone" />}
      hint="Header and footer"
    >
      {/* Nav bar preview */}
      <div
        className="mb-5 flex items-center justify-between border border-[var(--line)] bg-[color:var(--panel)] px-4 py-2.5 transition-all duration-300"
        style={{ borderRadius: "var(--border-radius, 1rem)" }}
      >
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {analysis.host}
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            Features
          </span>
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            Pricing
          </span>
          <span className="hidden text-sm text-[var(--muted)] md:inline">
            Docs
          </span>
          {analysis.header.hasCta ? (
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[var(--paper)] transition-all duration-300"
              style={{ backgroundColor: accentHex, borderRadius: btnRadius }}
            >
              Get started
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2.5">
        <SpecRow label="Header" value={analysis.header.label} />
        <SpecRow label="Height" value={analysis.header.height} />
        <SpecRow label="Links" value={String(analysis.header.navLinks)} />
        <SpecRow
          label="CTA"
          value={analysis.header.hasCta ? "Yes" : "None detected"}
        />
        <SpecRow label="Footer" value={analysis.footer.label} />
        <SpecRow label="Columns" value={analysis.footer.columns} />
      </div>
    </InspectorCard>
  );
}

// ─── Sections Block ────────────────────────────────────────────

function SectionsBlock({ analysis }: { analysis: WebsiteAnalysis }) {
  if (analysis.sections.length === 0) return null;

  return (
    <InspectorCard
      label="Sections"
      icon={<Globe size={16} weight="duotone" />}
      hint={`${analysis.sections.length} detected`}
    >
      <div className="flex flex-wrap gap-2">
        {analysis.sections.map((section) => (
          <span
            key={section}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[var(--muted)]"
          >
            {section}
          </span>
        ))}
      </div>
    </InspectorCard>
  );
}

// ─── Prompt Section ────────────────────────────────────────────

function PromptSection({
  analysis,
  onCopy,
}: {
  analysis: WebsiteAnalysis;
  onCopy: () => void;
}) {
  return (
    <InspectorCard
      label="Prompt"
      icon={<MagicWand size={16} weight="duotone" />}
      hint="Prompt-ready style breakdown"
      action={
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Copy size={14} weight="bold" />
          Copy
        </button>
      }
    >
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--line)] bg-[color:var(--foreground)]/[0.07] p-4 font-mono text-[12px] leading-6 text-[var(--foreground)]/80">
        {analysis.prompt}
      </pre>
    </InspectorCard>
  );
}

// ─── Shared Components ─────────────────────────────────────────

function InspectorCard({
  label,
  icon,
  hint,
  action,
  children,
}: {
  label: string;
  icon: ReactNode;
  hint: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-strong)] p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[color:var(--panel)]/90 text-[var(--accent)]">
            {icon}
          </span>
          {label}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {hint}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[var(--line)] pb-2.5 text-sm last:border-0 last:pb-0">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      <span className="min-w-0 leading-6 text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm font-medium text-[var(--foreground)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-[1px] disabled:cursor-wait disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}
