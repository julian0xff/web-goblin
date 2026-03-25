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
import type { ComponentStyle, StyleRole } from "@/lib/analysis-types";
import {
  resolveCardPreviewBorderColor,
  resolveCardPreviewSurface,
} from "@/lib/preview-utils";
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

const TEXT_ROLE_CONFIG: Array<{
  role: StyleRole;
  label: string;
  sample: string;
  fallbackColor: string;
}> = [
  { role: "h1", label: "H1", sample: "Page headline", fallbackColor: "var(--foreground)" },
  { role: "h2", label: "H2", sample: "Section heading", fallbackColor: "var(--foreground)" },
  { role: "h3", label: "H3", sample: "Subsection heading", fallbackColor: "var(--foreground)" },
  { role: "body", label: "p", sample: "Body text rendered in the extracted font, showing line height and readability.", fallbackColor: "var(--muted)" },
  { role: "link", label: "a", sample: "Inline link style", fallbackColor: "var(--accent)" },
  { role: "navLink", label: "nav", sample: "Navigation link", fallbackColor: "var(--muted)" },
];

const BUTTON_ROLE_CONFIG: Array<{
  role: StyleRole;
  label: string;
}> = [
  { role: "buttonPrimary", label: "Primary" },
  { role: "buttonSecondary", label: "Secondary" },
];

function getRoleVariants(
  analysis: WebsiteAnalysis,
  role: StyleRole,
  limit = 2
): ComponentStyle[] {
  const variants = analysis.componentStyleVariants?.[role];
  if (variants && variants.length > 0) {
    return variants.slice(0, limit);
  }

  const single = analysis.componentStyles?.[role];
  return single ? [single] : [];
}

function formatPreviewLabel(label: string, index: number): string {
  return index === 0 ? label : `${label} v${index + 1}`;
}

