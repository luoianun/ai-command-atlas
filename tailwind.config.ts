import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "risk-low": "var(--risk-low)",
        "risk-high": "var(--risk-high)",
        "risk-med": "var(--risk-med)",
      },
      fontFamily: {
        mono: ["var(--mono)", "monospace"],
        sans: ["var(--sans)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--r)",
      },
    },
  },
  plugins: [],
};
export default config;
