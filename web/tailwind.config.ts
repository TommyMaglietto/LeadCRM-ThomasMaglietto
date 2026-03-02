import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0b",
          card: "#111113",
          input: "#18181b",
          hover: "#1f1f23",
          active: "#27272a",
        },
        border: {
          subtle: "#27272a",
          DEFAULT: "#3f3f46",
          focus: "#6366f1",
        },
        text: {
          primary: "#fafafa",
          secondary: "#a1a1aa",
          muted: "#71717a",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
        },
        tier: {
          hot: "#ef4444",
          warm: "#f59e0b",
          cold: "#3b82f6",
          skip: "#71717a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        base: ["0.875rem", { lineHeight: "1.25rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
