/**
 * Static CSS cascade resolver.
 * Given parsed CSS rules and an HTML element's selector chain,
 * resolves the final computed style per the CSS cascade:
 *   inherited baseline < UA defaults for the element < matched rules (by specificity + source order) < inline < !important
 *
 * Two modes:
 *   resolveStyles()           — string-based selector matching (for tests, ancestor resolution)
 *   resolveStylesForElement() — real DOM matching via Cheerio el.is() (for role extraction)
 */

import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { NormalizedRule, CssDeclaration } from "./css-parser";

export type ResolvedStyles = Record<string, string>;

/** Properties that inherit by default in CSS. */
const INHERITED_PROPS = new Set([
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-variant",
  "letter-spacing",
  "line-height",
  "text-align",
  "text-decoration",
  "text-indent",
  "text-transform",
  "white-space",
  "word-spacing",
  "visibility",
  "cursor",
  "direction",
  "list-style",
  "list-style-type",
  "list-style-position",
  "list-style-image",
  "quotes",
  "orphans",
  "widows",
]);

/** UA default styles for common elements. */
const UA_DEFAULTS: Record<string, Record<string, string>> = {
  h1: { "font-size": "32px", "font-weight": "700", display: "block", "margin-top": "0.67em", "margin-bottom": "0.67em" },
  h2: { "font-size": "24px", "font-weight": "700", display: "block", "margin-top": "0.83em", "margin-bottom": "0.83em" },
  h3: { "font-size": "18.72px", "font-weight": "700", display: "block", "margin-top": "1em", "margin-bottom": "1em" },
  h4: { "font-size": "16px", "font-weight": "700", display: "block" },
  p: { "font-size": "16px", "font-weight": "400", display: "block" },
  a: { "text-decoration": "underline", color: "LinkText" },
  button: { "font-size": "16px", display: "inline-block" },
  input: { "font-size": "16px", display: "inline-block" },
  body: { "font-size": "16px", "font-weight": "400", color: "#000000" },
};

/** Viewport width for media query filtering. */
const VIEWPORT_WIDTH = 1440;

type Specificity = [number, number, number];

/**
 * Resolve styles using string-based selector matching.
 * Used for tests, ancestor chain resolution, and backward compatibility.
 */
export function resolveStyles(
  targetSelector: string,
  elementTag: string,
  parentStyles: ResolvedStyles,
  inlineStyle: string | null,
  rules: NormalizedRule[],
  customProperties: Map<string, string>
): ResolvedStyles {
  const result: ResolvedStyles = {};

  for (const [prop, value] of Object.entries(parentStyles)) {
    if (INHERITED_PROPS.has(prop)) {
      result[prop] = value;
    }
  }

  for (const [prop, value] of Object.entries(UA_DEFAULTS[elementTag] ?? {})) {
    result[prop] = value;
  }

  const matched = collectMatchingRules(rules, (selector) =>
    selectorMatches(selector, targetSelector, elementTag)
  );

  applyMatchedDeclarations(result, matched);

  if (inlineStyle) {
    for (const { property, value } of parseInlineStyle(inlineStyle)) {
      result[property] = value;
    }
  }

  resolveVariables(result, customProperties);
  resolveKeywords(result, parentStyles, elementTag);
  resolveCurrentColor(result, parentStyles, elementTag);
  return result;
}

/**
 * Resolve styles using real DOM matching via Cheerio's el.is().
 * This correctly handles combinators (nav a, .hero h1, etc.).
 */
