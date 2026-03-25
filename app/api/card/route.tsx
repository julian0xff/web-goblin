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
  const paletteRoles = (params.get("paletteRoles") ?? "").split(",").filter(Boolean);
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

  const truncatedSummary =
    summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
  const truncatedTitle =
    title.length > 52 ? `${title.slice(0, 49)}...` : title;
  const primaryTags = tags.slice(0, 4);
  const detailBlocks = [
    { label: "Display", value: fontDisplay },
    { label: "Body", value: fontBody },
    { label: "Layout", value: layout },
    { label: "Spacing", value: spacing },
    ...(buttons ? [{ label: "Buttons", value: buttons }] : []),
    ...(header ? [{ label: "Nav", value: header }] : []),
  ].slice(0, 6);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${paper} 0%, ${withAlpha(accent, 0.08)} 42%, ${paper} 100%)`,
          color: ink,
          fontFamily: "\"Avenir Next\", \"Helvetica Neue\", Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0",
            backgroundImage: `
              linear-gradient(${withAlpha(ink, 0.04)} 1px, transparent 1px),
              linear-gradient(90deg, ${withAlpha(ink, 0.04)} 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            opacity: 0.22,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "24px",
            right: "24px",
            bottom: "24px",
            display: "flex",
            borderRadius: "30px",
            border: `1px solid ${frameBorder}`,
            background: withAlpha(paper, 0.9),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "42px",
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

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "28px 32px 22px 32px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div
                  style={{
                    fontSize: "11px",
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
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: muted,
                      border: `1px solid ${subtleBorder}`,
                      borderRadius: "999px",
                      padding: "6px 14px",
                    }}
                  >
                    {host}
                  </div>
                  <div
                    style={{
                      width: "56px",
                      height: "1px",
                      background: frameBorder,
                    }}
                  />
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: faint,
                    }}
                  >
                    Design DNA
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: faint,
                }}
              >
                Design DNA
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "32px",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "66%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontFamily: "Baskerville, Georgia, serif",
                    fontSize: "34px",
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    color: ink,
                    fontWeight: 700,
                    marginBottom: "10px",
                    maxHeight: "78px",
                    overflow: "hidden",
                  }}
                >
                  {truncatedTitle}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: muted,
                    maxWidth: "680px",
                    marginBottom: "16px",
                    maxHeight: "46px",
                    overflow: "hidden",
                  }}
                >
                  {truncatedSummary}
                </div>

                {primaryTags.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    {primaryTags.map((tag) => (
                      <div
                        key={tag}
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: accent,
                          border: `1px solid ${withAlpha(accent, 0.22)}`,
                          background: accentSoft,
                          borderRadius: "999px",
                          padding: "6px 12px",
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "stretch",
                    marginTop: "auto",
                  }}
                >
                  <div
                    style={{
                      width: "220px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: faint,
                      }}
                    >
                      Palette Index
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
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
                              width: "32px",
                              height: "64px",
                              borderRadius: "16px",
                              background: hex,
                              border: `1px solid ${withAlpha("#000000", 0.08)}`,
                            }}
                          />
                          <div
                            style={{
                              fontSize: "8px",
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: faint,
                              maxWidth: "40px",
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

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      flex: 1,
                    }}
                  >
                    {detailBlocks.map((detail) => (
                      <MetricBlock
                        key={`${detail.label}-${detail.value}`}
                        label={detail.label}
                        value={detail.value}
                        border={subtleBorder}
                        labelColor={faint}
                        valueColor={ink}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "34%",
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: `1px solid ${frameBorder}`,
                  paddingLeft: "26px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: faint,
                    marginBottom: "14px",
                  }}
                >
                  Specimen Strip
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
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

                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    paddingTop: "18px",
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
                        fontSize: "10px",
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: faint,
                      }}
                    >
                      Captured by Web Goblin
                    </div>
                    <div
                      style={{
                        width: "72px",
                        height: "10px",
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
      width: 1200,
      height: 630,
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
  const truncated = value.length > 36 ? `${value.slice(0, 33)}...` : value;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "10px 12px 12px 12px",
        border: `1px solid ${border}`,
        borderRadius: "14px",
        background: "rgba(255,255,255,0.16)",
        width: "calc(50% - 5px)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.35,
          color: valueColor,
          fontWeight: 600,
          overflow: "hidden",
        }}
      >
        {truncated}
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
  const truncated = body.length > 50 ? `${body.slice(0, 47)}...` : body;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "10px 14px",
        border: `1px solid ${border}`,
        borderRadius: "14px",
        background: "rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "999px",
            background: accent,
          }}
        />
        <div
          style={{
            fontSize: "10px",
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
          fontSize: "14px",
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

function parseColor(color: string): { r: number; g: number; b: number } | null {
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
