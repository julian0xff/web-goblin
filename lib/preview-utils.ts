export function isTransparentLike(color: string | null | undefined): boolean {
  if (!color) return true;
  const normalized = color.trim().toLowerCase();
  return (
    normalized === "transparent" ||
    normalized === "none" ||
    normalized === "inherit" ||
    normalized === "initial" ||
    normalized === "unset"
  );
}

export function parseColorToRgb(
  color: string | null | undefined
): { r: number; g: number; b: number } | null {
  if (!color) return null;
  const normalized = color.trim().toLowerCase();

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const expanded = hex
        .slice(0, 3)
        .split("")
        .map((part) => `${part}${part}`)
        .join("");
      return {
        r: Number.parseInt(expanded.slice(0, 2), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        b: Number.parseInt(expanded.slice(4, 6), 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => part.trim());
    if (parts.length >= 3) {
      return {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2]),
      };
    }
  }

  if (normalized === "white") return { r: 255, g: 255, b: 255 };
  if (normalized === "black") return { r: 0, g: 0, b: 0 };

  return null;
}

export function isLightColor(color: string | null | undefined): boolean | null {
  const rgb = parseColorToRgb(color);
  if (!rgb) return null;

  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * channel(rgb.r) +
    0.7152 * channel(rgb.g) +
    0.0722 * channel(rgb.b);

  return luminance > 0.58;
}

export function resolveCardPreviewSurface(
  options: {
    explicitBackgroundColor?: string | null;
    textColors: Array<string | null | undefined>;
    defaultSurface?: string;
    darkSurface?: string;
  }
): string {
  const {
    explicitBackgroundColor,
    textColors,
    defaultSurface = "var(--panel)",
    darkSurface = "var(--foreground)",
  } = options;

  if (!isTransparentLike(explicitBackgroundColor)) {
    return explicitBackgroundColor!;
  }

  for (const textColor of textColors) {
    const light = isLightColor(textColor);
    if (light === true) return darkSurface;
    if (light === false) return defaultSurface;
  }

  return defaultSurface;
}

export function resolveCardPreviewBorderColor(surface: string): string {
  return surface === "var(--foreground)"
    ? "rgba(255,255,255,0.12)"
    : "var(--line)";
}
