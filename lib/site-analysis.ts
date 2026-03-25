import { lookup } from "node:dns/promises";
import { load } from "cheerio";
import { colorDistance, hexToHsl, hslToHex, rgbToHex } from "./color-utils";
import { fetchWithBrowser } from "./browser-fetch";
import { fetchAllCss } from "./css-fetch";
import type { CssFetchResult } from "./css-fetch";
import { parseCssSources } from "./css-parser";
import { buildPrompt } from "./prompt-builder";
import { extractComponentStyleVariants, extractComponentStyles } from "./role-extractor";
import { backfillLegacyFromRoles } from "./analysis-types";
import type {
  ComponentStyles,
  ExtractionDiagnostics,
  FontRoleMap,
  PaletteSwatch,
  WebsiteAnalysis,
} from "./analysis-types";

export type { WebsiteAnalysis } from "./analysis-types";

const REQUEST_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "accept-encoding": "gzip, deflate, br",
  "cache-control": "no-cache",
  "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

const GENERIC_FONTS = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "helvetica",
  "arial",
]);

const WIDTH_TOKENS: Record<string, string> = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  "3xl": "1728px",
  "4xl": "1920px",
  "5xl": "2080px",
  "6xl": "2304px",
  "7xl": "2560px",
};

type FetchPageResult = {
  html: string;
  finalUrl: string;
  $: ReturnType<typeof load>;
  allCss: string;
  combinedText: string;
  cssResult: CssFetchResult;
};

/**
 * Fetch a page's HTML and CSS.
 * Fast path: plain fetch. Fallback: headless Chromium for bot-protected sites.
 */
