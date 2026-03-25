/**
 * Role extractor.
 * Chooses representative DOM elements for each semantic role (h1, body, button, etc.)
 * and resolves their styles through the CSS cascade.
 *
 * Selection uses scored picking: all qualifying candidates across all selectors are
 * collected, scored by prominence (DOM position, text length, resolved property count),
 * and the highest-scoring candidate wins.
 */

import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { NormalizedRule } from "./css-parser";
import type {
  ComponentStyle,
  ComponentStyleVariants,
  StyleRole,
  ComponentStyles,
} from "./analysis-types";
import { resolveStyles, resolveStylesForElement, extractCustomProperties } from "./style-resolver";
import {
  toPx,
  parseLineHeight,
  parseFontWeight,
  parseFontFamily,
  parseBorderRadius,
  parsePadding,
} from "./value-normalizer";

/** Configuration for finding a role's representative element. */
type RoleFinder = {
  role: StyleRole;
  /** CSS selectors to try, in priority order. */
  selectors: string[];
  /** Minimum visible text length to qualify. */
  minTextLength?: number;
  /** Tag name for UA defaults. */
  tagFallback: string;
};

const ROLE_FINDERS: RoleFinder[] = [
  {
    role: "h1",
    selectors: ["h1", "[role='heading'][aria-level='1']", ".hero h1", "main h1"],
    minTextLength: 2,
    tagFallback: "h1",
  },
  {
    role: "h2",
    selectors: ["h2", "[role='heading'][aria-level='2']", "main h2", "section h2"],
    minTextLength: 2,
    tagFallback: "h2",
  },
  {
    role: "h3",
    selectors: ["h3", "[role='heading'][aria-level='3']", "main h3"],
    minTextLength: 2,
    tagFallback: "h3",
  },
  {
    role: "body",
    selectors: ["p", "main p", "article p", "section p", ".content p"],
    minTextLength: 20,
    tagFallback: "p",
  },
  {
    role: "link",
    selectors: ["a", "main a", "article a", "p a"],
    minTextLength: 1,
    tagFallback: "a",
  },
  {
    role: "navLink",
    selectors: ["nav a", "header a", "header nav a", "[role='navigation'] a"],
    minTextLength: 1,
    tagFallback: "a",
  },
  {
    role: "buttonPrimary",
    selectors: [
      "button[type='submit']",
      "a[class*='Button']",
      "button[class*='Button']",
      "a[class*='btn']", "a[class*='button']",
      "button[class*='primary']", "button[class*='cta']",
      "button", "a[role='button']",
      "[class*='btn-primary']", "[class*='button-primary']",
    ],
    minTextLength: 1,
    tagFallback: "button",
  },
  {
    role: "buttonSecondary",
    selectors: [
      "a[class*='Button'][class*='secondary']",
      "button[class*='secondary']", "button[class*='outline']",
      "button[class*='ghost']", "[class*='btn-secondary']",
      "[class*='btn-outline']",
    ],
    minTextLength: 1,
    tagFallback: "button",
  },
  {
    role: "input",
    selectors: [
      "input[type='text']", "input[type='email']", "input[type='search']",
      "input:not([type='hidden']):not([type='submit']):not([type='checkbox']):not([type='radio'])",
      "textarea",
    ],
    tagFallback: "input",
  },
  {
    role: "cardTitle",
    selectors: [
      "[class*='card'] h3", "[class*='card'] h4", "[class*='card'] h2",
      "[class*='panel'] h3", "[class*='panel'] h4", "[class*='panel'] h2",
      "[class*='tile'] h3", "[class*='tile'] h4", "[class*='tile'] h2",
      "[class*='issue'] h3", "[class*='issue'] h4", "[class*='issue'] h2",
      "[class*='item'] h3", "[class*='item'] h4",
      "article h3", "article h2",
      ".feature h3", ".feature h2",
      "li h3", "li h4", "main h3", "main h4", "section h3", "section h4",
    ],
    minTextLength: 2,
    tagFallback: "h3",
  },
  {
    role: "cardBody",
    selectors: [
      "[class*='card'] p", "article p",
      "[class*='panel'] p", "[class*='tile'] p", "[class*='issue'] p",
      ".feature p", "[class*='card'] .description", "[class*='panel'] .description",
      "[class*='item'] p", "li p", "main p", "section p",
    ],
    minTextLength: 10,
    tagFallback: "p",
  },
];

