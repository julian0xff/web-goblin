import { describe, test, expect } from "bun:test";
import {
  toPx,
  parseLineHeight,
  parseFontWeight,
  parseFontFamily,
  parseBorderRadius,
  parsePadding,
} from "../value-normalizer";

describe("toPx", () => {
  test("px values", () => {
    expect(toPx("16px")).toBe(16);
    expect(toPx("0px")).toBe(0);
    expect(toPx("1.5px")).toBe(1.5);
  });

  test("rem values", () => {
    expect(toPx("1rem")).toBe(16);
    expect(toPx("2rem")).toBe(32);
    expect(toPx("0.875rem")).toBe(14);
  });

  test("em values with context", () => {
    expect(toPx("1.5em", 20)).toBe(30);
    expect(toPx("2em")).toBe(32); // fallback to 16px root
  });

  test("bare numbers", () => {
    expect(toPx("400")).toBe(400);
    expect(toPx("1.5")).toBe(1.5);
  });

  test("viewport units", () => {
    expect(toPx("10vw")).toBe(144);
    expect(toPx("50vh")).toBe(450);
    expect(toPx("100dvh")).toBe(900);
  });

  test("clamp() uses preferred value", () => {
    expect(toPx("clamp(16px, 2rem, 48px)")).toBe(32);
    expect(toPx("clamp(1rem, 24px, 3rem)")).toBe(24);
  });

  test("simple calc()", () => {
    expect(toPx("calc(16px + 4px)")).toBe(20);
    expect(toPx("calc(2rem - 8px)")).toBe(24);
    expect(toPx("calc(100% - 20px)")).toBeNull(); // % still unparseable
  });

  test("unparseable returns null", () => {
    expect(toPx("auto")).toBeNull();
    expect(toPx("100%")).toBeNull();
  });
});

describe("parseLineHeight", () => {
  test("unitless ratio", () => {
    const result = parseLineHeight("1.5", 16);
    expect(result.ratio).toBe(1.5);
    expect(result.px).toBe(24);
  });

  test("normal keyword", () => {
    const result = parseLineHeight("normal", 20);
    expect(result.ratio).toBe(1.2);
    expect(result.px).toBe(24);
  });

  test("px value", () => {
    const result = parseLineHeight("24px", 16);
    expect(result.px).toBe(24);
    expect(result.ratio).toBe(1.5);
  });

  test("percentage", () => {
    const result = parseLineHeight("150%", 16);
    expect(result.ratio).toBe(1.5);
    expect(result.px).toBe(24);
  });
});

describe("parseFontWeight", () => {
  test("numeric values", () => {
    expect(parseFontWeight("400")).toBe(400);
    expect(parseFontWeight("700")).toBe(700);
  });

  test("keyword values", () => {
    expect(parseFontWeight("normal")).toBe(400);
    expect(parseFontWeight("bold")).toBe(700);
    expect(parseFontWeight("semibold")).toBe(600);
    expect(parseFontWeight("light")).toBe(300);
  });

  test("unknown returns null", () => {
    expect(parseFontWeight("inherit")).toBeNull();
    expect(parseFontWeight("auto")).toBeNull();
  });
});

describe("parseFontFamily", () => {
  test("extracts primary non-generic font", () => {
    const result = parseFontFamily('"Inter", system-ui, sans-serif');
    expect(result.primary).toBe("Inter");
    expect(result.stack).toContain("Inter");
  });

  test("skips generic families", () => {
    const result = parseFontFamily("system-ui, -apple-system, sans-serif");
    expect(result.primary).toBe("system-ui");
  });

  test("handles single font", () => {
    const result = parseFontFamily("Geist");
    expect(result.primary).toBe("Geist");
  });

  test("ignores var() references", () => {
    const result = parseFontFamily('var(--font-sans), "Geist", sans-serif');
    expect(result.primary).toBe("Geist");
  });
});

describe("parseBorderRadius", () => {
  test("single value", () => {
    expect(parseBorderRadius("8px")).toBe(8);
    expect(parseBorderRadius("0.5rem")).toBe(8);
  });

  test("shorthand (4 values)", () => {
    expect(parseBorderRadius("4px 8px 12px 16px")).toBe(10); // avg
  });

  test("with slash notation (elliptical)", () => {
    expect(parseBorderRadius("8px / 16px")).toBe(8); // stops at /
  });
});

describe("parsePadding", () => {
  test("single value", () => {
    const result = parsePadding("16px");
    expect(result.top).toBe(16);
    expect(result.right).toBe(16);
    expect(result.bottom).toBe(16);
    expect(result.left).toBe(16);
  });

  test("two values", () => {
    const result = parsePadding("8px 16px");
    expect(result.top).toBe(8);
    expect(result.right).toBe(16);
    expect(result.bottom).toBe(8);
    expect(result.left).toBe(16);
  });

  test("four values", () => {
    const result = parsePadding("4px 8px 12px 16px");
    expect(result.top).toBe(4);
    expect(result.right).toBe(8);
    expect(result.bottom).toBe(12);
    expect(result.left).toBe(16);
  });
});
