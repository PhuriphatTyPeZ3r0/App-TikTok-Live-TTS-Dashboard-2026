import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration with Apple visionOS Frosted Liquid Glass Design Tokens.
 *
 * Supports real-time dashboard UI for Single-Page Application (SPA) architecture,
 * edge caching over Content Delivery Network (CDN), and bidirectional WebSocket
 * communications with the Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Yuta Okkotsu TTS
 */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
