import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration with Red Broadcast Design System Tokens.
 *
 * Supports real-time dashboard UI for Single-Page Application (SPA) architecture,
 * edge caching over Content Delivery Network (CDN), and bidirectional WebSocket
 * communications with the Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Yuta Okkotsu TTS
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-prompt)", "var(--font-roboto)", "var(--font-kanit)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "var(--font-roboto-mono)", "monospace"],
      },
      colors: {
        // Red Broadcast Design System Tokens
        "broadcast-red": {
          DEFAULT: "#FF0000",
          hover: "#CC0000",
        },
        "broadcast-red-hover": "#CC0000",
        "broadcast-dark": "#0F0F0F",
        "broadcast-surface-light": "#F2F2F2",
        "broadcast-surface-dark": "#272727",
        "broadcast-blue": "#065FD4",
        "broadcast-border-light": "#E5E5E5",
        "broadcast-border-dark": "#3F3F3F",

        // Platform & Glass compatibility tokens
        "tiktok-cyan": "#00f2fe",
        "tiktok-red": "#fe2c55",
        "glass-border": "rgba(255, 255, 255, 0.12)",
        "glass-surface": "rgba(255, 255, 255, 0.04)",
        "glass-surface-hover": "rgba(255, 255, 255, 0.08)",
      },
      backdropBlur: {
        "3xl": "64px",
      },
    },
  },
  plugins: [],
};

export default config;
