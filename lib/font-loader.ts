const loaded = new Set<string>();

const SKIP_PATTERNS = [
  /^system/i,
  /^no clear/i,
  /^-apple-system/i,
  /^blinkmacsystemfont/i,
  /^segoe ui/i,
  /^helvetica/i,
  /^arial/i,
  /^sans-serif$/i,
  /^serif$/i,
  /^monospace$/i,
  /apple.*emoji/i,
];

function shouldSkip(family: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(family.trim()));
}

export async function loadGoogleFont(family: string): Promise<void> {
  if (!family || shouldSkip(family) || loaded.has(family)) {
    return;
  }

  const encoded = encodeURIComponent(family);
  const id = `gf-${encoded}`;

  if (document.getElementById(id)) {
    loaded.add(family);
    return;
  }

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;

  return new Promise<void>((resolve) => {
    link.onload = () => {
      loaded.add(family);
      resolve();
    };
    link.onerror = () => {
      resolve();
    };
    document.head.appendChild(link);
  });
}

export async function loadFontsFromAnalysis(fonts: {
  display: string;
  body: string;
  mono: string;
}): Promise<void> {
  await Promise.all([
    loadGoogleFont(fonts.display),
    loadGoogleFont(fonts.body),
    loadGoogleFont(fonts.mono),
  ]);
}
