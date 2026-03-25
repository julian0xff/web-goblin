import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const host = params.get("host") ?? "unknown";
  const title = params.get("title") ?? host;
  const summary = params.get("summary") ?? "";
  const tags = (params.get("tags") ?? "").split(",").filter(Boolean);
  const palette = (params.get("palette") ?? "").split(",").filter(Boolean);
  const paletteRoles = (params.get("paletteRoles") ?? "")
    .split(",")
    .filter(Boolean);
  const fontDisplay = params.get("fontDisplay") ?? "Display";
  const fontBody = params.get("fontBody") ?? "Body";
  const layout = params.get("layout") ?? "";
  const spacing = params.get("spacing") ?? "";
  const buttons = params.get("buttons") ?? "";
  const header = params.get("header") ?? "";
  const bg = params.get("bg") || "#ece7df";
  const fg = params.get("fg") || "#191713";
  const accent = params.get("accentColor") || "#1f6b53";

  const paper = bg;
  const ink = fg;
  const frameBorder = withAlpha(ink, 0.12);
  const subtleBorder = withAlpha(ink, 0.08);
  const muted = withAlpha(ink, 0.62);
  const faint = withAlpha(ink, 0.45);
  const accentSoft = withAlpha(accent, 0.12);
  const specimenTint = withAlpha(ink, 0.035);
  const swatches = palette.slice(0, 5);

  const truncatedTitle =
    title.length > 60 ? `${title.slice(0, 57)}...` : title;
  const primaryTags = tags.slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1800px",
          height: "945px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${paper} 0%, ${withAlpha(accent, 0.08)} 42%, ${paper} 100%)`,
          color: ink,
          fontFamily:
            '"Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif',
        }}
      >
        {/* Grid texture */}
        <div
          style={{
            position: "absolute",
            inset: "0",
            backgroundImage: `
              linear-gradient(${withAlpha(ink, 0.04)} 1px, transparent 1px),
              linear-gradient(90deg, ${withAlpha(ink, 0.04)} 1px, transparent 1px)
            `,
            backgroundSize: "66px 66px",
            opacity: 0.22,
          }}
        />

        {/* Main frame */}
        <div
          style={{
            position: "absolute",
            top: "36px",
            left: "36px",
            right: "36px",
            bottom: "36px",
            display: "flex",
            borderRadius: "44px",
            border: `1px solid ${frameBorder}`,
            background: withAlpha(paper, 0.9),
            overflow: "hidden",
          }}
        >
          {/* Swatch strip */}
          <div
            style={{
              width: "60px",
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${frameBorder}`,
              background: specimenTint,
            }}
          >
            {swatches.length > 0
              ? swatches.map((hex, index) => (
                  <div
                    key={`${hex}-${index}`}
                    style={{
                      flex: 1,
                      background: hex,
                      borderBottom:
                        index < swatches.length - 1
                          ? `1px solid ${withAlpha("#000000", 0.08)}`
                          : "none",
                    }}
                  />
                ))
              : null}
          </div>

          {/* Content area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "40px 48px 34px 48px",
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "16px",
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: accent,
                    fontWeight: 700,
                  }}
                >
                  Web Goblin
                </div>
                <div
                  style={{
                    fontSize: "17px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: muted,
                    border: `1px solid ${subtleBorder}`,
                    borderRadius: "999px",
                    padding: "8px 20px",
                  }}
                >
                  {host}
                </div>
              </div>
            </div>

            {/* Two columns */}
            <div
              style={{
                display: "flex",
                gap: "44px",
                flex: 1,
              }}
            >
              {/* Left column */}
              <div
                style={{
                  width: "64%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Title */}
                <div
                  style={{
                    fontFamily: "Baskerville, Georgia, serif",
                    fontSize: "50px",
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    color: ink,
                    fontWeight: 700,
                    marginBottom: "14px",
                    maxHeight: "116px",
                    overflow: "hidden",
                  }}
                >
                  {truncatedTitle}
                </div>

                {/* Summary */}
                <div
                  style={{
                    fontSize: "20px",
                    lineHeight: 1.6,
                    color: muted,
                    marginBottom: "20px",
                  }}
                >
                  {summary}
                </div>

                {/* Tags */}
                {primaryTags.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "24px",
                    }}
                  >
                    {primaryTags.map((tag) => (
                      <div
                        key={tag}
                        style={{
                          fontSize: "15px",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: accent,
                          border: `1px solid ${withAlpha(accent, 0.22)}`,
                          background: accentSoft,
                          borderRadius: "999px",
                          padding: "8px 16px",
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Typography specimen */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    padding: "20px 24px",
                    border: `1px solid ${subtleBorder}`,
                    borderRadius: "20px",
                    background: withAlpha(ink, 0.02),
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      color: faint,
                    }}
                  >
                    Typography
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "32px",
                      alignItems: "baseline",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: 700,
                          color: ink,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {fontDisplay}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: faint,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Display
                      </div>
                    </div>
                    <div
                      style={{
                        width: "1px",
                        height: "40px",
                        background: frameBorder,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 400,
                          color: ink,
                        }}
                      >
                        {fontBody}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: faint,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Body
                      </div>
                    </div>
                    {spacing ? (
                      <>
                        <div
                          style={{
                            width: "1px",
                            height: "40px",
                            background: frameBorder,
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "22px",
                              fontWeight: 400,
                              color: ink,
                            }}
                          >
                            {spacing}
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: faint,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                            }}
                          >
                            Spacing
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Bottom bar: palette + color blocks */}
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "stretch",
                    marginTop: "auto",
                  }}
                >
                  {/* Palette swatches */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: faint,
                      }}
                    >
                      Palette Index
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      {swatches.map((hex, index) => (
                        <div
                          key={`${hex}-${index}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "44px",
                              height: "80px",
                              borderRadius: "22px",
                              background: hex,
                              border: `1px solid ${withAlpha("#000000", 0.08)}`,
                            }}
                          />
                          <div
                            style={{
                              fontSize: "11px",
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: faint,
                              maxWidth: "52px",
                              textAlign: "center",
                            }}
                          >
                            {(paletteRoles[index] ?? "").slice(0, 8)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      width: "1px",
                      background: frameBorder,
                    }}
                  />

                  {/* Color reference blocks */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      flex: 1,
                    }}
                  >
                    <MetricBlock
                      label="Background"
                      value={bg}
                      border={subtleBorder}
                      labelColor={faint}
                      valueColor={ink}
                    />
                    <MetricBlock
                      label="Text"
                      value={fg}
                      border={subtleBorder}
                      labelColor={faint}
                      valueColor={ink}
                    />
                    <MetricBlock
                      label="Accent"
                      value={accent}
                      border={subtleBorder}
                      labelColor={faint}
                      valueColor={ink}
                    />
                    <MetricBlock
                      label="Palette"
                      value={`${palette.length} colors`}
                      border={subtleBorder}
                      labelColor={faint}
                      valueColor={ink}
                    />
                  </div>
                </div>
              </div>

              {/* Right column — specimen strip */}
              <div
                style={{
                  width: "36%",
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: `1px solid ${frameBorder}`,
                  paddingLeft: "36px",
                  paddingRight: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: faint,
                    marginBottom: "18px",
                  }}
                >
                  Specimen Strip
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    flex: 1,
                  }}
                >
                  <SpecimenRow
                    title="Type pairing"
                    body={`${fontDisplay} / ${fontBody}`}
                    accent={accent}
                    border={subtleBorder}
                    textColor={ink}
                    muted={muted}
                  />
                  <SpecimenRow
                    title="Structure"
                    body={layout || "No dominant structure detected"}
                    accent={accent}
                    border={subtleBorder}
                    textColor={ink}
                    muted={muted}
                  />
                  <SpecimenRow
                    title="Controls"
                    body={buttons || "No control treatment detected"}
                    accent={accent}
                    border={subtleBorder}
                    textColor={ink}
                    muted={muted}
                  />
                  <SpecimenRow
                    title="Navigation"
                    body={header || "No dominant nav treatment detected"}
                    accent={accent}
                    border={subtleBorder}
                    textColor={ink}
                    muted={muted}
                  />
                </div>

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    paddingTop: "20px",
                  }}
                >
                  <div
                    style={{
                      height: "1px",
                      background: frameBorder,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: faint,
                      }}
                    >
                      Captured by Web Goblin
                    </div>
                    <div
                      style={{
                        width: "100px",
                        height: "14px",
                        borderRadius: "999px",
                        background: `linear-gradient(90deg, ${accent} 0%, ${withAlpha(accent, 0.18)} 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1800,
      height: 945,
    }
  );
}

function MetricBlock({
  label,
  value,
  border,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  border: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "14px 18px 16px 18px",
        border: `1px solid ${border}`,
        borderRadius: "18px",
        background: "rgba(255,255,255,0.16)",
        width: "calc(50% - 6px)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "19px",
          lineHeight: 1.35,
          color: valueColor,
          fontWeight: 600,
          overflow: "hidden",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SpecimenRow({
  title,
  body,
  accent,
  border,
  textColor,
  muted,
}: {
  title: string;
  body: string;
  accent: string;
  border: string;
  textColor: string;
  muted: string;
}) {
  const truncated = body.length > 52 ? `${body.slice(0, 49)}...` : body;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "14px 20px",
        border: `1px solid ${border}`,
        borderRadius: "18px",
        background: "rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            background: accent,
          }}
        />
        <div
          style={{
            fontSize: "14px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: muted,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          fontSize: "20px",
          lineHeight: 1.4,
          color: textColor,
        }}
      >
        {truncated}
      </div>
    </div>
  );
}

function withAlpha(color: string, opacity: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

function parseColor(
  color: string
): { r: number; g: number; b: number } | null {
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