async function fetchPage(normalizedUrl: string): Promise<FetchPageResult> {
  let html: string;
  let finalUrl: string;
  let browserStylesheets: string[] | null = null;

  // Try fast fetch first
  const response = await fetch(normalizedUrl, {
    headers: REQUEST_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);

  const needsBrowser =
    !response ||
    response.status === 403 ||
    response.status === 503;

  if (!needsBrowser && response && response.ok) {
    html = await response.text();
    finalUrl = response.url;
  } else {
    // Fallback: headless browser
    try {
      const result = await fetchWithBrowser(normalizedUrl);
      html = result.html;
      finalUrl = result.finalUrl;
      browserStylesheets = result.stylesheetUrls;
    } catch {
      // If browser also fails, throw a clear error
      const status = response?.status;
      if (status === 403 || status === 503) {
        throw new Error(
          "That site uses bot protection and blocked the request, even with a headless browser."
        );
      }
      throw new Error(
        `Could not reach that site${status ? ` (HTTP ${status})` : ""}.`
      );
    }
  }

  const $ = load(html);

  const inlineCssBlocks = $("style")
    .map((_, element) => $(element).text())
    .get()
    .filter(Boolean) as string[];

  // Collect stylesheet URLs from HTML, merge with any captured by the browser
  const htmlStylesheets = $("link")
    .map((_, element) => {
      const rel = ($(element).attr("rel") ?? "").toLowerCase();
      if (!rel.includes("stylesheet")) return null;
      const href = $(element).attr("href");
      return href ? resolveUrl(finalUrl, href) : null;
    })
    .get()
    .filter(Boolean) as string[];

  const stylesheetUrls = [
    ...new Set([...htmlStylesheets, ...(browserStylesheets ?? [])]),
  ];

  const cssResult = await fetchAllCss(inlineCssBlocks, stylesheetUrls);
  const allCss = cssResult.combined;
  const combinedText = `${html}\n${allCss}`;

  return { html, finalUrl, $, allCss, combinedText, cssResult };
}

export async function analyzeSite(inputUrl: string): Promise<WebsiteAnalysis> {
  const normalizedUrl = normalizeUrl(inputUrl);
  await validateUrl(normalizedUrl);
  // --- Fetch HTML: fast path (fetch) → fallback (headless browser) ---
  const { html, finalUrl, $, allCss, combinedText, cssResult } =
    await fetchPage(normalizedUrl);

  // Detect Cloudflare challenge pages that slipped through
  const titleText = $("title").first().text().toLowerCase();
  if (
    titleText.includes("attention required") ||
    titleText.includes("just a moment") ||
    titleText.includes("access denied")
  ) {
    throw new Error(
      "That site requires solving a CAPTCHA (Cloudflare). The goblin can't get past interactive challenges yet."
    );
  }

  const title = cleanText(
    $("title").first().text() ||
      $('meta[property="og:title"]').attr("content") ||
      hostname(finalUrl)
  );
  const description = cleanText(
    $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      ""
  );

  const palette = extractPalette(combinedText);
  const baseFonts = extractFonts($, allCss);
  const fontDetails = extractFontSizes(allCss, html);
  const fonts = { ...baseFonts, ...fontDetails };
  const sections = extractSections($);
  const radius = extractRadius(html, allCss);
  const shadow = extractShadow(html, allCss);
  const header = extractHeader($);
  const footer = extractFooter($);
  const borders = extractBorders(html, allCss, radius);
  const layout = extractLayout($, html, allCss);
  const buttonDetails = extractButtonDetails(html, allCss);
  const tags = buildTags({
    palette,
    fonts,
    radius,
    shadow,
    layout,
    sections,
    text: $.text().toLowerCase(),
  });
  // --- V2 extraction pipeline: parse CSS → resolve per-role styles ---
  let componentStyles: ComponentStyles | undefined;
  let componentStyleVariants: import("./analysis-types").ComponentStyleVariants | undefined;
  let diagnostics: ExtractionDiagnostics | undefined;

  try {
    const parsedRules = parseCssSources(cssResult.sources);
    componentStyleVariants = extractComponentStyleVariants($, parsedRules);
    componentStyles = extractComponentStyles($, parsedRules);

    // Backfill legacy fields from role data when available
    const backfilled = backfillLegacyFromRoles(componentStyles, {
      fonts,
      buttons: { height: buttonDetails.height, style: buttonDetails.style, radiusPx: `${Math.round(radius.average)}px` },
      borders: { cardRadius: borders.cardRadius },
    });

    // Override legacy fields with more precise role-based data
    fonts.display = backfilled.fonts.display;
    fonts.body = backfilled.fonts.body;
    fonts.headingSize = backfilled.fonts.headingSize;
    fonts.bodySize = backfilled.fonts.bodySize;
    fonts.lineHeight = backfilled.fonts.lineHeight;

    diagnostics = {
      stylesheetsRead: cssResult.sheetsRead,
      totalCssBytes: cssResult.totalBytes,
      matchedSelectorCount: parsedRules.length,
      unresolvedVars: 0,
      skippedDynamicRules: 0,
      roleConfidence: Object.fromEntries(
        Object.entries(componentStyles).map(([role, style]) => [role, style.confidence])
      ),
    };
  } catch {
    // V2 extraction failed — fall back to V1 only
  }

  const summary = buildSummary({
    title,
    tags,
    fonts,
    layout,
    radius,
    shadow,
    header,
  });

  return {
    analysisVersion: componentStyles ? (2 as const) : (1 as const),
    inputUrl,
    normalizedUrl: finalUrl,
    host: hostname(finalUrl),
    title,
    description,
    summary,
    tags,
    palette,
    fonts,
    buttons: {
      label: describeButtons(html, radius, shadow),
      radius: radius.label,
      radiusPx: componentStyles?.buttonPrimary?.borderRadiusPx != null
        ? `${Math.round(componentStyles.buttonPrimary.borderRadiusPx)}px`
        : `${Math.round(radius.average)}px`,
      shadow,
      ...buttonDetails,
    },
    header,
    footer,
    borders,
    layout,
    sections,
    componentStyles,
    componentStyleVariants,
    diagnostics,
    prompt: buildPrompt({
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
      componentStyles,
      componentStyleVariants,
    }),
  };
}


function normalizeUrl(input: string): string {
  const candidate = input.trim();

  if (URL.canParse(candidate)) {
    return candidate;
  }

  const httpsCandidate = `https://${candidate}`;
  if (URL.canParse(httpsCandidate)) {
    return httpsCandidate;
  }

  throw new Error("That URL does not look valid.");
}

async function validateUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const host = parsed.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "[::1]"
  ) {
    throw new Error("That URL points to an internal address.");
  }

  let ip: string;
  try {
    const result = await lookup(host);
    ip = result.address;
  } catch {
    throw new Error("Could not resolve that hostname.");
  }

  if (isPrivateIp(ip)) {
    throw new Error("That URL points to an internal address.");
  }
}

function isPrivateIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === "::1") return true;
  // IPv6 unique local (fd00::/8)
  if (ip.toLowerCase().startsWith("fd")) return true;

  // IPv4 checks
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;

  const [a, b] = parts;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0
  if (a === 0) return true;

  return false;
}

function resolveUrl(base: string, candidate: string): string | null {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractPalette(text: string): PaletteSwatch[] {
  const matches =
    text.match(
      /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g
    ) ?? [];

  const counts = new Map<string, number>();

  for (const match of matches) {
    const hex = normalizeColor(match);
    if (!hex) {
      continue;
    }

    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([hex]) => hex);

  const unique: string[] = [];

  for (const hex of ranked) {
    if (!unique.some((existing) => colorDistance(existing, hex) < 26)) {
      unique.push(hex);
    }
    if (unique.length === 5) {
      break;
    }
  }

  if (unique.length === 0) {
    unique.push("#f4efe7", "#1d5d49", "#201d18");
  }

  const accentIndexCandidate = unique.findIndex((hex) => {
      const { saturation, lightness } = hexToHsl(hex);
      return saturation > 36 && lightness > 18 && lightness < 82;
    });
  const accentIndex = accentIndexCandidate === -1 ? 1 : accentIndexCandidate;

  return unique.map((hex, index) => {
    let role = "support";
    if (index === 0) {
      role = "base";
    } else if (index === accentIndex) {
      role = "accent";
    } else if (index === 1) {
      role = "surface";
    }

    return { hex, role };
  });
}

function extractFonts(
  $: ReturnType<typeof load>,
  cssText: string
): FontRoleMap {
  const counts = new Map<string, number>();
  const families = cssText.match(/font-family\s*:\s*([^;}{]+)/g) ?? [];

  for (const declaration of families) {
    const value = declaration.split(":").slice(1).join(":");
    for (const candidate of splitFontList(value)) {
      counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
    }
  }

  $("link").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    if (!href.includes("family=")) {
      return;
    }

    const query = href.split("?")[1] ?? "";
    const params = new URLSearchParams(query);
    for (const family of params.getAll("family")) {
      const cleaned = decodeURIComponent(family)
        .split(":")[0]
        .replace(/\+/g, " ")
        .trim();
      if (!cleaned) {
        continue;
      }

      counts.set(cleaned, (counts.get(cleaned) ?? 0) + 3);
    }
  });

  const ranked = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name]) => name);

  const mono =
    ranked.find((font) => /mono|code|jetbrains|fira|menlo|ibm plex/i.test(font)) ??
    "No clear mono stack";

  const display =
    ranked.find((font) => /display|grotesk|sans|serif|georgia|garamond|playfair|canela|geist|satoshi|outfit/i.test(font)) ??
    ranked[0] ??
    "System sans";

  const body =
    ranked.find((font) => font !== display && !/mono|code|jetbrains|fira|menlo/i.test(font)) ??
    display;

  return {
    display,
    body,
    mono,
  };
}

