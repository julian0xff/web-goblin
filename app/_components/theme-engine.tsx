"use client";

import { useEffect, useRef } from "react";
import { useAnalysis } from "./analysis-context";
import { hexToHsl, hslToHex } from "@/lib/color-utils";
import { loadFontsFromAnalysis } from "@/lib/font-loader";
import type { WebsiteAnalysis } from "@/lib/site-analysis";

type ThemeVars = Record<string, string>;

function sortByLightness(colors: { hex: string; role: string }[]) {
  return [...colors].sort((a, b) => {
    const aL = hexToHsl(a.hex).lightness;
    const bL = hexToHsl(b.hex).lightness;
    return bL - aL;
  });
}

function withOpacity(hex: string, opacity: number): string {
  const { r, g, b } = (() => {
    const n = hex.replace("#", "");
    return {
      r: Number.parseInt(n.slice(0, 2), 16),
      g: Number.parseInt(n.slice(2, 4), 16),
      b: Number.parseInt(n.slice(4, 6), 16),
    };
  })();
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function blendColor(light: string, dark: string, t: number): string {
  const lHsl = hexToHsl(light);
  const dHsl = hexToHsl(dark);
  return hslToHex(
    lHsl.hue + (dHsl.hue - lHsl.hue) * t,
    lHsl.saturation + (dHsl.saturation - lHsl.saturation) * t,
    lHsl.lightness + (dHsl.lightness - lHsl.lightness) * t
  );
}

function mapAnalysisToTheme(analysis: WebsiteAnalysis): ThemeVars {
  const palette = analysis.palette;
  const sorted = sortByLightness(palette);

  const lightest = sorted[0]?.hex ?? "#f7f2e9";
  const darkest = sorted[sorted.length - 1]?.hex ?? "#161411";
  const accent =
    palette.find((s) => s.role === "accent")?.hex ?? sorted[Math.min(2, sorted.length - 1)]?.hex ?? "#1f6b53";
  const surface =
    palette.find((s) => s.role === "surface")?.hex ?? sorted[Math.min(1, sorted.length - 1)]?.hex ?? "#f4efe7";

  const baseColor = palette.find((s) => s.role === "base")?.hex ?? sorted[sorted.length - 1]?.hex ?? darkest;
  const baseHsl = hexToHsl(baseColor);
  const isLightTheme = baseHsl.lightness > 45;

  const background = isLightTheme ? lightest : darkest;
  const foreground = isLightTheme ? darkest : lightest;
  const bgHsl = hexToHsl(background);
  const panel = hslToHex(bgHsl.hue, bgHsl.saturation, Math.min(100, bgHsl.lightness + (isLightTheme ? -3 : 5)));
  const panelStrong = hslToHex(bgHsl.hue, bgHsl.saturation, Math.min(100, bgHsl.lightness + (isLightTheme ? 2 : 8)));
  const muted = blendColor(background, foreground, 0.45);
  const paper = isLightTheme ? lightest : hslToHex(bgHsl.hue, bgHsl.saturation, Math.min(100, bgHsl.lightness + 12));
  const ink = isLightTheme ? darkest : lightest;

  const accentHsl = hexToHsl(accent);
  const accentSoft = hslToHex(accentHsl.hue, Math.min(40, accentHsl.saturation), isLightTheme ? 92 : 20);

  const support = palette.find((s) => s.role === "support")?.hex ?? surface;

  const vars: ThemeVars = {
    "--background": background,
    "--foreground": foreground,
    "--muted": muted,
    "--ink": ink,
    "--paper": paper,
    "--panel": panel,
    "--panel-strong": panelStrong,
    "--accent": accent,
    "--accent-soft": accentSoft,
    "--line": withOpacity(foreground, 0.12),
    "--skeleton": withOpacity(foreground, 0.08),
    "--gradient-accent-1": withOpacity(accent, 0.08),
    "--gradient-accent-2": withOpacity(support, 0.08),
  };

  if (analysis.borders.cardRadius && analysis.borders.cardRadius !== "0px") {
    const cardR = Number.parseInt(analysis.borders.cardRadius, 10);
    vars["--border-radius"] = `${Math.min(cardR || 20, 32)}px`;
  }
  if (analysis.buttons.radiusPx) {
    const btnR = Number.parseInt(analysis.buttons.radiusPx, 10);
    vars["--button-radius"] = btnR > 100 ? "999px" : `${btnR}px`;
  }

  // V2: use per-role button radius if available (more precise)
  const cs = analysis.componentStyles;
  if (cs?.buttonPrimary?.borderRadiusPx != null) {
    const r = Math.round(cs.buttonPrimary.borderRadiusPx);
    vars["--button-radius"] = r > 100 ? "999px" : `${r}px`;
  }
  if (cs?.cardTitle?.borderRadiusPx != null) {
    const r = Math.min(Math.round(cs.cardTitle.borderRadiusPx), 32);
    vars["--border-radius"] = `${r}px`;
  }

  return vars;
}

function applyTheme(vars: ThemeVars) {
  const el = document.documentElement;
  el.classList.add("theme-transitioning");

  requestAnimationFrame(() => {
    for (const [key, value] of Object.entries(vars)) {
      el.style.setProperty(key, value);
    }
  });

  setTimeout(() => {
    el.classList.remove("theme-transitioning");
  }, 900);
}

function clearTheme() {
  const el = document.documentElement;
  el.classList.add("theme-transitioning");

  requestAnimationFrame(() => {
    el.removeAttribute("style");
  });

  setTimeout(() => {
    el.classList.remove("theme-transitioning");
  }, 900);
}

export function ThemeEngine() {
  const { analysis } = useAnalysis();
  const prevAnalysisRef = useRef<WebsiteAnalysis | null>(null);

  useEffect(() => {
    if (analysis && analysis !== prevAnalysisRef.current) {
      prevAnalysisRef.current = analysis;

      void (async () => {
        await loadFontsFromAnalysis(analysis.fonts);

        const vars = mapAnalysisToTheme(analysis);

        if (analysis.fonts.display) {
          vars["--font-display"] = `"${analysis.fonts.display}", var(--font-geist-sans), sans-serif`;
        }
        if (analysis.fonts.body) {
          vars["--font-body"] = `"${analysis.fonts.body}", var(--font-geist-sans), sans-serif`;
        }

        applyTheme(vars);
      })();
    } else if (!analysis && prevAnalysisRef.current) {
      prevAnalysisRef.current = null;
      clearTheme();
    }
  }, [analysis]);

  return null;
}
