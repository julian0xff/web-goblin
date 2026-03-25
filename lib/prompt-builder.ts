import type {
  ComponentStyle,
  ComponentStyles,
  ComponentStyleVariants,
  FontRoleMap,
  PaletteSwatch,
} from "./analysis-types";

export type PromptBuildInput = {
  title: string;
  finalUrl: string;
  palette: PaletteSwatch[];
  fonts: FontRoleMap & {
    headingSize: string;
    bodySize: string;
    lineHeight: string;
  };
  tags: string[];
  layout: {
    structure: string;
    width: string;
    spacing: string;
    density: string;
    gap: string;
    sectionPadding: string;
  };
  sections: string[];
  radius: { label: string; average: number };
  shadow: string;
  header: { label: string; height: string; navLinks: number; hasCta: boolean };
  footer: { label: string; columns: string };
  borders: { width: string; cardRadius: string; cardShadow: string };
  buttonDetails: { height: string; style: string };
  description: string;
  componentStyles?: ComponentStyles;
  componentStyleVariants?: ComponentStyleVariants;
};

type RoleLineOptions = {
  includeFamily?: boolean;
  includeColor?: boolean;
  includeFill?: boolean;
  includeShape?: boolean;
  includePadding?: boolean;
  includeDecoration?: boolean;
  includeCase?: boolean;
};

export function buildPrompt({
  title,
  finalUrl,
  palette,
  fonts,
  tags,
  layout,
  sections,
  radius,
  shadow,
  header,
  footer,
  borders,
  buttonDetails,
  description,
  componentStyles: cs,
  componentStyleVariants: variants,
}: PromptBuildInput): string {
  const paletteLine = palette.length > 0
    ? palette.map((swatch) => `${swatch.role}: ${swatch.hex}`).join(", ")
    : "Not detected";

  // Use V2 per-role data when available, fall back to V1.
  const headingSize = cs?.h1?.fontSizePx != null
    ? formatPx(cs.h1.fontSizePx)
    : fonts.headingSize;
  const bodySize = cs?.body?.fontSizePx != null
    ? formatPx(cs.body.fontSizePx)
    : fonts.bodySize;
  const lineHeight = cs?.body?.lineHeightRatio != null
    ? cs.body.lineHeightRatio.toFixed(2)
    : fonts.lineHeight;

  const btnRadius = cs?.buttonPrimary?.borderRadiusPx != null
    ? formatPx(cs.buttonPrimary.borderRadiusPx)
    : `~${Math.round(radius.average)}px`;
  const btnHeight = cs?.buttonPrimary?.heightPx != null
    ? formatPx(cs.buttonPrimary.heightPx)
    : buttonDetails.height;
  const cardRadius = borders.cardRadius;
  const inputRadius = cs?.input?.borderRadiusPx != null
    ? formatPx(cs.input.borderRadiusPx)
    : null;

  const textRoleLines = [
    ...formatRoleLines("H1", cs?.h1, variants?.h1, { includeFamily: true, includeColor: true, includeCase: true }),
    ...formatRoleLines("H2", cs?.h2, variants?.h2, { includeColor: true, includeCase: true }),
    ...formatRoleLines("H3", cs?.h3, variants?.h3, { includeColor: true, includeCase: true }),
    ...formatRoleLines("Body", cs?.body, variants?.body, { includeFamily: true, includeColor: true, includeCase: true }),
    ...formatRoleLines("Links", cs?.link, variants?.link, {
      includeColor: true,
      includeDecoration: true,
      includeCase: true,
    }),
    ...formatRoleLines("Nav links", cs?.navLink, variants?.navLink, {
      includeColor: true,
      includeDecoration: true,
      includeCase: true,
    }),
  ];

  const componentRoleLines = [
    ...formatRoleLines("Primary button", cs?.buttonPrimary, variants?.buttonPrimary, {
      includeColor: true,
      includeFill: true,
      includeShape: true,
      includePadding: true,
      includeCase: true,
    }),
    ...formatRoleLines("Secondary button", cs?.buttonSecondary, variants?.buttonSecondary, {
      includeColor: true,
      includeFill: true,
      includeShape: true,
      includePadding: true,
      includeCase: true,
    }),
    ...formatRoleLines("Input", cs?.input, variants?.input, {
      includeColor: true,
      includeFill: true,
      includeShape: true,
      includePadding: true,
      includeCase: true,
    }),
    ...formatRoleLines("Card title", cs?.cardTitle, variants?.cardTitle, {
      includeColor: true,
      includeFill: true,
      includeShape: true,
      includeCase: true,
    }),
    ...formatRoleLines("Card body", cs?.cardBody, variants?.cardBody, {
      includeColor: true,
      includeFill: true,
      includeShape: true,
      includeCase: true,
    }),
  ];

  const typographyLines = [
    "TYPOGRAPHY",
    `- Display font: ${fonts.display}`,
    `- Body font: ${fonts.body}`,
    `- Monospace: ${fonts.mono}`,
    `- Heading size: ${headingSize}`,
    `- Body size: ${bodySize}`,
    `- Line height: ${lineHeight}`,
  ];

  const controlLines = [
    "SURFACES & CONTROLS",
    `- Corner system: ${radius.label}`,
    `- Button style: ${buttonDetails.style}, ${btnRadius} radius`,
    `- Button height: ${btnHeight}`,
    `- Shadow treatment: ${shadow.toLowerCase()}`,
    `- Border weight: ${borders.width.toLowerCase()}`,
    `- Card radius: ${cardRadius}`,
    `- Card shadows: ${borders.cardShadow.toLowerCase()}`,
  ];

  if (inputRadius) {
    controlLines.push(`- Input radius: ${inputRadius}`);
  }

  const lines: Array<string | null> = [
    `Create a landing page inspired by the design language of ${title} (${hostname(finalUrl)}).`,
    "",
    "Use this extracted visual system:",
    "",
    "IDENTITY",
    `- Vibe tags: ${tags.length > 0 ? tags.join(", ") : "None detected"}`,
    `- Palette: ${paletteLine}`,
    description ? `- Messaging cue: ${description}` : null,
    "",
    ...typographyLines,
    textRoleLines.length > 0 ? "" : null,
    textRoleLines.length > 0 ? "TEXT ROLE REFERENCES" : null,
    ...textRoleLines,
    "",
    "LAYOUT",
    `- Structure: ${layout.structure}`,
    `- Container width: ${layout.width.toLowerCase()}`,
    `- Spacing rhythm: ${layout.spacing.toLowerCase()}`,
    `- Content density: ${layout.density.toLowerCase()}`,
    `- Component gap: ${layout.gap}`,
    `- Section padding: ${layout.sectionPadding}`,
    "",
    ...controlLines,
    componentRoleLines.length > 0 ? "" : null,
    componentRoleLines.length > 0 ? "COMPONENT ROLE REFERENCES" : null,
    ...componentRoleLines,
    "",
    "NAVIGATION",
    `- Header: ${header.label}`,
    `- Header height: ${header.height}`,
    `- Nav links: ${header.navLinks}`,
    header.hasCta
      ? "- Header CTA: Yes (sign-up or action button in nav)"
      : "- Header CTA: None detected",
    "",
    "FOOTER",
    `- Style: ${footer.label}`,
    `- Structure: ${footer.columns}`,
    "",
    "SECTIONS",
    `- Detected: ${sections.length > 0 ? sections.join(", ") : "No clear section pattern detected"}`,
    "",
    "Do not copy the original branding, logo, copy, or imagery. Recreate the atmosphere, spacing logic, typography pairing, component treatment, and section cadence only.",
  ];

  return lines.filter(Boolean).join("\n");
}

