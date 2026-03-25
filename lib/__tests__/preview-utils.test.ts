import { describe, expect, test } from "bun:test";
import {
  isLightColor,
  parseColorToRgb,
  resolveCardPreviewBorderColor,
  resolveCardPreviewSurface,
} from "../preview-utils";

describe("preview utils", () => {
  test("parses common CSS colors", () => {
    expect(parseColorToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColorToRgb("#1d1d1f")).toEqual({ r: 29, g: 29, b: 31 });
    expect(parseColorToRgb("rgb(255, 255, 255)")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColorToRgb("white")).toEqual({ r: 255, g: 255, b: 255 });
  });

  test("detects light and dark text colors", () => {
    expect(isLightColor("#f5f5f7")).toBe(true);
    expect(isLightColor("#1d1d1f")).toBe(false);
    expect(isLightColor("rgb(255, 255, 255)")).toBe(true);
  });

  test("uses explicit background color when present", () => {
    expect(
      resolveCardPreviewSurface({
        explicitBackgroundColor: "#111111",
        textColors: ["#ffffff"],
      })
    ).toEqual({ color: "#111111", source: "explicit" });
  });

  test("does not invent a dark card surface from light text alone", () => {
    expect(
      resolveCardPreviewSurface({
        explicitBackgroundColor: null,
        textColors: ["#f5f5f7"],
      })
    ).toEqual({ color: "var(--panel)", source: "fallback" });
    expect(resolveCardPreviewBorderColor("var(--foreground)")).toBe("rgba(255,255,255,0.12)");
  });

  test("falls back to default panel when card text is dark", () => {
    expect(
      resolveCardPreviewSurface({
        explicitBackgroundColor: null,
        textColors: ["#1d1d1f"],
      })
    ).toEqual({ color: "var(--panel)", source: "fallback" });
    expect(resolveCardPreviewBorderColor("var(--panel)")).toBe("var(--line)");
  });
});
