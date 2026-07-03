import { ImageResponse } from "next/og";

// The browser-tab mark: a "halo" — a pine ring on the cool near-white page,
// echoing the Header logo. Generated so there's a real favicon instead of the
// framework default.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFBFC",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            border: "3px solid #3F5B6B",
            background: "#FAFBFC",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
