import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#EDE9E1",
          dark: "#D9D4C9",
        },
        ink: "#1A1A18",
        stone: "#6B6560",
        rubble: "#9C9389",
        accent: {
          DEFAULT: "#C4411A",
          hover: "#A83715",
          light: "rgba(196, 65, 26, 0.10)",
        },
        surface: {
          DEFAULT: "#EDE9E1",
          card: "#D9D4C9",
          input: "#EDE9E1",
          hover: "rgba(26, 26, 24, 0.06)",
          active: "rgba(26, 26, 24, 0.10)",
        },
        border: {
          subtle: "rgba(26, 26, 24, 0.12)",
          DEFAULT: "#1A1A18",
          focus: "#C4411A",
        },
        text: {
          primary: "#1A1A18",
          secondary: "#6B6560",
          muted: "#9C9389",
        },
        tier: {
          hot: "#C4411A",
          warm: "#B8860B",
          cold: "#3B6E8F",
          skip: "#9C9389",
        },
      },
      fontFamily: {
        display: ["'Bebas Neue'", "sans-serif"],
        serif: ["'DM Serif Display'", "serif"],
        sans: ["'DM Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        base: ["0.875rem", { lineHeight: "1.4rem" }],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "5px 5px 0px 0px #1A1A18",
        "card-sm": "3px 3px 0px 0px #1A1A18",
        "card-hover": "6px 6px 0px 0px #1A1A18",
      },
    },
  },
  plugins: [],
};

export default config;