function splitFontList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.replace(/["']/g, "").trim())
    .filter((part) => {
      if (!part) {
        return false;
      }

      const normalized = part.toLowerCase();
      if (GENERIC_FONTS.has(normalized)) {
        return false;
      }

      return ![
        "inherit",
        "initial",
        "unset",
        "normal",
        "revert",
      ].includes(normalized) && !normalized.startsWith("var(");
    });
}

function extractRadius(html: string, cssText: string) {
  const values: number[] = [];
  const borderMatches = cssText.matchAll(
    /border-radius\s*:\s*([0-9.]+)(px|rem)/g
  );

  for (const match of borderMatches) {
    const value = Number(match[1]);
    values.push(match[2] === "rem" ? value * 16 : value);
  }

  const roundedTokens = html.match(/rounded(?:-[\w[\]]+)?/g) ?? [];
  for (const token of roundedTokens) {
    if (token === "rounded-full") {
      values.push(999);
      continue;
    }

    if (token.includes("3xl")) {
      values.push(24);
    } else if (token.includes("2xl")) {
      values.push(18);
    } else if (token.includes("xl")) {
      values.push(12);
    } else if (token.includes("lg")) {
      values.push(10);
    } else if (token.includes("md")) {
      values.push(6);
    } else if (token.includes("sm")) {
      values.push(3);
    } else if (token === "rounded") {
      values.push(4);
    }
  }

  const average =
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 8;

  const label =
    average >= 120
      ? "Full pill controls"
      : average >= 18
        ? "Rounded controls"
        : average >= 8
          ? "Subtle rounded controls"
          : "Sharp-edged controls";

  return {
    average,
    label,
  };
}

function extractShadow(html: string, cssText: string): string {
  const shadowMatches = cssText.matchAll(/box-shadow\s*:\s*([^;}{]+)/g);
  const blurValues: number[] = [];

  for (const match of shadowMatches) {
    const pxValues = [...match[1].matchAll(/(-?[0-9.]+)px/g)].map((item) =>
      Number(item[1])
    );
    if (pxValues.length >= 3) {
      blurValues.push(Math.abs(pxValues[2]));
    }
  }

  const htmlShadowSignals = (html.match(/shadow(?:-[\w/[\]]+)?/g) ?? []).length;
  const averageBlur =
    blurValues.length > 0
      ? blurValues.reduce((sum, value) => sum + value, 0) / blurValues.length
      : 0;

  if (averageBlur === 0 && htmlShadowSignals === 0) {
    return "Mostly flat surfaces";
  }
  if (averageBlur < 14 && htmlShadowSignals < 10) {
    return "Soft edge lift";
  }
  if (averageBlur < 28) {
    return "Layered floating surfaces";
  }
  return "Diffuse atmospheric shadows";
}

function extractFontSizes(cssText: string, html: string) {
  const sizes: number[] = [];
  for (const match of cssText.matchAll(/font-size\s*:\s*([0-9.]+)(px|rem)/g)) {
    const value = Number(match[1]);
    sizes.push(match[2] === "rem" ? value * 16 : value);
  }

  const textClasses = html.match(/text-(\d+)?xl|text-[lsb]g|text-[0-9]+/g) ?? [];
  for (const cls of textClasses) {
    if (cls.includes("6xl")) sizes.push(60);
    else if (cls.includes("5xl")) sizes.push(48);
    else if (cls.includes("4xl")) sizes.push(36);
    else if (cls.includes("3xl")) sizes.push(30);
    else if (cls.includes("2xl")) sizes.push(24);
    else if (cls.includes("xl")) sizes.push(20);
    else if (cls.includes("lg")) sizes.push(18);
    else if (cls.includes("base") || cls.includes("bg")) sizes.push(16);
    else if (cls.includes("sm")) sizes.push(14);
  }

  const sorted = sizes.filter((s) => s >= 10 && s <= 120).sort((a, b) => b - a);
  const headingSize = sorted.length > 0 ? `${Math.round(sorted[0])}px` : "Around 36px";
  const bodySize = sorted.length > 2
    ? `${Math.round(sorted[Math.floor(sorted.length * 0.6)])}px`
    : "Around 16px";

  const lineHeights: number[] = [];
  for (const match of cssText.matchAll(/line-height\s*:\s*([0-9.]+)/g)) {
    const val = Number(match[1]);
    if (val > 0 && val < 4) lineHeights.push(val);
  }
  const avgLh = lineHeights.length > 0
    ? (lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length).toFixed(2)
    : "1.5";

  return { headingSize, bodySize, lineHeight: avgLh };
}

function extractButtonDetails(html: string, cssText: string) {
  const heights: number[] = [];
  for (const match of cssText.matchAll(/(?:height|min-height)\s*:\s*([0-9.]+)(px|rem)/g)) {
    const val = Number(match[1]);
    const px = match[2] === "rem" ? val * 16 : val;
    if (px >= 28 && px <= 64) heights.push(px);
  }

  const hTokens = html.match(/h-(\d+|[\[\d.]+(?:px|rem)\])/g) ?? [];
  for (const token of hTokens) {
    const numMatch = token.match(/h-(\d+)/);
    if (numMatch) {
      const px = Number(numMatch[1]) * 4;
      if (px >= 28 && px <= 64) heights.push(px);
    }
  }

  const avgHeight = heights.length > 0
    ? `${Math.round(heights.reduce((a, b) => a + b, 0) / heights.length)}px`
    : "Around 40px";

  const hasFill = /bg-|background-color/.test(html.toLowerCase());
  const hasOutline = /border(?!-radius)|outline/.test(html.toLowerCase());
  const hasGhost = /ghost|text-btn|btn-link/.test(html.toLowerCase());
  const style = hasFill ? "Solid fill" : hasOutline ? "Outlined" : hasGhost ? "Ghost / text" : "Mixed";

  return { height: avgHeight, style };
}

function extractBorders(html: string, cssText: string, radius: { average: number }) {
  const borderWidths: number[] = [];
  for (const match of cssText.matchAll(/border(?:-width)?\s*:\s*([0-9.]+)(px|rem)/g)) {
    const val = Number(match[1]);
    borderWidths.push(match[2] === "rem" ? val * 16 : val);
  }

  const hasBorderTokens = (html.match(/border(?!-radius)(?:-[\w]+)?/g) ?? []).length;
  const avgBorder = borderWidths.length > 0
    ? borderWidths.reduce((a, b) => a + b, 0) / borderWidths.length
    : hasBorderTokens > 5 ? 1 : 0;

  const width = avgBorder === 0 ? "No visible borders"
    : avgBorder <= 1 ? "Hairline (1px)"
    : avgBorder <= 2 ? "Subtle (2px)"
    : "Heavy borders";

  const cardRadii: number[] = [];
  for (const match of cssText.matchAll(/border-radius\s*:\s*([0-9.]+)(px|rem)/g)) {
    const val = Number(match[1]);
    const px = match[2] === "rem" ? val * 16 : val;
    if (px >= 4 && px < 999) cardRadii.push(px);
  }
  const avgCardRadius = cardRadii.length > 0
    ? Math.round(cardRadii.reduce((a, b) => a + b, 0) / cardRadii.length)
    : Math.round(radius.average);

  const cardShadowMatches = [...cssText.matchAll(/box-shadow\s*:\s*([^;}{]+)/g)];
  const cardShadow = cardShadowMatches.length === 0 ? "No card shadows"
    : cardShadowMatches.length < 5 ? "Sparse shadow use"
    : "Heavy shadow layering";

  return {
    width,
    cardRadius: `${avgCardRadius}px`,
    cardShadow,
  };
}

function extractHeader($: ReturnType<typeof load>) {
  const element = $("header, nav").first();
  if (!element.length) {
    return { label: "No obvious nav frame", height: "Unknown", navLinks: 0, hasCta: false };
  }

  const tokenString = [
    element.attr("class"),
    element.attr("style"),
    element.attr("id"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const sticky = /sticky|fixed/.test(tokenString);
  const glass = /backdrop|blur|transparent|opacity/.test(tokenString);
  const bordered = /border|divider/.test(tokenString);

  let label: string;
  if (sticky && glass) label = "Sticky glass rail";
  else if (sticky && bordered) label = "Sticky framed nav";
  else if (sticky) label = "Sticky top rail";
  else if (glass) label = "Translucent nav shell";
  else label = "Anchored top navigation";

  const navLinks = element.find("a").length;
  const ctaText = element.text().toLowerCase();
  const hasCta = /sign up|get started|try|start|demo|contact|book|log in|sign in/.test(ctaText);

  const heightMatches = tokenString.match(/h-(\d+)/);
  const height = heightMatches ? `${Number(heightMatches[1]) * 4}px` : "Auto";

  return { label, height, navLinks, hasCta };
}

function extractFooter($: ReturnType<typeof load>) {
  const footer = $("footer").first();
  if (!footer.length) {
    return { label: "No footer detected", columns: "Unknown" };
  }

  const links = footer.find("a").length;
  const lists = footer.find("ul, ol").length;
  const headings = footer.find("h2, h3, h4, h5, h6").length;

  const label = links > 30 ? "Mega footer with extensive links"
    : links > 12 ? "Multi-column link footer"
    : links > 4 ? "Compact footer"
    : "Minimal footer";

  const columns = headings > 0 ? `${headings} column groups`
    : lists > 1 ? `${lists} list groups`
    : "Single section";

  return { label, columns };
}

function extractSections($: ReturnType<typeof load>): string[] {
  const text = $.text().toLowerCase();
  const sections: string[] = [];

  if ($("h1").length) {
    sections.push("hero");
  }
  if (/pricing|plans|per month|enterprise/.test(text)) {
    sections.push("pricing");
  }
  if (/testimonial|customers|loved by|trusted by/.test(text)) {
    sections.push("social proof");
  }
  if (/faq|frequently asked/.test(text)) {
    sections.push("faq");
  }
  if (/features|capabilities|why/.test(text)) {
    sections.push("feature band");
  }
  if (/integrations|partners/.test(text)) {
    sections.push("integrations");
  }
  if (/blog|newsroom|articles/.test(text)) {
    sections.push("editorial feed");
  }
  if ($("footer").length) {
    sections.push("footer");
  }

  if (sections.length === 0) {
    sections.push("single-page splash", "footer");
  }

  return [...new Set(sections)];
}

function extractLayout(
  $: ReturnType<typeof load>,
  html: string,
  cssText: string
) {
  const text = cleanText($.text());
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const links = $("a").length;
  const sections = $("section").length || 1;

  const firstHeading = $("h1").first();
  const headingWrapper = firstHeading.parent();
  const wrapperTokens = [
    firstHeading.attr("class"),
    headingWrapper.attr("class"),
    firstHeading.closest("section").attr("class"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const structure = /text-center|justify-center|items-center/.test(wrapperTokens)
    ? "Center-stage hero"
    : /grid|grid-cols-2|md:grid-cols-2|lg:grid-cols-2|flex/.test(wrapperTokens)
      ? "Split-screen lead"
      : "Left-anchored narrative";

  const width = guessWidth(html, cssText);
  const averageWordsPerSection = wordCount / sections;
  const spacing =
    averageWordsPerSection < 95
      ? "Airy rhythm"
      : averageWordsPerSection < 180
        ? "Balanced rhythm"
        : "Compressed rhythm";
  const density =
    links > 60 || averageWordsPerSection > 200
      ? "Dense"
      : links > 24 || averageWordsPerSection > 110
        ? "Balanced"
        : "Spacious";

  const gaps: number[] = [];
  for (const match of cssText.matchAll(/gap\s*:\s*([0-9.]+)(px|rem)/g)) {
    const val = Number(match[1]);
    gaps.push(match[2] === "rem" ? val * 16 : val);
  }
  const gapTokens = html.match(/gap-(\d+)/g) ?? [];
  for (const token of gapTokens) {
    const numMatch = token.match(/gap-(\d+)/);
    if (numMatch) gaps.push(Number(numMatch[1]) * 4);
  }
  const avgGap = gaps.length > 0
    ? `${Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)}px`
    : "Unknown";

  const paddings: number[] = [];
  for (const match of cssText.matchAll(/padding(?:-top|-bottom)?\s*:\s*([0-9.]+)(px|rem)/g)) {
    const val = Number(match[1]);
    const px = match[2] === "rem" ? val * 16 : val;
    if (px >= 16 && px <= 200) paddings.push(px);
  }
  const pyTokens = html.match(/py-(\d+)/g) ?? [];
  for (const token of pyTokens) {
    const numMatch = token.match(/py-(\d+)/);
    if (numMatch) {
      const px = Number(numMatch[1]) * 4;
      if (px >= 16 && px <= 200) paddings.push(px);
    }
  }
  const avgPadding = paddings.length > 0
    ? `${Math.round(paddings.reduce((a, b) => a + b, 0) / paddings.length)}px`
    : "Unknown";

  return {
    structure,
    width,
    spacing,
    density,
    gap: avgGap,
    sectionPadding: avgPadding,
  };
}

function guessWidth(html: string, cssText: string): string {
  const widths: number[] = [];

  for (const match of cssText.matchAll(/max-width\s*:\s*([0-9.]+)(px|rem)/g)) {
    const value = Number(match[1]);
    widths.push(match[2] === "rem" ? value * 16 : value);
  }

  for (const match of html.matchAll(/max-w-(\[[^\]]+\]|[\w-]+)/g)) {
    const token = match[1];

    if (token.startsWith("[")) {
      const literal = token.slice(1, -1);
      const widthMatch = literal.match(/([0-9.]+)(px|rem)/);
      if (widthMatch) {
        const value = Number(widthMatch[1]);
        widths.push(widthMatch[2] === "rem" ? value * 16 : value);
      }
      continue;
    }

    const mapped = WIDTH_TOKENS[token];
    if (mapped) {
      widths.push(Number(mapped.replace("px", "")));
    }
  }

  if (widths.length === 0) {
    return "Around 1280px";
  }

  const relevant = widths
    .filter((width) => width >= 720 && width <= 2400)
    .sort((left, right) => left - right);
  const pool = relevant.length > 0 ? relevant : widths.sort((left, right) => left - right);
  const percentileIndex = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(pool.length * 0.75))
  );
  const rounded = Math.round(pool[percentileIndex] / 10) * 10;
  return `Around ${rounded}px`;
}

function buildTags({
  palette,
  fonts,
  radius,
  shadow,
  layout,
  sections,
  text,
}: {
  palette: PaletteSwatch[];
  fonts: FontRoleMap;
  radius: { average: number; label: string };
  shadow: string;
  layout: { structure: string; width: string; spacing: string; density: string };
  sections: string[];
  text: string;
}): string[] {
  const tags: string[] = [];
  const accent = palette.find((swatch) => swatch.role === "accent")?.hex;
  const accentHsl = accent ? hexToHsl(accent) : null;

  if (/serif|garamond|georgia|canela|playfair/i.test(fonts.display)) {
    tags.push("editorial");
  }
  if (radius.average >= 120) {
    tags.push("pill-heavy");
  }
  if (layout.density === "Dense") {
    tags.push("information-rich");
  }
  if (layout.structure === "Center-stage hero") {
    tags.push("hero-led");
  }
  if (layout.structure === "Split-screen lead") {
    tags.push("product-led");
  }
  if (/Mostly flat/.test(shadow) && radius.average < 8) {
    tags.push("brutalist");
  }
  if (accentHsl && accentHsl.saturation > 45 && accentHsl.lightness > 35) {
    tags.push("accent-driven");
  }
  if (
    /ai|code|developer|api|terminal|sdk|git|cloud/i.test(text) ||
    /mono|jetbrains|ibm plex/i.test(fonts.mono)
  ) {
    tags.push("developer-facing");
  }
  if (sections.includes("pricing") && sections.includes("social proof")) {
    tags.push("saas");
  }
  if (
    !tags.includes("editorial") &&
    !tags.includes("brutalist") &&
    !tags.includes("developer-facing")
  ) {
    tags.push("polished");
  }

  return [...new Set(tags)].slice(0, 4);
}

function buildSummary({
  title,
  tags,
  fonts,
  layout,
  radius,
  shadow,
  header,
}: {
  title: string;
  tags: string[];
  fonts: FontRoleMap;
  layout: { structure: string; width: string; spacing: string; density: string };
  radius: { label: string };
  shadow: string;
  header: { label: string };
}) {
  return `${title} reads as ${tags.join(", ")}. The site leans on ${layout.structure.toLowerCase()}, ${layout.spacing.toLowerCase()}, ${radius.label.toLowerCase()}, ${shadow.toLowerCase()}, and a ${header.label.toLowerCase()}. Typography points to ${fonts.display} for display and ${fonts.body} for body copy.`;
}

function describeButtons(
  html: string,
  radius: { average: number; label: string },
  shadow: string
): string {
  const tokenString = html.toLowerCase();
  const hasOutline = /outline|border/.test(tokenString);
  const hasGradient = /gradient/.test(tokenString);
  const hasSolid = /bg-|background/.test(tokenString);

  const fill = hasGradient
    ? "gradient fills"
    : hasSolid
      ? "solid fills"
      : hasOutline
        ? "outlined controls"
        : "quiet text controls";

  return `${radius.label.replace("controls", "").trim()} with ${fill} and ${shadow.toLowerCase()}`;
}

function normalizeColor(value: string): string | null {
  const color = value.trim().toLowerCase();

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return `#${hex
        .split("")
        .map((part) => `${part}${part}`)
        .join("")}`;
    }
    if (hex.length === 6 || hex.length === 8) {
      return `#${hex.slice(0, 6)}`;
    }
    return null;
  }

  if (color.startsWith("rgb")) {
    const numbers = color.match(/[\d.]+%?/g);
    if (!numbers || numbers.length < 3) {
      return null;
    }

    const channels = numbers.slice(0, 3).map((channel) => {
      if (channel.endsWith("%")) {
        return Math.round((Number(channel.slice(0, -1)) / 100) * 255);
      }
      return Math.round(Number(channel));
    });

    if (channels.some((channel) => Number.isNaN(channel))) {
      return null;
    }

    return rgbToHex(channels[0], channels[1], channels[2]);
  }

  if (color.startsWith("hsl")) {
    const numbers = color.match(/[\d.]+%?/g);
    if (!numbers || numbers.length < 3) {
      return null;
    }

    const h = Number(numbers[0]);
    const s = Number(numbers[1].replace("%", ""));
    const l = Number(numbers[2].replace("%", ""));
    return hslToHex(h, s, l);
  }

  return null;
}
