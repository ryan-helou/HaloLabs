import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFBFC", // barely-cool white page
        surface: "#FFFFFF", // cards
        ink: "#17191C", // near-black, cool
        "ink-soft": "#6A7178", // cool grey text
        line: "#E5E8EB", // hairline
        panel: "#C3CFD5", // blue-grey image-panel background
        pine: "#3F5B6B", // primary slate accent
        "pine-deep": "#2B3E4A",
        sage: "#DCE6EA", // soft accent background
        clay: "#9C6A4E", // restrained warm accent (quick wins)
        "clay-soft": "#EFE7E0",
        chip: "#EEF1F3", // muted chip background
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        label: "0.16em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 25, 28, 0.04)",
        float: "0 8px 30px rgba(23, 25, 28, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