function formatPxValue(value: number | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}px` : `${rounded.toFixed(1)}px`;
}

function resolveTextColor(
  style: ComponentStyle | undefined,
  fallback: string
): string {
  if (!style?.color || style.color === "LinkText") return fallback;
  return style.color;
}

function resolveBackgroundColor(
  style: ComponentStyle | undefined,
  fallback: string
): string {
  if (!style?.backgroundColor || style.backgroundColor === "transparent" || style.backgroundColor === "none") {
    return fallback;
  }
  return style.backgroundColor;
}

function resolveBorderRadius(
  style: ComponentStyle | undefined,
  fallback: string
): string {
  return style?.borderRadiusPx != null
    ? `${Math.round(style.borderRadiusPx)}px`
    : fallback;
}

function resolveBorder(
  style: ComponentStyle | undefined,
  fallbackColor: string
): string {
  if (style?.borderWidthPx != null && style.borderWidthPx > 0) {
    return `${Math.max(1, Math.round(style.borderWidthPx))}px solid ${resolveTextColor(style, fallbackColor)}`;
  }
  return `1px solid ${fallbackColor}`;
}

function buttonPreviewText(role: StyleRole, index: number): string {
  if (role === "buttonPrimary") {
    return index === 0 ? "Get started" : "Try it free";
  }
  if (role === "buttonSecondary") {
    return index === 0 ? "Learn more" : "See details";
  }
  return "Action";
}

function inputPreviewValue(index: number): string {
  return index === 0 ? "hello@example.com" : "team@company.com";
}

function cardPreviewTitle(index: number): string {
  return index === 0 ? "Organize work faster" : "Keep projects moving";
}

function cardPreviewBody(index: number): string {
  return index === 0
    ? "Structured preview of the extracted card styling."
    : "Alternate variant showing spacing, type, and surface treatment.";
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
  const [cardError, setCardError] = useState<string | null>(null);

  const generateCardAndShare = useCallback(async () => {
    setCardError(null);
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
    setCardError(null);
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
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Card generation failed (${response.status})`);
      }
      const blob = await response.blob();
      if (!blob.type.includes("image")) {
        throw new Error("Card generation returned a non-image response.");
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `web-goblin-${analysis.host}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setCardError(
        error instanceof Error
          ? error.message
          : "Card generation failed. Please try again."
      );
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
      {cardError ? (
        <p className="mt-3 text-sm text-[var(--accent)]">{cardError}</p>
      ) : null}
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
  const renderedRoles = TEXT_ROLE_CONFIG.flatMap((config) =>
    getRoleVariants(analysis, config.role).map((style, index) => ({
      ...config,
      style,
      index,
    }))
  );

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
      <div className="mb-5 space-y-3 border-b border-[var(--line)] pb-5">
        {renderedRoles.length > 0 ? (
          renderedRoles.map(({ role, label, sample, fallbackColor, style, index }) => {
            const commonStyle = {
              fontFamily: style.fontStack || "var(--font-body, inherit)",
              fontSize: formatPxValue(style.fontSizePx, role === "body" ? "1rem" : "1.125rem"),
              fontWeight: style.fontWeight ?? undefined,
              lineHeight: style.lineHeightRatio ?? undefined,
              letterSpacing:
                style.letterSpacingPx != null ? `${style.letterSpacingPx}px` : undefined,
              textTransform: style.textTransform ?? undefined,
              textDecoration:
                style.textDecoration && style.textDecoration !== "none"
                  ? style.textDecoration
                  : undefined,
              color: resolveTextColor(style, fallbackColor),
            };

            return (
              <div
                key={`${role}-${index}`}
                className={`flex gap-3 ${role === "body" ? "items-start" : "items-baseline"}`}
              >
                <span className="mt-1 shrink-0 font-mono text-[10px] text-[var(--muted)]">
                  {formatPreviewLabel(label, index)}
                </span>
                {role === "body" ? (
                  <p style={commonStyle}>{sample}</p>
                ) : role === "link" || role === "navLink" ? (
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={commonStyle}
                  >
                    {sample}
                  </a>
                ) : (
                  <span style={commonStyle}>{sample}</span>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No role-level typography could be resolved for this page.
          </p>
        )}
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
  const buttonPreviews = BUTTON_ROLE_CONFIG.flatMap((config) =>
    getRoleVariants(analysis, config.role).map((style, index) => ({
      ...config,
      style,
      index,
    }))
  );
  const inputPreviews = getRoleVariants(analysis, "input");
  const cardTitlePreviews = getRoleVariants(analysis, "cardTitle");
  const cardBodyPreviews = getRoleVariants(analysis, "cardBody");
  const cardPreviewCount = Math.max(cardTitlePreviews.length, cardBodyPreviews.length);

  return (
    <InspectorCard
      label="Controls"
      icon={<Sparkle size={16} weight="duotone" />}
      hint="Buttons, cards, inputs"
    >
      <div className="mb-5 space-y-4 border-b border-[var(--line)] pb-5">
        {buttonPreviews.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {buttonPreviews.map(({ label, style, index, role }) => (
              <div key={`${role}-${index}`} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {formatPreviewLabel(label, index)}
                </p>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center transition-all duration-300"
                  style={{
                    fontFamily: style.fontStack || "var(--font-body, inherit)",
                    fontSize: formatPxValue(style.fontSizePx, "0.875rem"),
                    fontWeight: style.fontWeight ?? 600,
                    lineHeight: style.lineHeightRatio ?? undefined,
                    letterSpacing:
                      style.letterSpacingPx != null ? `${style.letterSpacingPx}px` : undefined,
                    textTransform: style.textTransform ?? undefined,
                    textDecoration:
                      style.textDecoration && style.textDecoration !== "none"
                        ? style.textDecoration
                        : undefined,
                    color: resolveTextColor(style, role === "buttonPrimary" ? "var(--paper)" : "var(--foreground)"),
                    backgroundColor: resolveBackgroundColor(
                      style,
                      role === "buttonPrimary" ? "var(--accent)" : "transparent"
                    ),
                    borderRadius: resolveBorderRadius(style, "var(--button-radius, 0.95rem)"),
                    border: resolveBorder(style, "var(--line)"),
                    height: formatPxValue(style.heightPx, "2.75rem"),
                    paddingLeft: formatPxValue(style.paddingXpx, "1.25rem"),
                    paddingRight: formatPxValue(style.paddingXpx, "1.25rem"),
                  }}
                >
                  {buttonPreviewText(role, index)}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {cardPreviewCount > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: Math.min(cardPreviewCount, 2) }, (_, index) => {
              const titleStyle = cardTitlePreviews[index] ?? cardTitlePreviews[0];
              const bodyStyle = cardBodyPreviews[index] ?? cardBodyPreviews[0];
              const cardRadius = resolveBorderRadius(
                titleStyle ?? bodyStyle,
                "var(--border-radius, 1.25rem)"
              );
              const cardSurface = resolveCardPreviewSurface({
                explicitBackgroundColor:
                  titleStyle?.backgroundColor ?? bodyStyle?.backgroundColor,
                textColors: [titleStyle?.color, bodyStyle?.color],
              });
              const cardBorderColor = resolveCardPreviewBorderColor(cardSurface.color);
              const useExtractedCardText = cardSurface.source === "explicit";

              return (
                <div key={`card-${index}`} className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {formatPreviewLabel("Card", index)}
                  </p>
                  <div
                    className="border p-4 transition-all duration-300"
                    style={{
                      borderRadius: cardRadius,
                      backgroundColor: cardSurface.color,
                      borderColor: cardBorderColor,
                    }}
                  >
                    <div
                      className="h-16 rounded-lg"
                      style={{
                        backgroundColor:
                          cardSurface.color === "var(--foreground)"
                            ? "rgba(255,255,255,0.08)"
                            : "var(--skeleton)",
                      }}
                    />
                    {titleStyle ? (
                      <h4
                        className="mt-3"
                        style={{
                          fontFamily: titleStyle.fontStack || "var(--font-display, inherit)",
                          fontSize: formatPxValue(titleStyle.fontSizePx, "1.125rem"),
                          fontWeight: titleStyle.fontWeight ?? 600,
                          lineHeight: titleStyle.lineHeightRatio ?? undefined,
                          letterSpacing:
                            titleStyle.letterSpacingPx != null
                              ? `${titleStyle.letterSpacingPx}px`
                              : undefined,
                          textTransform: titleStyle.textTransform ?? undefined,
                          color: useExtractedCardText
                            ? resolveTextColor(titleStyle, "var(--foreground)")
                            : "var(--foreground)",
                        }}
                      >
                        {cardPreviewTitle(index)}
                      </h4>
                    ) : null}
                    {bodyStyle ? (
                      <p
                        className="mt-1"
                        style={{
                          fontFamily: bodyStyle.fontStack || "var(--font-body, inherit)",
                          fontSize: formatPxValue(bodyStyle.fontSizePx, "0.875rem"),
                          fontWeight: bodyStyle.fontWeight ?? 400,
                          lineHeight: bodyStyle.lineHeightRatio ?? undefined,
                          letterSpacing:
                            bodyStyle.letterSpacingPx != null
                              ? `${bodyStyle.letterSpacingPx}px`
                              : undefined,
                          textTransform: bodyStyle.textTransform ?? undefined,
                          color: useExtractedCardText
                            ? resolveTextColor(bodyStyle, "var(--muted)")
                            : "var(--muted)",
                        }}
                      >
                        {cardPreviewBody(index)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {inputPreviews.length > 0 ? (
          <div className="grid gap-3">
            {inputPreviews.slice(0, 2).map((style, index) => (
              <div key={`input-${index}`} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {formatPreviewLabel("Input", index)}
                </p>
                <input
                  type="text"
                  readOnly
                  value={inputPreviewValue(index)}
                  className="w-full outline-none transition-all duration-300"
                  style={{
                    fontFamily: style.fontStack || "var(--font-body, inherit)",
                    fontSize: formatPxValue(style.fontSizePx, "0.875rem"),
                    fontWeight: style.fontWeight ?? 400,
                    lineHeight: style.lineHeightRatio ?? undefined,
                    color: resolveTextColor(style, "var(--foreground)"),
                    backgroundColor: resolveBackgroundColor(style, "var(--panel)"),
                    borderRadius: resolveBorderRadius(style, "var(--button-radius, 1rem)"),
                    border: resolveBorder(style, "var(--line)"),
                    height: formatPxValue(style.heightPx, "3rem"),
                    paddingLeft: formatPxValue(style.paddingXpx, "1rem"),
                    paddingRight: formatPxValue(style.paddingXpx, "1rem"),
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {buttonPreviews.length === 0 && inputPreviews.length === 0 && cardPreviewCount === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No control-level component roles were resolved for this page.
          </p>
        ) : null}
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
  const navLinkStyle = getRoleVariants(analysis, "navLink", 1)[0];
  const ctaStyle = getRoleVariants(analysis, "buttonPrimary", 1)[0];

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
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: navLinkStyle?.fontStack || "var(--font-body, inherit)",
              fontSize: formatPxValue(navLinkStyle?.fontSizePx, "0.875rem"),
              fontWeight: navLinkStyle?.fontWeight ?? 500,
              lineHeight: navLinkStyle?.lineHeightRatio ?? undefined,
              color: resolveTextColor(navLinkStyle, "var(--muted)"),
            }}
          >
            Features
          </span>
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: navLinkStyle?.fontStack || "var(--font-body, inherit)",
              fontSize: formatPxValue(navLinkStyle?.fontSizePx, "0.875rem"),
              fontWeight: navLinkStyle?.fontWeight ?? 500,
              lineHeight: navLinkStyle?.lineHeightRatio ?? undefined,
              color: resolveTextColor(navLinkStyle, "var(--muted)"),
            }}
          >
            Pricing
          </span>
          <span
            className="hidden md:inline"
            style={{
              fontFamily: navLinkStyle?.fontStack || "var(--font-body, inherit)",
              fontSize: formatPxValue(navLinkStyle?.fontSizePx, "0.875rem"),
              fontWeight: navLinkStyle?.fontWeight ?? 500,
              lineHeight: navLinkStyle?.lineHeightRatio ?? undefined,
              color: resolveTextColor(navLinkStyle, "var(--muted)"),
            }}
          >
            Docs
          </span>
          {analysis.header.hasCta ? (
            <span
              className="inline-flex items-center transition-all duration-300"
              style={{
                fontFamily: ctaStyle?.fontStack || "var(--font-body, inherit)",
                fontSize: formatPxValue(ctaStyle?.fontSizePx, "0.75rem"),
                fontWeight: ctaStyle?.fontWeight ?? 600,
                lineHeight: ctaStyle?.lineHeightRatio ?? undefined,
                color: resolveTextColor(ctaStyle, "var(--paper)"),
                backgroundColor: resolveBackgroundColor(ctaStyle, "var(--accent)"),
                borderRadius: resolveBorderRadius(ctaStyle, "var(--button-radius, 0.95rem)"),
                border: resolveBorder(ctaStyle, "var(--line)"),
                height: formatPxValue(ctaStyle?.heightPx, "2rem"),
                paddingLeft: formatPxValue(ctaStyle?.paddingXpx, "0.625rem"),
                paddingRight: formatPxValue(ctaStyle?.paddingXpx, "0.625rem"),
              }}
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