/**
 * Icon/symbol font families to filter out.
 * These should never be reported as body or heading fonts.
 */
const ICON_FONT_PATTERN =
  /icon|symbol|glyph|fa-|fontawesome|material|phosphor|feather|ionicons|lucide|remix/i;

/**
 * Class patterns that indicate visually-hidden / offscreen elements.
 */
const HIDDEN_CLASS_PATTERN =
  /\b(sr-only|visually-?hidden|screen-?reader|clip-hide|off-?screen|a11y-?hidden|hide-?visually|element-invisible)\b/i;

/**
 * Extract component styles for all roles.
 */
export function extractComponentStyles(
  $: CheerioAPI,
  rules: NormalizedRule[]
): ComponentStyles {
  const variants = extractComponentStyleVariants($, rules);
  const styles: ComponentStyles = {};

  for (const [role, roleVariants] of Object.entries(variants)) {
    if (roleVariants && roleVariants.length > 0) {
      styles[role as StyleRole] = roleVariants[0];
    }
  }

  return styles;
}

export function extractComponentStyleVariants(
  $: CheerioAPI,
  rules: NormalizedRule[],
  options: { maxVariantsPerRole?: number } = {}
): ComponentStyleVariants {
  const styles: ComponentStyleVariants = {};
  const { customProperties, rootStyles } = buildExtractionContext($, rules);
  const maxVariantsPerRole = options.maxVariantsPerRole ?? 3;

  for (const finder of ROLE_FINDERS) {
    const variants = findAndResolveRoleVariants(
      $,
      finder,
      rules,
      customProperties,
      rootStyles,
      maxVariantsPerRole
    );
    if (variants.length > 0) {
      styles[finder.role] = variants;
    }
  }

  return styles;
}

type Candidate = {
  el: Cheerio<AnyNode>;
  score: number;
  selectorPriority: number;
  resolved: Record<string, string>;
  componentStyle: ComponentStyle;
};

type CandidateSeed = {
  el: Cheerio<AnyNode>;
  selector: string;
  text: string;
  selectorPriority: number;
  score: number;
};

function buildExtractionContext(
  $: CheerioAPI,
  rules: NormalizedRule[]
): {
  customProperties: Map<string, string>;
  rootStyles: Record<string, string>;
} {
  const htmlEl = $("html").first();
  const bodyEl = $("body").first();
  const rootAncestors = [htmlEl, bodyEl].filter((el) => el.length > 0);
  const customProperties = rootAncestors.length > 0
    ? extractCustomProperties(rules, $, rootAncestors)
    : extractCustomProperties(rules);

  const htmlStyles = htmlEl.length > 0
    ? resolveStylesForElement(
      $,
      htmlEl,
      "html",
      {},
      htmlEl.attr("style") ?? null,
      rules,
      customProperties
    )
    : {};

  const rootStyles = bodyEl.length > 0
    ? resolveStylesForElement(
      $,
      bodyEl,
      "body",
      htmlStyles,
      bodyEl.attr("style") ?? null,
      rules,
      customProperties
    )
    : resolveStyles("body", "body", htmlStyles, null, rules, customProperties);

  return { customProperties, rootStyles };
}

