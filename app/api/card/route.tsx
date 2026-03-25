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
  const fontDisplay = params.get("fontDisplay") ?? "System sans";
  const fontBody = params.get("fontBody") ?? "System sans";
  const layout = params.get("layout") ?? "";
  const spacing = params.get("spacing") ?? "";
  const buttons = params.get("buttons") ?? "";
  const header = params.get("header") ?? "";
  const bg = params.get("bg") || "#ece7df";
  const fg = params.get("fg") || "#191713";
  const accentColor = params.get("accentColor") || "#1f6b53";
  const muted = `${fg}99`;
  const accentSoft = `${accentColor}1a`;

  const truncatedSummary =
    summary.length > 180 ? `${summary.slice(0, 177)}...` : summary;
  const truncatedTitle =
    title.length > 60 ? `${title.slice(0, 57)}...` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          background: bg,
          padding: "0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient accents */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(31,107,83,0.15), transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(189,98,54,0.1), transparent 65%)",
          }}
        />

        {/* Main card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            margin: "28px",
            borderRadius: "28px",
            border: `1px solid ${fg}1f`,
            background: "rgba(255,253,249,0.95)",
            flex: 1,
            padding: "36px 40px",
            boxShadow: "0 24px 60px -28px rgba(36,31,24,0.25)",
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
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: accentColor,
                }}
              >
                Web Goblin
              </div>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: muted,
                  background: `${fg}0d`,
                  borderRadius: "999px",
                  padding: "4px 12px",
                  display: "flex",
                  alignSelf: "flex-start",
                }}
              >
                {host}
              </div>
            </div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: muted,
                border: `1px solid ${fg}1f`,
                borderRadius: "999px",
                padding: "6px 16px",
              }}
            >
              Design DNA Report
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: fg,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: "12px",
              maxWidth: "720px",
            }}
          >
            {truncatedTitle}
          </div>

          {/* Summary */}
          <div
            style={{
              fontSize: "14px",
              color: muted,
              lineHeight: 1.6,
              maxWidth: "640px",
              marginBottom: "20px",
            }}
          >
            {truncatedSummary}
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
            {tags.slice(0, 5).map((tag) => (
              <div
                key={tag}
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: accentColor,
                  background: accentSoft,
                  borderRadius: "999px",
                  padding: "5px 14px",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Bottom section: palette + details */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              flex: 1,
              alignItems: "flex-end",
            }}
          >
            {/* Palette swatches */}
            <div style={{ display: "flex", gap: "8px" }}>
              {palette.slice(0, 5).map((hex, index) => (
                <div
                  key={hex}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "14px",
                      background: hex,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 500,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: muted,
                    }}
                  >
                    {paletteRoles[index] ?? ""}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div
              style={{
                width: "1px",
                height: "64px",
                background: `${fg}1f`,
                flexShrink: 0,
              }}
            />

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <DetailRow label="Display" value={fontDisplay} labelColor={muted} valueColor={fg} />
              <DetailRow label="Body" value={fontBody} labelColor={muted} valueColor={fg} />
              <DetailRow label="Layout" value={layout} labelColor={muted} valueColor={fg} />
              <DetailRow label="Spacing" value={spacing} labelColor={muted} valueColor={fg} />
              {buttons ? <DetailRow label="Buttons" value={buttons} labelColor={muted} valueColor={fg} /> : null}
              {header ? <DetailRow label="Nav" value={header} labelColor={muted} valueColor={fg} /> : null}
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

function DetailRow({
  label,
  value,
  labelColor = "#6b665f",
  valueColor = "#191713",
}: {
  label: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
}) {
  const truncated = value.length > 40 ? `${value.slice(0, 37)}...` : value;
  return (
    <div style={{ display: "flex", gap: "8px", fontSize: "12px", lineHeight: 1.5 }}>
      <span
        style={{
          color: labelColor,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          fontWeight: 500,
          width: "64px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ color: valueColor }}>{truncated}</span>
    </div>
  );
}
