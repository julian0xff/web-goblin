export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, channel)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const hue = ((h % 360) + 360) % 360;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment >= 1 && segment < 2) {
    red = x;
    green = chroma;
  } else if (segment >= 2 && segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment >= 3 && segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment >= 4 && segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return rgbToHex(
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255)
  );
}

export function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  return {
    hue,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

export function colorDistance(left: string, right: string) {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);

  return Math.sqrt(
    (leftRgb.r - rightRgb.r) ** 2 +
      (leftRgb.g - rightRgb.g) ** 2 +
      (leftRgb.b - rightRgb.b) ** 2
  );
}