function findAndResolveRoleVariants(
  $: CheerioAPI,
  finder: RoleFinder,
  rules: NormalizedRule[],
  _customProperties: Map<string, string>,
  rootStyles: Record<string, string>,
  maxVariantsPerRole: number
): ComponentStyle[] {
  const seeds = collectCandidateSeeds($, finder);

  if (seeds.length === 0) return [];

  const shortlist = [...seeds]
    .sort((a, b) => b.score - a.score)
    .slice(0, isControlRole(finder.role) ? 14 : finder.role.startsWith("card") ? 12 : 8);

  const candidates: Candidate[] = [];

  for (const seed of shortlist) {
    const { el, selector, selectorPriority } = seed;

    // Collect ancestor elements for scoped var resolution and inheritance
    const ancestors = getAncestorElements($, el);
    const scopedVars = extractCustomProperties(rules, $, [...ancestors, el]);
    const ancestorStyles = resolveAncestorStyles($, el, rules, scopedVars, rootStyles);

    const resolvedSelector = buildElementSelector(el, selector);
    const inlineStyle = el.attr("style") ?? null;

    // Use real DOM-based selector matching
    const resolved = resolveStylesForElement(
      $,
      el,
      finder.tagFallback,
      ancestorStyles,
      inlineStyle,
      rules,
      scopedVars
    );

    const componentStyle = mergeTextChildStyle(
      $,
      el,
      finder,
      rules,
      rootStyles,
      mapToComponentStyle(resolved, resolvedSelector, finder)
    );

    // Reject icon fonts for text roles
    if (isTextRole(finder.role) && isIconFont(componentStyle.primaryFamily)) {
      continue;
    }

    // Reject elements with unresolved var() in critical properties
    if (hasUnresolvedVars(resolved, finder.role)) continue;

    const score =
      seed.score + scoreResolvedCandidate(resolved, finder, componentStyle, selectorPriority);
    candidates.push({ el, score, selectorPriority, resolved, componentStyle });
  }

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => b.score - a.score);
  return dedupeCandidateVariants(candidates, maxVariantsPerRole);
}

function collectCandidateSeeds(
  $: CheerioAPI,
  finder: RoleFinder
): CandidateSeed[] {
  const seeds: CandidateSeed[] = [];

  for (let sIdx = 0; sIdx < finder.selectors.length; sIdx++) {
    const selector = finder.selectors[sIdx];
    const elements = $(selector);
    const limit = Math.min(
      elements.length,
      isControlRole(finder.role) ? 24 : finder.role.startsWith("card") ? 20 : 10
    );

    for (let i = 0; i < limit; i++) {
      const el = elements.eq(i);
      if (!isVisible($, el)) continue;

      const text = el.text().trim();
      if (finder.minTextLength && text.length < finder.minTextLength) continue;

      let structuralScore = scoreStructuralCandidate(el, text, sIdx, finder);

      if (isCardRole(finder.role)) {
        const cardContext = scoreCardContext($, el);
        if (cardContext < 4) continue;
        structuralScore += cardContext;
      }

      seeds.push({
        el,
        selector,
        text,
        selectorPriority: sIdx,
        score: structuralScore,
      });
    }
  }

  return seeds;
}

function dedupeCandidateVariants(
  candidates: Candidate[],
  maxVariantsPerRole: number
): ComponentStyle[] {
  const variants: ComponentStyle[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const signature = buildVariantSignature(candidate.componentStyle);
    if (seen.has(signature)) continue;

    seen.add(signature);
    variants.push(candidate.componentStyle);

    if (variants.length >= maxVariantsPerRole) break;
  }

  return variants;
}

function buildVariantSignature(style: ComponentStyle): string {
  return [
    style.primaryFamily,
    style.fontSizePx?.toFixed(2) ?? "",
    style.fontWeight ?? "",
    style.lineHeightRatio?.toFixed(2) ?? "",
    style.letterSpacingPx?.toFixed(2) ?? "",
    style.textTransform ?? "",
    style.textDecoration ?? "",
    style.color ?? "",
    style.backgroundColor ?? "",
    style.borderRadiusPx?.toFixed(2) ?? "",
    style.borderWidthPx?.toFixed(2) ?? "",
    style.heightPx?.toFixed(2) ?? "",
    style.paddingXpx?.toFixed(2) ?? "",
    style.paddingYpx?.toFixed(2) ?? "",
  ].join("|");
}

/**
 * Score a candidate element using only cheap DOM/text signals.
 * Higher = more likely the "real" element the user sees.
 */