export function resolveStylesForElement(
  _$: CheerioAPI,
  el: Cheerio<AnyNode>,
  elementTag: string,
  parentStyles: ResolvedStyles,
  inlineStyle: string | null,
  rules: NormalizedRule[],
  customProperties: Map<string, string>
): ResolvedStyles {
  const result: ResolvedStyles = {};
  const targetSelector = buildElementSelectorSignature(el, elementTag);

  for (const [prop, value] of Object.entries(parentStyles)) {
    if (INHERITED_PROPS.has(prop)) {
      result[prop] = value;
    }
  }

  for (const [prop, value] of Object.entries(UA_DEFAULTS[elementTag] ?? {})) {
    result[prop] = value;
  }

  const matched = collectMatchingRules(rules, (selector) => {
    // Skip selectors that only apply in dynamic states
    if (SKIP_DYNAMIC_RE.test(selector)) return false;
    // Strip only pseudo-elements (::before, ::after, ::placeholder) — they don't affect matching
    // Keep structural/functional pseudo-classes (:first-child, :not(), :nth-child, etc.)
    const cleaned = selector.replace(/::[a-z-]+(?:\([^)]*\))?/gi, "").trim();
    if (!cleaned) return false;
    if (!selectorMatches(cleaned, targetSelector, elementTag)) return false;
    try {
      return el.is(cleaned);
    } catch {
      return false;
    }
  });

  applyMatchedDeclarations(result, matched);

  if (inlineStyle) {
    for (const { property, value } of parseInlineStyle(inlineStyle)) {
      result[property] = value;
    }
  }

  resolveVariables(result, customProperties);
  resolveKeywords(result, parentStyles, elementTag);
  resolveCurrentColor(result, parentStyles, elementTag);
  return result;
}

/** Dynamic pseudo-classes that only apply during user interaction — skip these entirely. */
const SKIP_DYNAMIC_RE = /(?<![a-z]):(hover|focus|focus-within|focus-visible|active|visited)\b/;

/**
 * Extract CSS custom properties from :root, html, body, and any element-scoped rules
 * that match a set of ancestor elements.
 */
export function extractCustomProperties(
  rules: NormalizedRule[],
  $?: CheerioAPI,
  ancestors?: Cheerio<AnyNode>[]
): Map<string, string> {
  const vars = new Map<string, string>();

  for (const rule of rules) {
    if (rule.media && !matchesDesktopMedia(rule.media)) continue;

    // Always collect from :root, html, body
    const isRoot = rule.selectors.some(
      (s) => s === ":root" || s === "html" || s === "body"
    );

    // If ancestors provided, also collect vars from rules matching any ancestor
    let matchesAncestor = false;
    if ($ && ancestors && !isRoot) {
      for (const ancestor of ancestors) {
        const ancestorTag = (ancestor.prop("tagName") ?? "").toLowerCase();
        const ancestorSelector = buildElementSelectorSignature(ancestor, ancestorTag);
        for (const selector of rule.selectors) {
          if (!selectorMatches(selector, ancestorSelector, ancestorTag)) {
            continue;
          }
          try {
            if (ancestor.is(selector)) {
              matchesAncestor = true;
              break;
            }
          } catch {
            // invalid selector
          }
        }
        if (matchesAncestor) break;
      }
    }

    if (!isRoot && !matchesAncestor) continue;

    for (const decl of rule.declarations) {
      if (decl.property.startsWith("--")) {
        vars.set(decl.property, decl.value);
      }
    }
  }

  // Resolve vars that reference other vars (one pass)
  for (const [key, value] of vars) {
    if (value.includes("var(")) {
      vars.set(key, substituteVars(value, vars));
    }
  }

  return vars;
}

// ─── Internal helpers ──────────────────────────────────────────

type MatchedDecl = { decl: CssDeclaration; specificity: Specificity; order: number };

function collectMatchingRules(
  rules: NormalizedRule[],
  matches: (selector: string) => boolean
): MatchedDecl[] {
  const matched: MatchedDecl[] = [];

  for (const rule of rules) {
    if (rule.media && !matchesDesktopMedia(rule.media)) continue;

    for (const selector of rule.selectors) {
      if (matches(selector)) {
        const specificity = calculateSpecificity(selector);
        for (const decl of rule.declarations) {
          matched.push({ decl, specificity, order: rule.sourceOrder });
        }
      }
    }
  }

  matched.sort((a, b) => {
    if (a.decl.important !== b.decl.important) return a.decl.important ? 1 : -1;
    const specCmp = compareSpecificity(a.specificity, b.specificity);
    if (specCmp !== 0) return specCmp;
    return a.order - b.order;
  });

  return matched;
}

