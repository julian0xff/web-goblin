# Web Goblin

Steal the design DNA of any website.

Paste a URL, get the full breakdown: color palette, font stacks, button styles, layout metrics, spacing rhythm, and a prompt-ready style report you can hand straight to an LLM or designer.

## Run it

```bash
bun install
bun dev
```

Open [localhost:3000](http://localhost:3000).

## How it works

Two extraction pipelines run against the target site's HTML and CSS:

**V1 — regex extraction.** Fast pass over raw HTML and CSS text. Pulls fonts, colors, border radii, shadows, and layout widths using pattern matching. Good enough for a quick read.

**V2 — cascade resolution.** Parses all CSS with [css-tree](https://github.com/nicolo-ribaudo/css-tree), resolves the cascade (specificity, source order, inheritance, `!important`), then extracts per-role component styles: `h1`, `body`, `buttonPrimary`, `input`, `card`, `nav`, and more. Picks the most prominent DOM element for each role using scored candidate selection.

**Theme engine.** Maps the extracted palette to CSS custom properties, loads Google Fonts dynamically, and applies smooth transitions so the UI morphs to match the analyzed site.

**OG card.** Edge-rendered social image via `/api/card` for link previews.

## Tech stack

Next.js 16 / React 19 / Tailwind 4 / css-tree / cheerio

## Key files

### `lib/`

| File | What it does |
|---|---|
| `site-analysis.ts` | Orchestrator — fetches HTML, runs both pipelines, builds the final `WebsiteAnalysis` |
| `css-fetch.ts` | Recursive CSS fetcher — follows `@import`, deduplicates, enforces byte budget |
| `css-parser.ts` | Parses CSS into flat normalized rules (selectors, declarations, media, source order) |
| `style-resolver.ts` | Static cascade resolver — computes final styles per element through specificity + inheritance |
| `role-extractor.ts` | Picks representative DOM elements for each semantic role, resolves their styles |
| `value-normalizer.ts` | Converts CSS values to consistent units (rem/em to px, unitless line-height, etc.) |
| `color-utils.ts` | Color math — hex/rgb/hsl conversions, distance, palette sorting |
| `font-loader.ts` | Dynamic Google Fonts loader, skips system fonts |
| `analysis-types.ts` | Shared types for `WebsiteAnalysis`, `ComponentStyle`, `StyleRole` |

### `app/_components/`

| File | What it does |
|---|---|
| `main-layout.tsx` | Page shell — URL input, loading states, error handling |
| `analysis-context.tsx` | React context provider for analysis state |
| `theme-engine.tsx` | Applies extracted palette + fonts as CSS custom properties |
| `goblin-console.tsx` | Results view — palette, fonts, component styles, copy/share |
| `style-showcase.tsx` | Marketing content + loading skeleton |