function formatRoleLine(
  label: string,
  style: ComponentStyle | undefined,
  options: RoleLineOptions
): string | null {
  if (!style) return null;

  const details: string[] = [];

  if (options.includeFamily && style.primaryFamily) {
    details.push(`font ${style.primaryFamily}`);
  }
  if (style.fontSizePx != null) {
    details.push(`size ${formatPx(style.fontSizePx)}`);
  }
  if (style.fontWeight != null) {
    details.push(`weight ${style.fontWeight}`);
  }
  if (style.lineHeightRatio != null) {
    details.push(`line-height ${style.lineHeightRatio.toFixed(2)}`);
  }
  if (style.letterSpacingPx != null && Math.abs(style.letterSpacingPx) >= 0.05) {
    details.push(`letter-spacing ${formatPx(style.letterSpacingPx)}`);
  }
  if (options.includeCase && style.textTransform && style.textTransform !== "none") {
    details.push(`transform ${style.textTransform}`);
  }
  if (options.includeDecoration && style.textDecoration && style.textDecoration !== "none") {
    details.push(`decoration ${style.textDecoration}`);
  }
  if (options.includeColor && style.color) {
    details.push(`text ${style.color}`);
  }
  if (options.includeFill && style.backgroundColor && style.backgroundColor !== "transparent") {
    details.push(`fill ${style.backgroundColor}`);
  }
  if (options.includeShape && style.borderRadiusPx != null) {
    details.push(`radius ${formatPx(style.borderRadiusPx)}`);
  }
  if (options.includeShape && style.borderWidthPx != null && style.borderWidthPx > 0) {
    details.push(`border ${formatPx(style.borderWidthPx)}`);
  }
  if (options.includeShape && style.heightPx != null) {
    details.push(`height ${formatPx(style.heightPx)}`);
  }
  if (options.includePadding && style.paddingXpx != null) {
    details.push(`padding-x ${formatPx(style.paddingXpx)}`);
  }
  if (options.includePadding && style.paddingYpx != null) {
    details.push(`padding-y ${formatPx(style.paddingYpx)}`);
  }

  if (details.length === 0) {
    return null;
  }

  return `- ${label}: ${details.join(", ")}`;
}

function formatRoleLines(
  label: string,
  primaryStyle: ComponentStyle | undefined,
  variants: ComponentStyle[] | undefined,
  options: RoleLineOptions
): string[] {
  const candidateStyles = variants && variants.length > 0
    ? variants
    : primaryStyle
      ? [primaryStyle]
      : [];
  const lines: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < Math.min(candidateStyles.length, 2); index++) {
    const line = formatRoleLine(
      index === 0 ? label : `${label} variant ${index + 1}`,
      candidateStyles[index],
      options
    );
    if (!line || seen.has(line)) continue;

    const detailSignature = line.replace(/^- [^:]+:\s*/, "");
    if (seen.has(detailSignature)) continue;

    seen.add(detailSignature);
    lines.push(line);
  }

  return lines;
}

function formatPx(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}px` : `${rounded.toFixed(1)}px`;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