function applyMatchedDeclarations(result: ResolvedStyles, matched: MatchedDecl[]): void {
  for (const { decl } of matched) {
    result[decl.property] = decl.value;
  }
}

/**
 * String-based selector matching (simplified, for backward compatibility).
 */
function selectorMatches(
  cssSelector: string,
  targetSelector: string,
  elementTag: string
): boolean {
  const normalized = cssSelector.trim().toLowerCase();

  if (SKIP_DYNAMIC_RE.test(normalized)) return false;

  const parts = normalized.split(/\s+(?![^(]*\))/);
  const subject = parts[parts.length - 1];

  if (subject === elementTag) return true;

  if (subject.startsWith(`${elementTag}.`) || subject.startsWith(`${elementTag}#`) || subject.startsWith(`${elementTag}[`)) {
    return true;
  }

  // Attribute-only and pseudo-class selectors may still match the real DOM element.
  // Let el.is(...) make the final decision.
  if (subject.startsWith("[") || subject.startsWith(":")) {
    return true;
  }

  const targetClasses = extractClasses(targetSelector);
  const selectorClasses = extractClasses(subject);

  if (selectorClasses.length > 0 && targetClasses.length > 0) {
    return selectorClasses.every((cls) => targetClasses.includes(cls));
  }

  const targetId = extractId(targetSelector);
  const selectorId = extractId(subject);
  if (targetId && selectorId && targetId === selectorId) return true;

  return false;
}

function extractClasses(selector: string): string[] {
  return (selector.match(/\.([a-z0-9_-]+)/gi) ?? []).map((m) => m.slice(1).toLowerCase());
}