function scoreStructuralCandidate(
  el: Cheerio<AnyNode>,
  text: string,
  selectorIndex: number,
  finder: RoleFinder
): number {
  let score = 0;

  // Selector priority: earlier selectors in the finder list are preferred
  score += Math.max(0, 10 - selectorIndex * 2);

  // DOM position: elements earlier in the document are more prominent (above the fold)
  const allSiblings = el.parent().children();
  const positionInParent = allSiblings.index(el);
  score += Math.max(0, 5 - positionInParent);

  // Text length: longer text is more likely to be real content (not a label/icon)
  const textLen = text.length;
  if (isTextRole(finder.role)) {
    if (textLen > 5) score += 2;
    if (textLen > 20) score += 2;
    if (textLen > 50) score += 1;
  }

  // Penalty: element is inside a footer or aside (less likely to be the primary instance)
  const parentChain = el.parents().toArray().map(n => (n as unknown as { tagName?: string }).tagName?.toLowerCase?.());
  if (parentChain.includes("footer")) score -= 5;
  if (parentChain.includes("aside")) score -= 2;

  // Bonus: element is inside main, article, or hero-like containers
  if (parentChain.includes("main")) score += 3;
  if (parentChain.includes("article")) score += 1;

  if (finder.role === "buttonPrimary") {
    const normalizedText = text.trim().toLowerCase();
    const inNav = parentChain.includes("nav");
    const inHeader = parentChain.includes("header");
    const inAside = parentChain.includes("aside");
    const semanticTokens = [
      el.attr("class") ?? "",
      el.attr("id") ?? "",
      el.attr("role") ?? "",
      el.attr("aria-haspopup") ?? "",
      el.attr("data-state") ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const hasFillSignal = /primary|invert|solid|filled|brand|cta/.test(semanticTokens);
    if (CTA_TEXT_RE.test(normalizedText)) score += 7;
    if (MENU_TRIGGER_TEXT_RE.test(normalizedText)) score -= 8;
    if ((inNav || inHeader || inAside) && !hasFillSignal) score -= 4;
    if ((inNav || inHeader || inAside) && MENU_TRIGGER_TEXT_RE.test(normalizedText)) score -= 4;
    if (NAV_SEMANTIC_RE.test(semanticTokens)) score -= 7;
    if (hasFillSignal) score += 4;
  }

  if (isCardRole(finder.role)) {
    score += scoreCardContextFromNode(el);
  }

  return score;
}

function scoreResolvedCandidate(
  resolved: Record<string, string>,
  finder: RoleFinder,
  componentStyle: ComponentStyle,
  selectorPriority: number
): number {
  let score = 0;

  let resolvedCount = 0;
  for (const [prop, value] of Object.entries(resolved)) {
    if (value && !value.startsWith("var(") && prop !== "display") {
      resolvedCount++;
    }
  }
  score += Math.min(resolvedCount, 8);

  if (resolved["font-size"] && resolved["font-size"] !== "16px" && resolved["font-size"] !== "32px") {
    score += 3;
  }

  if (componentStyle.primaryFamily && componentStyle.primaryFamily !== "system-ui" && componentStyle.primaryFamily !== "sans-serif") {
    score += 3;
  }

  if (isControlRole(finder.role)) {
    const backgroundValue = resolved["background-color"] ?? resolved["background"];
    if (backgroundValue && backgroundValue !== "transparent" && backgroundValue !== "none") score += 4;
    if (componentStyle.borderRadiusPx != null) score += 2;
    if (componentStyle.heightPx != null) score += 2;
    if (componentStyle.paddingXpx != null) score += 1;
  }

  if (isCardRole(finder.role)) {
    if (componentStyle.backgroundColor && componentStyle.backgroundColor !== "transparent") score += 2;
    if (componentStyle.borderRadiusPx != null) score += 2;

    if (finder.role === "cardTitle") {
      if (componentStyle.fontSizePx != null) {
        if (componentStyle.fontSizePx >= 18 && componentStyle.fontSizePx <= 32) score += 3;
        if (componentStyle.fontSizePx > 40) score -= 2;
      }
      if ((componentStyle.fontWeight ?? 0) >= 600) score += 1;
    }

    if (finder.role === "cardBody") {
      if (componentStyle.fontSizePx != null) {
        if (componentStyle.fontSizePx >= 13 && componentStyle.fontSizePx <= 20) score += 6;
        if (componentStyle.fontSizePx > 24) score -= 10;
      }
      if (componentStyle.lineHeightRatio != null &&
        componentStyle.lineHeightRatio >= 1.3 &&
        componentStyle.lineHeightRatio <= 1.8) {
        score += 2;
      }
      if (componentStyle.lineHeightRatio != null && componentStyle.lineHeightRatio < 1.25) {
        score -= 3;
      }
      if ((componentStyle.fontWeight ?? 400) <= 500) score += 1;
    }
  }

  // Extra preference for higher-priority selectors after full resolution
  score += Math.max(0, 4 - selectorPriority);

  return score;
}

/**
 * Get ancestor Cheerio elements from body down to the parent of el.
 */
function getAncestorElements(_$: CheerioAPI, el: Cheerio<AnyNode>): Cheerio<AnyNode>[] {
  const ancestors: Cheerio<AnyNode>[] = [];
  let current = el.parent();
  while (current.length > 0) {
    const tag = (current.prop("tagName") ?? "").toLowerCase();
    if (tag === "") break;
    ancestors.unshift(current);
    if (tag === "html") break;
    current = current.parent();
  }
  return ancestors;
}

/**
 * Walk the element's DOM ancestors to build inherited styles.
 * Uses real DOM matching for each ancestor.
 */
function resolveAncestorStyles(
  $: CheerioAPI,
  el: Cheerio<AnyNode>,
  rules: NormalizedRule[],
  customProperties: Map<string, string>,
  rootStyles: Record<string, string>
): Record<string, string> {
  const ancestors = getAncestorElements($, el);

  let inherited = { ...rootStyles };

  for (const ancestor of ancestors) {
    const tag = (ancestor.prop("tagName") ?? "").toLowerCase();
    if (tag === "body") continue; // already in rootStyles

    const inlineStyle = ancestor.attr("style") ?? null;
    const resolved = resolveStylesForElement(
      $,
      ancestor,
      tag,
      inherited,
      inlineStyle,
      rules,
      customProperties
    );

    // Only carry forward inheritable properties
    const nextInherited: Record<string, string> = { ...inherited };
    for (const [prop, value] of Object.entries(resolved)) {
      if (INHERITED_PROPS.has(prop) && value && !value.startsWith("var(")) {
        nextInherited[prop] = value;
      }
    }
    inherited = nextInherited;
  }

  return inherited;
}

/** Properties that inherit by default (must match style-resolver). */
const INHERITED_PROPS = new Set([
  "color", "font-family", "font-size", "font-style", "font-weight",
  "font-variant", "letter-spacing", "line-height", "text-align",
  "text-decoration", "text-indent", "text-transform", "white-space",
  "word-spacing", "visibility", "cursor", "direction",
]);

function buildElementSelector(el: Cheerio<AnyNode>, querySelector: string): string {
  const classes = el.attr("class");
  const id = el.attr("id");
  const tagName = (el.prop("tagName") ?? "").toLowerCase();

  if (id) return `${tagName}#${id}`;
  if (classes) {
    const classList = classes
      .split(/\s+/)
      .filter((c) => c && !c.startsWith("js-") && c.length < 40)
      .slice(0, 3);
    if (classList.length > 0) return `${tagName}.${classList.join(".")}`;
  }

  return querySelector;
}

/**
 * Visibility check that catches class-based hiding patterns.
 */
function isVisible(_$: CheerioAPI, el: Cheerio<AnyNode>): boolean {
  // Inline style checks
  const style = el.attr("style") ?? "";
  if (/display\s*:\s*none/i.test(style)) return false;
  if (/visibility\s*:\s*hidden/i.test(style)) return false;

  // Attribute-based hiding
  if (el.attr("aria-hidden") === "true") return false;
  if (el.attr("hidden") != null) return false;

  // Class-based hiding patterns (sr-only, visually-hidden, etc.)
  const classes = el.attr("class") ?? "";
  if (HIDDEN_CLASS_PATTERN.test(classes)) return false;

  // Check for zero-size clip patterns in inline style
  if (/clip\s*:\s*rect\(0/i.test(style)) return false;
  if (/clip-path\s*:\s*inset\(50%\)/i.test(style)) return false;
  if (/position\s*:\s*absolute.*overflow\s*:\s*hidden/i.test(style) &&
      /width\s*:\s*1px/i.test(style)) return false;

  // Check ancestors for hiding (up to 3 levels)
  let parent = el.parent();
  for (let depth = 0; depth < 3 && parent.length > 0; depth++) {
    const parentStyle = parent.attr("style") ?? "";
    if (/display\s*:\s*none/i.test(parentStyle)) return false;
    if (parent.attr("aria-hidden") === "true") return false;
    if (parent.attr("hidden") != null) return false;
    const parentClasses = parent.attr("class") ?? "";
    if (HIDDEN_CLASS_PATTERN.test(parentClasses)) return false;
    parent = parent.parent();
  }

  return true;
}

/**
 * Check if critical properties for this role still contain unresolved var() references.
 */
function hasUnresolvedVars(resolved: Record<string, string>, role: StyleRole): boolean {
  const critical = isTextRole(role)
    ? ["font-family", "font-size", "color"]
    : ["border-radius", "height", "background-color"];

  let unresolvedCount = 0;
  for (const prop of critical) {
    const val = resolved[prop];
    if (val && val.includes("var(")) unresolvedCount++;
  }
  // Only reject if ALL critical props are unresolved
  return unresolvedCount >= critical.length;
}

function isControlRole(role: StyleRole): boolean {
  return ["buttonPrimary", "buttonSecondary", "input"].includes(role);
}

function isTextRole(role: StyleRole): boolean {
  return ["h1", "h2", "h3", "body", "link", "navLink", "cardTitle", "cardBody"].includes(role);
}

function isCardRole(role: StyleRole): boolean {
  return role === "cardTitle" || role === "cardBody";
}

function isIconFont(family: string): boolean {
  return ICON_FONT_PATTERN.test(family);
}

function mapToComponentStyle(
  resolved: Record<string, string>,
  sourceSelector: string,
  finder: RoleFinder
): ComponentStyle {
  const { stack, primary } = parseFontFamily(resolved["font-family"] ?? "");
  const fontSizePx = toPx(resolved["font-size"] ?? "");
  const fontWeight = parseFontWeight(resolved["font-weight"] ?? "");

  const lineHeight = parseLineHeight(
    resolved["line-height"] ?? "normal",
    fontSizePx
  );

  const letterSpacing = toPx(resolved["letter-spacing"] ?? "");
  let borderRadius = parseBorderRadius(resolved["border-radius"] ?? "");
  const borderWidth = toPx(resolved["border-width"] ?? resolved["border"] ?? "");
  const explicitHeight = toPx(resolved["height"] ?? resolved["min-height"] ?? "");

  // Clamp pill-button radius: when radius >= height/2, the visual curvature is height/2
  let paddingX: number | null = null;
  let paddingY: number | null = null;

  if (resolved["padding"]) {
    const pad = parsePadding(resolved["padding"]);
    paddingX = pad.left != null && pad.right != null ? (pad.left + pad.right) / 2 : null;
    paddingY = pad.top != null && pad.bottom != null ? (pad.top + pad.bottom) / 2 : null;
  }
  if (resolved["padding-left"] || resolved["padding-right"]) {
    const l = toPx(resolved["padding-left"] ?? "0");
    const r = toPx(resolved["padding-right"] ?? "0");
    if (l != null && r != null) paddingX = (l + r) / 2;
  }
  if (resolved["padding-top"] || resolved["padding-bottom"]) {
    const t = toPx(resolved["padding-top"] ?? "0");
    const b = toPx(resolved["padding-bottom"] ?? "0");
    if (t != null && b != null) paddingY = (t + b) / 2;
  }

  let height = explicitHeight;
  if (
    height == null &&
    isControlRole(finder.role) &&
    lineHeight.px != null &&
    paddingY != null
  ) {
    const borderContribution = borderWidth != null ? borderWidth * 2 : 0;
    height = lineHeight.px + paddingY * 2 + borderContribution;
  }

  if (borderRadius != null && height != null && height > 0 && borderRadius > height / 2) {
    borderRadius = Math.round(height / 2);
  }

  const confidence = scoreConfidence(resolved, finder);
  const backgroundColor =
    normalizeColorValue(resolved["background-color"]) ??
    normalizeColorValue(resolved["background"]);

  return {
    fontStack: stack,
    primaryFamily: primary,
    fontSizePx,
    fontWeight,
    lineHeightPx: lineHeight.px,
    lineHeightRatio: lineHeight.ratio,
    letterSpacingPx: letterSpacing,
    textTransform: resolved["text-transform"] ?? null,
    textDecoration: resolved["text-decoration"] ?? null,
    color: normalizeColorValue(resolved["color"]),
    backgroundColor,
    borderRadiusPx: borderRadius,
    borderWidthPx: borderWidth,
    heightPx: height,
    paddingXpx: paddingX,
    paddingYpx: paddingY,
    sourceSelector,
    confidence,
  };
}

function scoreConfidence(
  resolved: Record<string, string>,
  finder: RoleFinder
): "high" | "medium" | "low" {
  let score = 0;

  if (resolved["font-family"] && !resolved["font-family"].startsWith("var(")) score++;
  if (resolved["font-size"] && resolved["font-size"] !== "16px") score++;
  if (resolved["color"] && !resolved["color"].startsWith("var(")) score++;

  if (["buttonPrimary", "buttonSecondary", "input"].includes(finder.role)) {
    if (resolved["border-radius"]) score++;
    if (resolved["height"] || resolved["min-height"]) score++;
  }

  return score >= 3 ? "high" : score >= 1 ? "medium" : "low";
}

function normalizeColorValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "inherit" || trimmed === "initial" || trimmed === "unset" || trimmed === "currentColor") {
    return null;
  }
  if (trimmed.startsWith("var(")) return null;
  return trimmed;
}

