import { describe, test, expect } from "bun:test";
import { load } from "cheerio";
import {
  resolveStyles,
  resolveStylesForElement,
  extractCustomProperties,
} from "../style-resolver";
import { parseCss } from "../css-parser";

describe("extractCustomProperties", () => {
  test("extracts :root variables", () => {
    const rules = parseCss(`:root { --primary: #1a1a1a; --accent: #ff6600; }`, "test");
    const vars = extractCustomProperties(rules);
    expect(vars.get("--primary")).toBe("#1a1a1a");
    expect(vars.get("--accent")).toBe("#ff6600");
  });

  test("resolves var references within vars", () => {
    const rules = parseCss(`:root { --base: 16px; --heading: var(--base); }`, "test");
    const vars = extractCustomProperties(rules);
    expect(vars.get("--heading")).toBe("16px");
  });
});

describe("resolveStyles", () => {
  test("applies UA defaults for h1", () => {
    const resolved = resolveStyles("h1", "h1", {}, null, [], new Map());
    expect(resolved["font-size"]).toBe("32px");
    expect(resolved["font-weight"]).toBe("700");
  });

  test("applies matched rules", () => {
    const rules = parseCss(`h1 { font-size: 48px; color: #333; }`, "test");
    const resolved = resolveStyles("h1", "h1", {}, null, rules, new Map());
    expect(resolved["font-size"]).toBe("48px");
    expect(resolved["color"]).toBe("#333");
  });

  test("inline styles override matched rules", () => {
    const rules = parseCss(`h1 { font-size: 48px; }`, "test");
    const resolved = resolveStyles("h1", "h1", {}, "font-size: 64px", rules, new Map());
    expect(resolved["font-size"]).toBe("64px");
  });

  test("inherits color from parent", () => {
    const parentStyles = { color: "#1a1a1a", "font-family": '"Geist", sans-serif' };
    const resolved = resolveStyles("p", "p", parentStyles, null, [], new Map());
    expect(resolved["color"]).toBe("#1a1a1a");
    expect(resolved["font-family"]).toBe('"Geist", sans-serif');
  });

  test("UA heading defaults are not overwritten by inherited body typography", () => {
    const parentStyles = {
      color: "#111111",
      "font-family": '"Inter", sans-serif',
      "font-size": "16px",
      "font-weight": "400",
      "line-height": "1.2",
    };
    const resolved = resolveStyles("h1", "h1", parentStyles, null, [], new Map());
    expect(resolved["font-size"]).toBe("32px");
    expect(resolved["font-weight"]).toBe("700");
    expect(resolved["color"]).toBe("#111111");
    expect(resolved["font-family"]).toBe('"Inter", sans-serif');
  });

  test("resolveStylesForElement preserves UA defaults for headings and links", () => {
    const $ = load(`
      <body>
        <main>
          <h1>Heading</h1>
          <p><a href="/docs">Docs</a></p>
        </main>
      </body>
    `);
    const parentStyles = {
      color: "#111111",
      "font-family": '"Inter", sans-serif',
      "font-size": "16px",
      "font-weight": "400",
      "line-height": "1.2",
    };

    const heading = $("h1").first();
    const link = $("a").first();

    const headingResolved = resolveStylesForElement(
      $,
      heading,
      "h1",
      parentStyles,
      null,
      [],
      new Map()
    );
    const linkResolved = resolveStylesForElement(
      $,
      link,
      "a",
      parentStyles,
      null,
      [],
      new Map()
    );

    expect(headingResolved["font-size"]).toBe("32px");
    expect(headingResolved["font-weight"]).toBe("700");
    expect(linkResolved["text-decoration"]).toBe("underline");
    expect(linkResolved["color"]).toBe("LinkText");
  });

  test("resolves currentColor to inherited text color", () => {
    const parentStyles = { color: "#1a1a1a" };
    const rules = parseCss(`h3 { color: currentColor; border-color: currentColor; }`, "test");
    const resolved = resolveStyles("h3", "h3", parentStyles, null, rules, new Map());
    expect(resolved["color"]).toBe("#1a1a1a");
    expect(resolved["border-color"]).toBe("#1a1a1a");
  });

  test("resolves var() references", () => {
    const vars = new Map([["--primary", "#ff0000"]]);
    const rules = parseCss(`h1 { color: var(--primary); }`, "test");
    const resolved = resolveStyles("h1", "h1", {}, null, rules, vars);
    expect(resolved["color"]).toBe("#ff0000");
  });

  test("var() with fallback", () => {
    const rules = parseCss(`h1 { color: var(--missing, #333); }`, "test");
    const resolved = resolveStyles("h1", "h1", {}, null, rules, new Map());
    expect(resolved["color"]).toBe("#333");
  });

  test("specificity: class beats element", () => {
    const css = `
      h1 { color: red; }
      .title { color: blue; }
    `;
    const rules = parseCss(css, "test");
    const resolved = resolveStyles("h1.title", "h1", {}, null, rules, new Map());
    expect(resolved["color"]).toBe("blue");
  });

  test("!important wins", () => {
    const css = `
      .title { color: blue; }
      h1 { color: red !important; }
    `;
    const rules = parseCss(css, "test");
    const resolved = resolveStyles("h1.title", "h1", {}, null, rules, new Map());
    expect(resolved["color"]).toBe("red");
  });

  test("filters out :hover pseudo-class", () => {
    const css = `
      a { color: blue; }
      a:hover { color: red; }
    `;
    const rules = parseCss(css, "test");
    const resolved = resolveStyles("a", "a", {}, null, rules, new Map());
    expect(resolved["color"]).toBe("blue");
  });

  test("desktop media query matches", () => {
    const css = `
      h1 { font-size: 24px; }
      @media (min-width: 768px) { h1 { font-size: 48px; } }
    `;
    const rules = parseCss(css, "test");
    const resolved = resolveStyles("h1", "h1", {}, null, rules, new Map());
    expect(resolved["font-size"]).toBe("48px");
  });

  test("resolves inherit keyword from parent", () => {
    const parentStyles = { "font-family": '"Satoshi", sans-serif', color: "#222" };
    const rules = parseCss(`h1 { font-family: inherit; font-size: 48px; }`, "test");
    const resolved = resolveStyles("h1", "h1", parentStyles, null, rules, new Map());
    expect(resolved["font-family"]).toBe('"Satoshi", sans-serif');
    expect(resolved["font-size"]).toBe("48px");
  });

  test("resolves initial keyword to UA default", () => {
    const rules = parseCss(`h1 { font-weight: initial; }`, "test");
    const resolved = resolveStyles("h1", "h1", {}, null, rules, new Map());
    expect(resolved["font-weight"]).toBe("700"); // UA default for h1
  });

  test("resolves unset: inherit for inherited props, initial for others", () => {
    const parentStyles = { color: "#ff0000" };
    const rules = parseCss(`h1 { color: unset; display: unset; }`, "test");
    const resolved = resolveStyles("h1", "h1", parentStyles, null, rules, new Map());
    expect(resolved["color"]).toBe("#ff0000"); // inherited
    expect(resolved["display"]).toBe("block"); // UA default (non-inherited)
  });

  test("mobile-only media query filtered out", () => {
    const css = `
      h1 { font-size: 48px; }
      @media (max-width: 480px) { h1 { font-size: 24px; } }
    `;
    const rules = parseCss(css, "test");
    const resolved = resolveStyles("h1", "h1", {}, null, rules, new Map());
    expect(resolved["font-size"]).toBe("48px");
  });
});