function extractId(selector: string): string | null {
  const match = selector.match(/#([a-z0-9_-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function buildElementSelectorSignature(
  el: Cheerio<AnyNode>,
  elementTag: string
): string {
  const id = el.attr("id");
  if (id) return `${elementTag}#${id}`;

  const classes = (el.attr("class") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  if (classes.length > 0) {
    return `${elementTag}.${classes.join(".")}`;
  }

  return elementTag;
}

function calculateSpecificity(selector: string): Specificity {
  let ids = 0;
  let classes = 0;
  let elements = 0;

  const withoutPseudoElements = selector.replace(/::[a-z-]+/g, () => {
    elements++;
    return "";
  });

  ids = (withoutPseudoElements.match(/#[a-z0-9_-]+/gi) ?? []).length;

  classes += (withoutPseudoElements.match(/\.[a-z0-9_-]+/gi) ?? []).length;
  classes += (withoutPseudoElements.match(/\[[^\]]+\]/g) ?? []).length;
  classes += (withoutPseudoElements.match(/:[a-z-]+(?:\([^)]*\))?/gi) ?? []).length;

  const remaining = withoutPseudoElements
    .replace(/#[a-z0-9_-]+/gi, "")
    .replace(/\.[a-z0-9_-]+/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/:[a-z-]+(?:\([^)]*\))?/gi, "")
    .replace(/[>+~ ]/g, " ");

  elements += remaining.split(/\s+/).filter((p) => /^[a-z][a-z0-9-]*$/i.test(p.trim())).length;

  return [ids, classes, elements];
}

function compareSpecificity(a: Specificity, b: Specificity): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function matchesDesktopMedia(media: string): boolean {
  const conditions = media.toLowerCase();

  if (!conditions || conditions === "all") return true;
  if (conditions.includes("print") && !conditions.includes("screen")) return false;

  const minWidth = conditions.match(/min-width\s*:\s*(\d+(?:\.\d+)?)\s*(px|em|rem)/);
  if (minWidth) {
    const px = toViewportPx(Number(minWidth[1]), minWidth[2]);
    if (px > VIEWPORT_WIDTH) return false;
  }

  const maxWidth = conditions.match(/max-width\s*:\s*(\d+(?:\.\d+)?)\s*(px|em|rem)/);
  if (maxWidth) {
    const px = toViewportPx(Number(maxWidth[1]), maxWidth[2]);
    if (px < VIEWPORT_WIDTH) return false;
  }

  return true;
}

function toViewportPx(value: number, unit: string): number {
  if (unit === "rem" || unit === "em") return value * 16;
  return value;
}

function parseInlineStyle(style: string): { property: string; value: string }[] {
  const declarations: { property: string; value: string }[] = [];
  const parts = style.split(";");

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const property = part.slice(0, colonIdx).trim().toLowerCase();
    const value = part.slice(colonIdx + 1).trim();
    if (property && value) {
      declarations.push({ property, value });
    }
  }

  return declarations;
}

function resolveVariables(
  styles: ResolvedStyles,
  customProperties: Map<string, string>
): void {
  for (const [prop, value] of Object.entries(styles)) {
    if (value.includes("var(")) {
      styles[prop] = substituteVars(value, customProperties);
    }
  }
}

function substituteVars(value: string, vars: Map<string, string>, depth = 0): string {
  if (depth > 5) return value;

  return value.replace(/var\(\s*(--[a-z0-9_-]+)\s*(?:,\s*([^)]+))?\)/gi, (_, name, fallback) => {
    const resolved = vars.get(name);
    if (resolved) {
      return resolved.includes("var(") ? substituteVars(resolved, vars, depth + 1) : resolved;
    }
    if (fallback) {
      const trimmed = fallback.trim();
      return trimmed.includes("var(") ? substituteVars(trimmed, vars, depth + 1) : trimmed;
    }
    return value;
  });
}

/**
 * Resolve CSS keyword values (inherit, initial, unset, revert) to actual values.
 */
function resolveKeywords(
  result: ResolvedStyles,
  parentStyles: ResolvedStyles,
  elementTag: string
): void {
  const uaDefaults = UA_DEFAULTS[elementTag] ?? {};

  for (const [prop, value] of Object.entries(result)) {
    const lower = value.trim().toLowerCase();

    if (lower === "inherit") {
      // Use parent value, or UA default, or remove
      result[prop] = parentStyles[prop] ?? uaDefaults[prop] ?? "";
    } else if (lower === "initial") {
      // Use the property's initial value (UA default for this element, or empty)
      result[prop] = uaDefaults[prop] ?? "";
    } else if (lower === "unset") {
      // For inherited properties: behave like inherit. For others: behave like initial.
      if (INHERITED_PROPS.has(prop)) {
        result[prop] = parentStyles[prop] ?? uaDefaults[prop] ?? "";
      } else {
        result[prop] = uaDefaults[prop] ?? "";
      }
    } else if (lower === "revert") {
      // Revert to UA default
      result[prop] = uaDefaults[prop] ?? "";
    }
  }

  // Clean up empty strings
  for (const [prop, value] of Object.entries(result)) {
    if (value === "") delete result[prop];
  }
}

function resolveCurrentColor(
  result: ResolvedStyles,
  parentStyles: ResolvedStyles,
  elementTag: string
): void {
  const uaDefaults = UA_DEFAULTS[elementTag] ?? {};
  const inheritedColor = parentStyles.color ?? uaDefaults.color ?? "";

  for (const [prop, value] of Object.entries(result)) {
    if (value.trim().toLowerCase() !== "currentcolor") continue;

    if (prop === "color") {
      result[prop] = inheritedColor;
      continue;
    }

    result[prop] = result.color ?? inheritedColor;
  }
}
