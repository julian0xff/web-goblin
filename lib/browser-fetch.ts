/**
 * Headless browser fallback for sites behind Cloudflare / bot protection.
 * Uses Playwright to render the page with a real Chromium instance,
 * waits for the challenge to resolve, then returns the final HTML + stylesheets.
 */

import { chromium, type Browser } from "playwright";

let browserInstance: Browser | null = null;
let browserCloseTimer: ReturnType<typeof setTimeout> | null = null;

const BROWSER_IDLE_MS = 60_000; // close browser after 1 min of inactivity
const PAGE_TIMEOUT_MS = 20_000;

/**
 * Get or create a shared browser instance.
 * Reuses the same browser across requests to avoid cold-start overhead.
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) {
    resetCloseTimer();
    return browserInstance;
  }

  browserInstance = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  resetCloseTimer();
  return browserInstance;
}

function resetCloseTimer() {
  if (browserCloseTimer) clearTimeout(browserCloseTimer);
  browserCloseTimer = setTimeout(async () => {
    if (browserInstance) {
      await browserInstance.close().catch(() => {});
      browserInstance = null;
    }
  }, BROWSER_IDLE_MS);
}

export type BrowserFetchResult = {
  html: string;
  finalUrl: string;
  stylesheetUrls: string[];
};

/**
 * Fetch a page using headless Chromium.
 * Waits for network idle so Cloudflare challenges can resolve.
 */
export async function fetchWithBrowser(
  url: string
): Promise<BrowserFetchResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });

  const page = await context.newPage();

  try {
    // Collect stylesheet URLs from network requests
    const stylesheetUrls: string[] = [];
    page.on("response", (response) => {
      const contentType = response.headers()["content-type"] ?? "";
      if (
        contentType.includes("text/css") ||
        response.url().endsWith(".css")
      ) {
        stylesheetUrls.push(response.url());
      }
    });

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_TIMEOUT_MS,
    });

    // Extra wait for Cloudflare challenge pages that redirect after JS execution
    const currentUrl = page.url();
    if (
      currentUrl.includes("challenge") ||
      currentUrl.includes("cdn-cgi")
    ) {
      await page.waitForURL((url) => !url.href.includes("cdn-cgi"), {
        waitUntil: "networkidle",
        timeout: 10_000,
      }).catch(() => {});
    }

    const html = await page.content();
    const finalUrl = page.url();

    // Deduplicate stylesheet URLs
    const uniqueSheets = [...new Set(stylesheetUrls)];

    return { html, finalUrl, stylesheetUrls: uniqueSheets };
  } finally {
    await context.close();
  }
}
