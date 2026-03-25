import { describe, test, expect } from "bun:test";
import { load } from "cheerio";
import { parseCss } from "../css-parser";
import { extractComponentStyleVariants, extractComponentStyles } from "../role-extractor";

describe("extractComponentStyles", () => {
  test("extracts h1 styles from simple page", () => {
    const html = `
      <html>
      <body>
        <h1 class="title">Welcome to our site</h1>
        <p>This is body text that has enough content to qualify as a body paragraph.</p>
        <a href="/about">Learn more</a>
      </body>
      </html>
    `;
    const css = `
      h1 { font-family: "Geist", sans-serif; font-size: 48px; font-weight: 700; color: #1a1a1a; }
      p { font-family: "Inter", sans-serif; font-size: 16px; line-height: 1.6; color: #666; }
      a { color: #0066cc; text-decoration: underline; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.h1).toBeDefined();
    expect(styles.h1!.fontSizePx).toBe(48);
    expect(styles.h1!.fontWeight).toBe(700);
    expect(styles.h1!.primaryFamily).toBe("Geist");

    expect(styles.body).toBeDefined();
    expect(styles.body!.fontSizePx).toBe(16);
    expect(styles.body!.primaryFamily).toBe("Inter");

    expect(styles.link).toBeDefined();
  });

  test("extracts button styles", () => {
    const html = `
      <html>
      <body>
        <h1>Title</h1>
        <button type="submit" class="btn-primary">Get started</button>
        <button class="btn-outline secondary">Learn more</button>
      </body>
      </html>
    `;
    const css = `
      .btn-primary {
        background-color: #0066cc;
        color: white;
        border-radius: 8px;
        height: 44px;
        padding: 12px 24px;
        font-size: 14px;
      }
      .btn-outline {
        border: 1px solid #ddd;
        border-radius: 8px;
        height: 44px;
        padding: 12px 24px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(8);
    expect(styles.buttonPrimary!.heightPx).toBe(44);
    expect(styles.buttonPrimary!.backgroundColor).toBe("#0066cc");
  });

  test("rejects icon fonts for text roles", () => {
    const html = `
      <html>
      <body>
        <h1 class="icon-heading">Icon heading</h1>
        <h1 class="real-heading">Welcome to the website</h1>
        <p class="body-text">This is enough body text to pass the minimum length requirement for extraction.</p>
      </body>
      </html>
    `;
    const css = `
      .icon-heading { font-family: "FontAwesome", sans-serif; font-size: 48px; }
      .real-heading { font-family: "Geist", sans-serif; font-size: 48px; }
      .body-text { font-family: "Inter", sans-serif; font-size: 16px; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    // Should skip the FontAwesome h1 and find the Geist one
    expect(styles.h1).toBeDefined();
    expect(styles.h1!.primaryFamily).not.toMatch(/fontawesome/i);
    expect(styles.h1!.primaryFamily).toBe("Geist");
  });

  test("extracts nav link styles", () => {
    const html = `
      <html>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
        </nav>
        <h1>Main heading for the page</h1>
        <p>Body text content that is long enough for extraction to work properly here.</p>
      </body>
      </html>
    `;
    const css = `
      nav a { font-size: 14px; font-weight: 500; color: #333; text-decoration: none; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.navLink).toBeDefined();
    expect(styles.navLink!.fontSizePx).toBe(14);
  });

  test("extracts input styles", () => {
    const html = `
      <html>
      <body>
        <h1>Contact us</h1>
        <input type="text" class="form-input" placeholder="Your name" />
      </body>
      </html>
    `;
    const css = `
      .form-input {
        border-radius: 12px;
        height: 48px;
        border: 1px solid #ddd;
        padding: 8px 16px;
        font-size: 16px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.input).toBeDefined();
    expect(styles.input!.borderRadiusPx).toBe(12);
    expect(styles.input!.heightPx).toBe(48);
  });

  test("inherits text typography from nested button/link labels", () => {
    const html = `
      <html>
      <body>
        <nav>
          <a href="/" class="button black medium">
            <div class="top">
              <div class="icon-text white">Start with heuristic 1</div>
            </div>
          </a>
        </nav>
      </body>
      </html>
    `;
    const css = `
      .button.black.medium {
        background-color: #222;
        border-radius: 6px;
        padding: .5rem .75rem;
      }
      .icon-text.white {
        color: #fff;
      }
      .icon-text {
        font-family: "Geistmono", Tahoma, sans-serif;
        font-size: .813rem;
        font-weight: 400;
        line-height: 100%;
        text-transform: uppercase;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.navLink).toBeDefined();
    expect(styles.navLink!.primaryFamily).toBe("Geistmono");
    expect(styles.navLink!.fontSizePx).toBeCloseTo(13.008, 2);
    expect(styles.navLink!.textTransform).toBe("uppercase");
    expect(styles.navLink!.color).toBe("#fff");

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.primaryFamily).toBe("Geistmono");
    expect(styles.buttonPrimary!.fontSizePx).toBeCloseTo(13.008, 2);
    expect(styles.buttonPrimary!.color).toBe("#fff");
    expect(styles.buttonPrimary!.backgroundColor).toBe("#222");
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(6);
  });

  test("resolves theme vars from html data attributes", () => {
    const html = `
      <html data-theme="dark">
      <body>
        <main>
          <h1 class="hero-title">Welcome to the site</h1>
        </main>
      </body>
      </html>
    `;
    const css = `
      [data-theme="dark"] { --color-text-primary: #f7f8f8; }
      .hero-title {
        font-family: "Inter", sans-serif;
        font-size: 48px;
        color: var(--color-text-primary);
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.h1).toBeDefined();
    expect(styles.h1!.color).toBe("#f7f8f8");
  });

  test("extracts card roles from repeated issue-view panels", () => {
    const html = `
      <html>
      <body>
        <main>
          <div class="IssueGrid">
            <div class="IssueView_root">
              <div class="IssueView_body">
                <h3 class="IssueView_title">Faster app launch</h3>
                <p class="IssueView_copy">Keep work moving with a lighter issue detail experience.</p>
              </div>
            </div>
            <div class="IssueView_root">
              <div class="IssueView_body">
                <h3 class="IssueView_title">Triage with AI</h3>
                <p class="IssueView_copy">Route requests automatically with richer context and suggestions.</p>
              </div>
            </div>
          </div>
        </main>
        <footer>
          <h3>Product</h3>
        </footer>
      </body>
      </html>
    `;
    const css = `
      .IssueView_root {
        background-color: #111;
        border-radius: 16px;
        padding: 24px;
      }
      .IssueView_title {
        font-family: "Inter", sans-serif;
        font-size: 24px;
        font-weight: 600;
        color: #f7f8f8;
      }
      .IssueView_copy {
        font-family: "Inter", sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #8a8f98;
      }
      footer h3 {
        font-size: 18px;
        color: #fff;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.cardTitle).toBeDefined();
    expect(styles.cardTitle!.fontSizePx).toBe(24);
    expect(styles.cardTitle!.color).toBe("#f7f8f8");
    expect(styles.cardBody).toBeDefined();
    expect(styles.cardBody!.fontSizePx).toBe(15);
    expect(styles.cardBody!.color).toBe("#8a8f98");
  });

  test("card body scoring prefers normal supporting copy over oversized quote text", () => {
    const html = `
      <html>
      <body>
        <main>
          <div class="CustomerQuote_card">
            <h3 class="Quote_title">Loved by teams</h3>
            <p class="Quote_body">This is an oversized testimonial sentence used as a marketing pull quote.</p>
          </div>
          <div class="IssueView_root">
            <div class="IssueView_body">
              <h3 class="IssueView_title">Faster app launch</h3>
              <p class="IssueView_copy">Keep work moving with a lighter issue detail experience.</p>
            </div>
          </div>
        </main>
      </body>
      </html>
    `;
    const css = `
      .CustomerQuote_card {
        background-color: #111;
        border-radius: 16px;
        padding: 24px;
      }
      .Quote_title {
        font-size: 20px;
        font-weight: 600;
        color: #d0d6e0;
      }
      .Quote_body {
        font-size: 32px;
        line-height: 1.125;
        color: #08090a;
      }
      .IssueView_root {
        background-color: #111;
        border-radius: 16px;
        padding: 24px;
      }
      .IssueView_title {
        font-size: 20px;
        font-weight: 600;
        color: #d0d6e0;
      }
      .IssueView_copy {
        font-size: 15px;
        line-height: 1.6;
        color: #8a8f98;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);
    const variants = extractComponentStyleVariants($, rules);

    expect(styles.cardBody).toBeDefined();
    expect(styles.cardBody!.fontSizePx).toBe(15);
    expect(styles.cardBody!.color).toBe("#8a8f98");
    expect(variants.cardBody).toBeDefined();
    expect(variants.cardBody![0].fontSizePx).toBe(15);
    expect(variants.cardBody![1].fontSizePx).toBe(32);
  });

  test("retains multiple distinct variants per role", () => {
    const html = `
      <html>
      <body>
        <main>
          <a role="button" class="cta-dark">Get started</a>
          <a role="button" class="cta-outline">Book demo</a>
          <a role="button" class="cta-dark duplicate">Start now</a>
        </main>
      </body>
      </html>
    `;
    const css = `
      .cta-dark {
        background-color: #111;
        color: #fff;
        border-radius: 10px;
        line-height: 20px;
        padding: 10px 18px;
        font-size: 15px;
      }
      .cta-outline {
        color: #111;
        border: 1px solid #111;
        border-radius: 999px;
        line-height: 20px;
        padding: 10px 18px;
        font-size: 15px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const variants = extractComponentStyleVariants($, rules);

    expect(variants.buttonPrimary).toBeDefined();
    expect(variants.buttonPrimary!.length).toBe(2);
    expect(variants.buttonPrimary![0].backgroundColor).toBe("#111");
    expect(variants.buttonPrimary![1].backgroundColor).toBeNull();
    expect(variants.buttonPrimary![1].borderRadiusPx).toBe(20);
  });

  test("handles page with no matching elements gracefully", () => {
    const html = `<html><body><div>Just a div</div></body></html>`;
    const css = `div { color: red; }`;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    // Should not crash, may have some undefined roles
    expect(styles).toBeDefined();
  });

  test("skips sr-only / visually-hidden elements", () => {
    const html = `
      <html>
      <body>
        <h1 class="sr-only">Hidden heading for screen readers</h1>
        <h1 class="hero-title">Visible hero heading on the page</h1>
        <p>This is enough body text to pass the minimum length requirement for extraction.</p>
      </body>
      </html>
    `;
    const css = `
      .sr-only { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); }
      .hero-title { font-family: "Geist", sans-serif; font-size: 64px; font-weight: 800; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.h1).toBeDefined();
    expect(styles.h1!.primaryFamily).toBe("Geist");
    expect(styles.h1!.fontSizePx).toBe(64);
  });

  test("scored picking prefers main content over footer", () => {
    const html = `
      <html>
      <body>
        <main>
          <h2 class="section-title">Main section heading with style</h2>
        </main>
        <footer>
          <h2>Footer heading</h2>
        </footer>
      </body>
      </html>
    `;
    const css = `
      .section-title { font-family: "Outfit", sans-serif; font-size: 32px; font-weight: 700; color: #111; }
      footer h2 { font-size: 18px; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.h2).toBeDefined();
    expect(styles.h2!.primaryFamily).toBe("Outfit");
    expect(styles.h2!.fontSizePx).toBe(32);
  });

  test("inherits styles from ancestor chain", () => {
    const html = `
      <html>
      <body>
        <div class="theme-wrapper">
          <h1>Heading inside themed wrapper</h1>
          <p>Body text that is long enough for extraction to find and resolve.</p>
        </div>
      </body>
      </html>
    `;
    const css = `
      .theme-wrapper { font-family: "Satoshi", sans-serif; color: #222; }
      h1 { font-size: 48px; font-weight: 700; }
      p { font-size: 16px; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.h1).toBeDefined();
    // Should inherit font-family from .theme-wrapper ancestor
    expect(styles.h1!.primaryFamily).toBe("Satoshi");
  });

  test("pill-button radius clamped to half height", () => {
    const html = `
      <html>
      <body>
        <h1>Title</h1>
        <button type="submit">Click me</button>
      </body>
      </html>
    `;
    const css = `
      button { border-radius: 999px; height: 40px; }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    // 999px on a 40px button → visual curvature is 20px (half height)
    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(20);
  });

  test("pill-button radius clamps from derived height when explicit height is absent", () => {
    const html = `
      <html>
      <body>
        <h1>Title</h1>
        <a role="button" class="pill">Get started</a>
      </body>
      </html>
    `;
    const css = `
      .pill {
        border-radius: 999px;
        line-height: 20px;
        padding: 11px 21px;
        border: 1px solid #ddd;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.heightPx).toBe(42);
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(21);
  });

  test("button scoring prefers CTA over nav trigger", () => {
    const html = `
      <html>
      <body>
        <header>
          <nav>
            <a role="button" class="nav-trigger">Product</a>
          </nav>
        </header>
        <main>
          <a role="button" class="cta">Get started</a>
        </main>
      </body>
      </html>
    `;
    const css = `
      .nav-trigger {
        border-radius: 4px;
        height: 32px;
        font-size: 13px;
      }
      .cta {
        background-color: #111;
        color: white;
        border-radius: 12px;
        line-height: 20px;
        padding: 10px 18px;
        font-size: 15px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(12);
    expect(styles.buttonPrimary!.paddingXpx).toBe(18);
    expect(styles.buttonPrimary!.sourceSelector).toContain(".cta");
  });

  test("button scoring rejects sidebar nav items in favor of main CTA", () => {
    const html = `
      <html>
      <body>
        <aside class="Sidebar_shell">
          <button class="Sidebar_navItem">Projects</button>
        </aside>
        <main>
          <button class="PrimaryButton">Start building</button>
        </main>
      </body>
      </html>
    `;
    const css = `
      .Sidebar_navItem {
        border-radius: 6px;
        height: 28px;
        font-size: 13px;
      }
      .PrimaryButton {
        background-color: #111;
        color: white;
        border-radius: 12px;
        line-height: 20px;
        padding: 10px 18px;
        font-size: 15px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.sourceSelector).toContain(".PrimaryButton");
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(12);
  });

  test("button selectors catch uppercase Button_* anchor CTAs", () => {
    const html = `
      <html>
      <body>
        <header>
          <button class="Sidebar_navItem">Projects</button>
        </header>
        <main>
          <a class="Button_root__abc Button_variant-invert__xyz">Get started</a>
        </main>
      </body>
      </html>
    `;
    const css = `
      .Sidebar_navItem {
        border-radius: 6px;
        height: 28px;
        font-size: 13px;
      }
      .Button_root__abc {
        background-color: #111;
        color: white;
        border-radius: 12px;
        line-height: 20px;
        padding: 10px 18px;
        font-size: 15px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.sourceSelector).toContain(".Button_root__abc");
    expect(styles.buttonPrimary!.paddingXpx).toBe(18);
  });

  test("button extraction resolves element-scoped custom properties", () => {
    const html = `
      <html>
      <body>
        <main>
          <a class="Button_root__abc Button_variant__base Button_size-default__size">Get started</a>
        </main>
      </body>
      </html>
    `;
    const css = `
      .Button_root__abc {
        background: none;
        color: inherit;
      }
      .Button_variant__base {
        background: #111;
        color: white;
        font-size: var(--button-font-size);
        line-height: var(--button-height);
        height: var(--button-height);
        padding: var(--button-padding);
        border-radius: var(--button-corner-radius);
      }
      .Button_size-default__size {
        --button-height: 40px;
        --button-font-size: 15px;
        --button-padding: 0 16px;
        --button-corner-radius: 4px;
      }
    `;

    const $ = load(html);
    const rules = parseCss(css, "test");
    const styles = extractComponentStyles($, rules);

    expect(styles.buttonPrimary).toBeDefined();
    expect(styles.buttonPrimary!.fontSizePx).toBe(15);
    expect(styles.buttonPrimary!.heightPx).toBe(40);
    expect(styles.buttonPrimary!.paddingXpx).toBe(16);
    expect(styles.buttonPrimary!.borderRadiusPx).toBe(4);
    expect(styles.buttonPrimary!.backgroundColor).toBe("#111");
  });
});
