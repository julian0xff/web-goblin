/**
 * Per-component resolved style data.
 * Each role (h1, body, buttonPrimary, etc.) gets its own resolved style block
 * with real CSS values extracted from the cascade, not global averages.
 */
export type ComponentStyle = {
  fontStack: string;
  primaryFamily: string;
  fontSizePx: number | null;
  fontWeight: number | null;
  lineHeightPx: number | null;
  lineHeightRatio: number | null;
  letterSpacingPx: number | null;
  textTransform: string | null;
  textDecoration: string | null;
  color: string | null;
  backgroundColor: string | null;
  borderRadiusPx: number | null;
  borderWidthPx: number | null;
  heightPx: number | null;
  paddingXpx: number | null;
  paddingYpx: number | null;
  sourceSelector: string;
  confidence: "high" | "medium" | "low";
};

/** Semantic roles we extract styles for. */
export type StyleRole =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "link"
  | "navLink"
  | "buttonPrimary"
  | "buttonSecondary"
  | "input"
  | "cardTitle"
  | "cardBody";

export type ComponentStyles = Partial<Record<StyleRole, ComponentStyle>>;
export type ComponentStyleVariants = Partial<Record<StyleRole, ComponentStyle[]>>;

/** Font role mapping (display / body / mono). */
export type FontRoleMap = {
  display: string;
  body: string;
  mono: string;
};

export type PaletteSwatch = {
  hex: string;
  role: string;
};

/** Full analysis result. Includes both legacy summary fields and new per-role styles. */
export type WebsiteAnalysis = {
  analysisVersion: 1 | 2;
  inputUrl: string;
  normalizedUrl: string;
  host: string;
  title: string;
  description: string;
  summary: string;
  tags: string[];
  palette: PaletteSwatch[];
  fonts: FontRoleMap & {
    headingSize: string;
    bodySize: string;
    lineHeight: string;
  };
  buttons: {
    label: string;
    radius: string;
    radiusPx: string;
    shadow: string;
    height: string;
    style: string;
  };
  header: {
    label: string;
    height: string;
    navLinks: number;
    hasCta: boolean;
  };
  footer: {
    label: string;
    columns: string;
  };
  borders: {
    width: string;
    cardRadius: string;
    cardShadow: string;
  };
  layout: {
    structure: string;
    width: string;
    spacing: string;
    density: string;
    gap: string;
    sectionPadding: string;
  };
  sections: string[];
  prompt: string;

  /** V2: per-role resolved component styles. Absent in V1 analyses. */
  componentStyles?: ComponentStyles;

  /** V2: additional resolved variants for each role, ordered best-first. */
  componentStyleVariants?: ComponentStyleVariants;

  /** V2: diagnostics about the extraction pipeline. */
  diagnostics?: ExtractionDiagnostics;
};

export type ExtractionDiagnostics = {
  stylesheetsRead: number;
  totalCssBytes: number;
  matchedSelectorCount: number;
  unresolvedVars: number;
  skippedDynamicRules: number;
  roleConfidence: Partial<Record<StyleRole, "high" | "medium" | "low">>;
};

/**
 * Build legacy summary fields from component styles.
 * Falls back to provided defaults when a role is missing.
 */
export function backfillLegacyFromRoles(
  roles: ComponentStyles,
  defaults: {
    fonts: FontRoleMap & { headingSize: string; bodySize: string; lineHeight: string };
    buttons: { height: string; style: string; radiusPx: string };
    borders: { cardRadius: string };
  }
): {
  fonts: FontRoleMap & { headingSize: string; bodySize: string; lineHeight: string };
  buttons: Pick<WebsiteAnalysis["buttons"], "height" | "style" | "radiusPx">;
  borders: Pick<WebsiteAnalysis["borders"], "cardRadius">;
} {
  const h1 = roles.h1;
  const body = roles.body;
  const btn = roles.buttonPrimary;

  const fonts = {
    display: h1?.primaryFamily || defaults.fonts.display,
    body: body?.primaryFamily || defaults.fonts.body,
    mono: defaults.fonts.mono,
    headingSize: h1?.fontSizePx ? `${Math.round(h1.fontSizePx)}px` : defaults.fonts.headingSize,
    bodySize: body?.fontSizePx ? `${Math.round(body.fontSizePx)}px` : defaults.fonts.bodySize,
    lineHeight: body?.lineHeightRatio
      ? body.lineHeightRatio.toFixed(2)
      : defaults.fonts.lineHeight,
  };

  const buttons = {
    height: btn?.heightPx ? `${Math.round(btn.heightPx)}px` : defaults.buttons.height,
    style: btn?.backgroundColor ? "Solid fill" : defaults.buttons.style,
    radiusPx: btn?.borderRadiusPx != null
      ? `${Math.round(btn.borderRadiusPx)}px`
      : defaults.buttons.radiusPx,
  };

  const cardTitle = roles.cardTitle;
  const borders = {
    cardRadius: cardTitle?.borderRadiusPx != null
      ? `${Math.round(cardTitle.borderRadiusPx)}px`
      : defaults.borders.cardRadius,
  };

  return { fonts, buttons, borders };
}