function scoreCardContext($: CheerioAPI, el: Cheerio<AnyNode>): number {
  return scoreCardContextFromNode(findBestCardContainer($, el));
}

function scoreCardContextFromNode(container: Cheerio<AnyNode> | null): number {
  if (!container || container.length === 0) return 0;

  const tag = (container.prop("tagName") ?? "").toLowerCase();
  const semanticTokens = [
    container.attr("class") ?? "",
    container.attr("id") ?? "",
    container.attr("data-testid") ?? "",
    container.attr("data-state") ?? "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (/(card|panel|tile|feature|testimonial|quote|callout|story|issue|case|spotlight|item|box)/.test(semanticTokens)) {
    score += 4;
  }
  if (tag === "article" || tag === "li") {
    score += 3;
  }

  const headingCount = container.find("h2, h3, h4").length;
  const bodyCount = container.find("p").length;
  if (headingCount > 0 && bodyCount > 0) {
    score += 2;
  }

  const parent = container.parent();
  if (parent.length > 0) {
    const siblings = parent.children(tag);
    if (siblings.length >= 2) score += 1;
  }

  if (semanticTokens.includes("footer") || container.parents("footer").length > 0) {
    score -= 5;
  }

  return score;
}

function findBestCardContainer(
  $: CheerioAPI,
  el: Cheerio<AnyNode>
): Cheerio<AnyNode> | null {
  let current = el.parent();
  let best: { el: Cheerio<AnyNode>; score: number } | null = null;

  for (let depth = 0; depth < 5 && current.length > 0; depth++) {
    const tag = (current.prop("tagName") ?? "").toLowerCase();
    if (!tag) break;

    const score = scoreCardContextFromNode(current);
    if (score > 0 && (!best || score > best.score)) {
      best = { el: current, score };
    }

    if (tag === "body" || tag === "html") break;
    current = current.parent();
  }

  return best?.el ?? null;
}

