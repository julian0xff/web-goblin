/**
 * Normalize CSS values to consistent units.
 * Converts rem/em to px, handles unitless line-height, strips calc() wrappers.
 */

const ROOT_FONT_SIZE = 16; // default root font size

/**
 * Parse a CSS length value to pixels. Returns null if unparseable.
 */
export function toPx(value: string, contextFontSizePx?: number): number | null {
  const trimmed = value.trim();

  // Direct pixel value
  const pxMatch = trimmed.match(/^(-?[\d.]+)\s*px$/);
  if (pxMatch) return Number(pxMatch[1]);

  // rem → px
  const remMatch = trimmed.match(/^(-?[\d.]+)\s*rem$/);
  if (remMatch) return Number(remMatch[1]) * ROOT_FONT_SIZE;

  // em → px (relative to context font size)
  const emMatch = trimmed.match(/^(-?[\d.]+)\s*em$/);
  if (emMatch) return Number(emMatch[1]) * (contextFontSizePx ?? ROOT_FONT_SIZE);

  // Bare number (used for line-height, font-weight)
  const bareMatch = trimmed.match(/^(-?[\d.]+)$/);
  if (bareMatch) return Number(bareMatch[1]);

  // pt → px (approximate)
  const ptMatch = trimmed.match(/^(-?[\d.]+)\s*pt$/);
  if (ptMatch) return Number(ptMatch[1]) * (4 / 3);

  // vw → px (assume 1440px viewport)
  const vwMatch = trimmed.match(/^(-?[\d.]+)\s*vw$/);
  if (vwMatch) return (Number(vwMatch[1]) / 100) * 1440;

  // vh/dvh → px (assume 900px viewport height)
  const vhMatch = trimmed.match(/^(-?[\d.]+)\s*(?:vh|dvh|svh|lvh)$/);
  if (vhMatch) return (Number(vhMatch[1]) / 100) * 900;

  // clamp(min, preferred, max) → use the preferred (middle) value
  const clampMatch = trimmed.match(/^clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
  if (clampMatch) {
    const preferred = toPx(clampMatch[2].trim(), contextFontSizePx);
    if (preferred != null) return preferred;
    // Fallback: try the max value
    const max = toPx(clampMatch[3].trim(), contextFontSizePx);
    if (max != null) return max;
    // Fallback: try the min value
    return toPx(clampMatch[1].trim(), contextFontSizePx);
  }

  // Simple calc() with two terms: calc(Apx + Bpx), calc(Apx - Bpx)
  const calcMatch = trimmed.match(/^calc\(\s*(.+)\s*\)$/i);
  if (calcMatch) {
    const inner = calcMatch[1].trim();
    // Try simple addition/subtraction: "16px + 4px", "100% - 20px"
    const addSub = inner.match(/^(.+?)\s*([+-])\s*(.+)$/);
    if (addSub) {
      const left = toPx(addSub[1].trim(), contextFontSizePx);
      const right = toPx(addSub[3].trim(), contextFontSizePx);
      if (left != null && right != null) {
        return addSub[2] === "+" ? left + right : left - right;
      }
    }
    // Try simple multiplication: "2 * 16px"
    const mul = inner.match(/^(-?[\d.]+)\s*\*\s*(.+)$/);
    if (mul) {
      const factor = Number(mul[1]);
      const operand = toPx(mul[2].trim(), contextFontSizePx);
      if (!Number.isNaN(factor) && operand != null) return factor * operand;
    }
  }

  return null;
}

/**
 * Parse line-height, returning both pixel value and ratio.
 */
export function parseLineHeight(
  value: string,
  fontSizePx: number | null
): { px: number | null; ratio: number | null } {
  const trimmed = value.trim();

  // "normal" → use 1.2 ratio
  if (trimmed === "normal") {
    return {
      px: fontSizePx ? fontSizePx * 1.2 : null,
      ratio: 1.2,
    };
  }

  // Unitless number → ratio
  const bareMatch = trimmed.match(/^([\d.]+)$/);
  if (bareMatch) {
    const ratio = Number(bareMatch[1]);
    return {
      px: fontSizePx ? fontSizePx * ratio : null,
      ratio,
    };
  }

  // Pixel value
  const px = toPx(trimmed, fontSizePx ?? undefined);
  if (px != null && fontSizePx) {
    return {
      px,
      ratio: px / fontSizePx,
    };
  }

  // Percentage
  const pctMatch = trimmed.match(/^([\d.]+)%$/);
  if (pctMatch) {
    const ratio = Number(pctMatch[1]) / 100;
    return {
      px: fontSizePx ? fontSizePx * ratio : null,
      ratio,
    };
  }

  return { px: px ?? null, ratio: null };
}

/**
 * Parse a font-weight value to a numeric weight.
 */
export function parseFontWeight(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  const map: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    "extra-light": 200,
    ultralight: 200,
    light: 300,
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    "semi-bold": 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    "extra-bold": 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
  };

  if (map[trimmed] != null) return map[trimmed];

  const num = Number(trimmed);
  if (!Number.isNaN(num) && num >= 1 && num <= 1000) return num;

  return null;
}

/**
 * Parse a font-family value, returning the first non-generic family.
 */
export function parseFontFamily(value: string): { stack: string; primary: string } {
  const stack = value.trim();
  const families = stack.split(",").map((f) => f.trim().replace(/["']/g, ""));

  const GENERIC = new Set([
    "sans-serif", "serif", "monospace", "system-ui", "ui-sans-serif",
    "ui-serif", "ui-monospace", "-apple-system", "blinkmacsystemfont",
    "segoe ui", "helvetica", "arial", "inherit", "initial", "unset",
  ]);

  const primary = families.find((f) => !GENERIC.has(f.toLowerCase()) && !f.startsWith("var("));
  return { stack, primary: primary ?? families[0] ?? "system-ui" };
}

/**
 * Parse border-radius value (handles shorthand: "8px", "8px 4px", "8px 4px 2px 1px").
 * Returns the average corner radius in px.
 */
export function parseBorderRadius(value: string): number | null {
  const parts = value.trim().split(/\s+/);
  const values: number[] = [];

  for (const part of parts) {
    // Skip slash notation for elliptical radii
    if (part === "/") break;
    const px = toPx(part);
    if (px != null) values.push(px);
  }

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Parse padding shorthand into top/right/bottom/left.
 */
export function parsePadding(value: string): {
  top: number | null;
  right: number | null;
  bottom: number | null;
  left: number | null;
} {
  const parts = value.trim().split(/\s+/);
  const values = parts.map((p) => toPx(p));

  switch (values.length) {
    case 1:
      return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
    case 2:
      return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
    case 3:
      return { top: values[0], right: values[1], bottom: values[2], left: values[1] };
    case 4:
      return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
    default:
      return { top: null, right: null, bottom: null, left: null };
  }
}
