import { ImageResponse } from "next/og";

// Social-share card (link previews on iMessage, Slack, X, etc.). Brand gradient
// + wordmark + the landing headline, so a shared link reads as HaloLabs rather
// than a bare URL.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HaloLabs — Improve your looks without surgery";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #3A3F44 0%, #2B3E4A 55%, #5B7280 100%)",
          color: "#FAFBFC",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "2px solid rgba(250,251,252,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 15,
                height: 15,
                borderRadius: 999,
                border: "2px solid #FAFBFC",
              }}
            />
          </div>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            HaloLabs
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontSize: 20,
              textTransform: "uppercase",
              letterSpacing: 6,
              color: "rgba(250,251,252,0.6)",
            }}
          >
            An honest mirror, powered by Claude
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -2,
            }}
          >
            <span>Improve your looks</span>
            <span style={{ color: "rgba(250,251,252,0.6)" }}>without surgery</span>
          </div>
          <span style={{ fontSize: 28, color: "rgba(250,251,252,0.7)", maxWidth: 820 }}>
            A personalized plan from your own photos — no scores, no rankings.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
