import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#EEF2EC",
        card: "#FFFFFF",
        ink: "#16201B",
        ink2: "#1F2D26",
        text: "#1B2620",
        muted: "#637067",
        line: "#D8E0D4",
        accent: "#A87B2E",
        accentSoft: "#F3E9D3",
        brand: "#2E5D45",
        band: "#EFF4EB",
        danger: "#BC4632",
        dangerSoft: "#F8E5E1",
        ok: "#2E7D55",
        okSoft: "#E2F0E7",
        infoSoft: "#E7EDF6",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Cambria", "Georgia", "serif"],
        sans: ['"Segoe UI"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Consolas", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
