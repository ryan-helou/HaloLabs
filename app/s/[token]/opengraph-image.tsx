import { ImageResponse } from "next/og";
import { loadShareProjection } from "@/lib/share";

// Dynamic per-share link preview. Reuses the brand card recipe from
// app/opengraph-image.tsx but fills it with the PII-safe projection (neutral
// counts + composition + progress delta) so a pasted link reads as a real,
// specific card — never a score, never a face.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "My HaloLabs plan";

const BG = "linear-gradient(135deg, #3A3F44 0%, #2B3E4A 55%, #5B7280 100%)";

export default async function ShareOgImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const p = await loadShareProjection(token);

  const headline =
    p?.kind === "progress" && p.progress
      ? `Week ${p.progress.weekN} of my plan`
      : "My HaloLabs plan";
  const line =
    p?.kind === "progress" && p.progress
      ? `${p.progress.movesDone} of ${p.progress.total} moves done`
      : p
      ? `${p.totalMoves} moves · ${p.quickWins} quick wins`
      : "A personalized plan from my own photos";

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
          background: BG,
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
            <div style={{ width: 15, height: 15, borderRadius: 999, border: "2px solid #FAFBFC" }} />
          </div>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>HaloLabs</span>
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
          <span style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2 }}>
            {headline}
          </span>
          <span style={{ fontSize: 34, color: "rgba(250,251,252,0.82)" }}>{line}</span>

          {/* composition bar — neutral plan makeup, never a rating */}
          {p && p.focus.length > 0 && (
            <div style={{ display: "flex", width: 900, height: 22, borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
              {p.focus.map((f, i) => (
                <div key={i} style={{ width: `${Math.max(6, Math.round(f.share * 100))}%`, background: f.color }} />
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: 26, color: "rgba(250,251,252,0.7)" }}>
          No scores, no rankings — get your own free scan at halolabs
        </span>
      </div>
    ),
    { ...size }
  );
}
