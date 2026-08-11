import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#0A0A0A",
        "surface-card": "#111111",
        "surface-hover": "#1A1A1A",
        "surface-border": "#262626",
        accent: {
          blue: "#3B82F6",
          purple: "#A855F7",
          green: "#10B981",
          amber: "#F59E0B",
          red: "#EF4444",
          cyan: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(255, 255, 255, 0.15)",
        "accent-blue": "0 0 25px -5px rgba(59, 130, 246, 0.3)",
        "accent-purple": "0 0 25px -5px rgba(168, 85, 247, 0.3)",
        "accent-amber": "0 0 25px -5px rgba(245, 158, 11, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