function mergeTextChildStyle(
  $: CheerioAPI,
  el: Cheerio<AnyNode>,
  finder: RoleFinder,
  rules: NormalizedRule[],
  rootStyles: Record<string, string>,
  baseStyle: ComponentStyle
): ComponentStyle {
  if (!usesNestedTextStyles(finder.role)) {
    return baseStyle;
  }

  const textEl = findRepresentativeTextDescendant($, el, finder.minTextLength ?? 1);
  if (!textEl || textEl.get(0) === el.get(0)) {
    return baseStyle;
  }

  const textAncestors = getAncestorElements($, textEl);
  const scopedVars = extractCustomProperties(rules, $, [...textAncestors, textEl]);
  const ancestorStyles = resolveAncestorStyles($, textEl, rules, scopedVars, rootStyles);
  const tag = ((textEl.prop("tagName") ?? "") as string).toLowerCase() || finder.tagFallback;
  const textResolved = resolveStylesForElement(
    $,
    textEl,
    tag,
    ancestorStyles,
    textEl.attr("style") ?? null,
    rules,
    scopedVars
  );
  const textStyle = mapToComponentStyle(textResolved, buildElementSelector(textEl, tag), finder);

  return {
    ...baseStyle,
    fontStack: textStyle.fontStack || baseStyle.fontStack,
    primaryFamily: textStyle.primaryFamily || baseStyle.primaryFamily,
    fontSizePx: textStyle.fontSizePx ?? baseStyle.fontSizePx,
    fontWeight: textStyle.fontWeight ?? baseStyle.fontWeight,
    lineHeightPx: textStyle.lineHeightPx ?? baseStyle.lineHeightPx,
    lineHeightRatio: textStyle.lineHeightRatio ?? baseStyle.lineHeightRatio,
    letterSpacingPx: textStyle.letterSpacingPx ?? baseStyle.letterSpacingPx,
    textTransform: textStyle.textTransform ?? baseStyle.textTransform,
    textDecoration: preferDefined(textStyle.textDecoration, baseStyle.textDecoration),
    color: preferTextColor(textStyle.color, baseStyle.color),
  };
}

