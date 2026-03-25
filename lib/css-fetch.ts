/**
 * Recursive CSS fetcher.
 * Follows `@import` rules, deduplicates by URL, and enforces a total byte budget.
 */

export type CssSourceText = {
  cssText: string;
  origin: string;
};

const REQUEST_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "text/css,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "sec-fetch-dest": "style",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-site": "same-origin",
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB total CSS budget
const MAX_SHEETS = 24;             // hard cap on number of stylesheets
const MAX_DEPTH = 3;               // max @import nesting depth
const SHEET_TIMEOUT = 8000;        // per-sheet fetch timeout
const SHEET_MAX_BYTES = 512_000;   // max bytes per individual sheet

export type CssFetchResult = {
  /** All CSS concatenated in source order. */
  combined: string;
  /** Individual CSS sources in source order. */
  sources: CssSourceText[];
  /** Per-sheet diagnostics. */
  sheets: SheetInfo[];
  /** Aggregate stats. */
  totalBytes: number;
  sheetsRead: number;
  sheetsFailed: number;
};

export type SheetInfo = {
  url: string;
  bytes: number;
  depth: number;
  ok: boolean;
  error?: string;
};

/**
 * Fetch all CSS for a page: inline `<style>` blocks + linked stylesheets + @imports.
 */
export async function fetchAllCss(
  inlineCssBlocks: string[],
  stylesheetUrls: string[]
): Promise<CssFetchResult> {
  const visited = new Set<string>();
  const sheets: SheetInfo[] = [];
  const parts: string[] = [];
  const sources: CssSourceText[] = [];
  let totalBytes = inlineCssBlocks.reduce(
    (sum, cssText) => sum + Buffer.byteLength(cssText, "utf-8"),
    0
  );
  let sheetsFailed = 0;

  // Always include inline CSS first
  for (let i = 0; i < inlineCssBlocks.length; i++) {
    const cssText = inlineCssBlocks[i];
    if (!cssText) continue;
    parts.push(cssText);
    sources.push({ cssText, origin: `inline:${i}` });
  }

  // BFS queue: [url, depth]
  const queue: [string, number][] = stylesheetUrls.map((url) => [url, 0]);

  while (queue.length > 0 && sheets.length < MAX_SHEETS && totalBytes < MAX_BYTES) {
    // Process current batch in parallel (same depth level)
    const batch = queue.splice(0, Math.min(queue.length, 6));
    const results = await Promise.all(
      batch.map(([url, depth]) => fetchSingleSheet(url, depth, visited))
    );

    for (const result of results) {
      if (!result) continue;

      sheets.push(result.info);

      if (!result.info.ok) {
        sheetsFailed++;
        continue;
      }

      totalBytes += result.info.bytes;
      if (totalBytes > MAX_BYTES) break;

      parts.push(result.text);
      sources.push({ cssText: result.text, origin: result.info.url });

      // Extract @import URLs from this sheet for further fetching
      if (result.info.depth < MAX_DEPTH) {
        const imports = extractImports(result.text, result.info.url);
        for (const importUrl of imports) {
          if (!visited.has(importUrl) && sheets.length + queue.length < MAX_SHEETS) {
            queue.push([importUrl, result.info.depth + 1]);
          }
        }
      }
    }
  }

  return {
    combined: parts.join("\n"),
    sources,
    sheets,
    totalBytes,
    sheetsRead: sheets.filter((s) => s.ok).length,
    sheetsFailed,
  };
}

async function fetchSingleSheet(
  url: string,
  depth: number,
  visited: Set<string>
): Promise<{ text: string; info: SheetInfo } | null> {
  // Deduplicate
  if (visited.has(url)) return null;
  visited.add(url);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(SHEET_TIMEOUT),
    });

    if (!response.ok) {
      return {
        text: "",
        info: { url, bytes: 0, depth, ok: false, error: `HTTP ${response.status}` },
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("css") && !url.endsWith(".css")) {
      return {
        text: "",
        info: { url, bytes: 0, depth, ok: false, error: "Not CSS content-type" },
      };
    }

    const text = await response.text();
    const truncated = text.slice(0, SHEET_MAX_BYTES);
    const bytes = Buffer.byteLength(truncated, "utf-8");

    return {
      text: truncated,
      info: { url, bytes, depth, ok: true },
    };
  } catch (err) {
    return {
      text: "",
      info: {
        url,
        bytes: 0,
        depth,
        ok: false,
        error: err instanceof Error ? err.message : "Fetch failed",
      },
    };
  }
}

/**
 * Extract @import URLs from CSS text.
 * Handles: @import url("..."), @import url(...), @import "..."
 */
function extractImports(cssText: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const importPattern = /@import\s+(?:url\(\s*["']?([^"')]+)["']?\s*\)|["']([^"']+)["'])/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(cssText)) !== null) {
    const raw = match[1] || match[2];
    if (!raw) continue;
    try {
      urls.push(new URL(raw, baseUrl).toString());
    } catch {
      // Invalid URL, skip
    }
  }

  return urls;
}
