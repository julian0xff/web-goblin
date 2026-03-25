import { describe, test, expect } from "bun:test";
import { parseCss, parseCssSources } from "../css-parser";

describe("parseCss", () => {
  test("parses basic rules", () => {
    const css = `
      h1 { font-size: 32px; font-weight: 700; }
      p { font-size: 16px; line-height: 1.5; }
    `;
    const rules = parseCss(css, "test");
    expect(rules.length).toBeGreaterThanOrEqual(2);

    const h1Rule = rules.find((r) => r.selectors.includes("h1"));
    expect(h1Rule).toBeDefined();
    expect(h1Rule!.declarations.find((d) => d.property === "font-size")?.value).toBe("32px");
  });

  test("handles class selectors", () => {
    const css = `.hero-title { font-size: 48px; color: #1a1a1a; }`;
    const rules = parseCss(css, "test");
    expect(rules.length).toBe(1);
    expect(rules[0].selectors[0]).toBe(".hero-title");
  });

  test("handles media queries", () => {
    const css = `
      h1 { font-size: 24px; }
      @media (min-width: 768px) {
        h1 { font-size: 48px; }
      }
    `;
    const rules = parseCss(css, "test");
    const mediaRule = rules.find((r) => r.media != null);
    expect(mediaRule).toBeDefined();
    expect(mediaRule!.media).toContain("768px");
  });

  test("skips @keyframes rules", () => {
    const css = `
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      h1 { font-size: 32px; }
    `;
    const rules = parseCss(css, "test");
    expect(rules.length).toBe(1);
    expect(rules[0].selectors[0]).toBe("h1");
  });

  test("skips @font-face rules", () => {
    const css = `
      @font-face { font-family: "Custom"; src: url("/font.woff2"); }
      body { font-family: "Custom", sans-serif; }
    `;
    const rules = parseCss(css, "test");
    expect(rules.length).toBe(1);
    expect(rules[0].selectors[0]).toBe("body");
  });

  test("preserves source order", () => {
    const css = `
      h1 { color: red; }
      h2 { color: blue; }
      h3 { color: green; }
    `;
    const rules = parseCss(css, "test");
    expect(rules[0].sourceOrder).toBeLessThan(rules[1].sourceOrder);
    expect(rules[1].sourceOrder).toBeLessThan(rules[2].sourceOrder);
  });

  test("handles !important", () => {
    const css = `h1 { color: red !important; font-size: 32px; }`;
    const rules = parseCss(css, "test");
    const colorDecl = rules[0].declarations.find((d) => d.property === "color");
    const sizeDecl = rules[0].declarations.find((d) => d.property === "font-size");
    expect(colorDecl?.important).toBe(true);
    expect(sizeDecl?.important).toBe(false);
  });

  test("handles complex selectors", () => {
    const css = `nav a.active { color: blue; }`;
    const rules = parseCss(css, "test");
    expect(rules.length).toBe(1);
    const selector = rules[0].selectors[0];
    expect(selector).toContain("nav");
    expect(selector).toContain("a");
  });

  test("handles malformed CSS gracefully", () => {
    const css = `{{{ not valid css !!!`;
    const rules = parseCss(css, "test");
    expect(rules).toEqual([]);
  });

  test("handles CSS custom properties", () => {
    const css = `:root { --color-primary: #1a1a1a; --font-size: 16px; }`;
    const rules = parseCss(css, "test");
    expect(rules.length).toBe(1);
    const varDecl = rules[0].declarations.find((d) => d.property === "--color-primary");
    expect(varDecl).toBeDefined();
  });

  test("parsing sources independently isolates malformed CSS", () => {
    const malformedInline = `@media (max-width: 480px) { html { font-size: 16px; }`;
    const validSheet = `
      :root { --swatch--black: #222; }
      .h1 { color: var(--swatch--black); font-size: 1.125rem; }
    `;

    const combinedRules = parseCss(`${malformedInline}\n${validSheet}`, "combined");
    const mergedRules = parseCssSources([
      { cssText: malformedInline, origin: "inline:0" },
      { cssText: validSheet, origin: "sheet.css" },
    ]);

    expect(combinedRules.find((r) => r.selectors.includes(":root"))?.media).toBe("(max-width: 480px)");
    expect(combinedRules.find((r) => r.selectors.includes(".h1"))?.media).toBe("(max-width: 480px)");
    expect(mergedRules.find((r) => r.selectors.includes(":root"))?.media).toBeNull();
    expect(mergedRules.find((r) => r.selectors.includes(".h1"))?.media).toBeNull();
  });
});