function usesNestedTextStyles(role: StyleRole): boolean {
  return role === "link" || role === "navLink" || role === "buttonPrimary" || role === "buttonSecondary";
}

function findRepresentativeTextDescendant(
  $: CheerioAPI,
  el: Cheerio<AnyNode>,
  minTextLength: number
): Cheerio<AnyNode> | null {
  const descendants = el.find("*").toArray().slice(0, 40);
  let best: { el: Cheerio<AnyNode>; score: number } | null = null;

  for (const node of descendants) {
    const candidate = $(node);
    if (!isVisible($, candidate)) continue;

    const tag = ((candidate.prop("tagName") ?? "") as string).toLowerCase();
    if (!tag || ["svg", "img", "path", "picture", "video"].includes(tag)) continue;

    const text = candidate.text().trim();
    if (text.length < minTextLength) continue;

    const score = scoreTextDescendantCandidate(candidate, text);
    if (!best || score > best.score) {
      best = { el: candidate, score };
    }
  }

  return best?.el ?? null;
}

function scoreTextDescendantCandidate(el: Cheerio<AnyNode>, text: string): number {
  const tag = ((el.prop("tagName") ?? "") as string).toLowerCase();
  const classes = el.attr("class") ?? "";
  const id = el.attr("id") ?? "";

  let score = 0;

  if (["span", "div", "p", "strong", "em", "small"].includes(tag)) score += 2;
  if (classes || id) score += 2;
  if (el.children().length === 0) score += 3;
  if (text.length >= 2 && text.length <= 80) score += 2;
  if (/(text|label|title|copy|content|inner|button|link|nav|caption)/i.test(`${classes} ${id}`)) score += 2;

  return score;
}

function preferTextColor(
  preferred: string | null,
  fallback: string | null
): string | null {
  if (preferred && preferred !== "LinkText") return preferred;
  if (fallback && fallback !== "LinkText") return fallback;
  return preferred ?? fallback;
}

function preferDefined<T>(preferred: T | null, fallback: T | null): T | null {
  return preferred ?? fallback;
}

const CTA_TEXT_RE =
  /\b(get started|start|try|try now|sign up|book|demo|talk to sales|contact sales|contact us|join|create|launch|build|download|install|buy now|request)\b/i;

const MENU_TRIGGER_TEXT_RE =
  /^(product|products|features|pricing|docs|documentation|resources|company|developers|developer|solutions|customers|blog|about)$/i;

const NAV_SEMANTIC_RE =
  /nav|navbar|sidebar|navitem|menu|dropdown|submenu|popover|trigger|accordion|tab|item/i;
